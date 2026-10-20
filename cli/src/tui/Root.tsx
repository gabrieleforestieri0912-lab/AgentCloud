import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, render, useApp, useInput } from "ink";
import { ApiError, userRequest, userWhoAmI } from "../api.js";
import { loadConfig } from "../config.js";
import { localVersion } from "../update.js";
import { theme } from "./theme.js";
import { Spinner } from "./Spinner.js";
import { AgentsOverlay } from "./AgentsOverlay.js";
import { App, type TuiResult } from "./App.js";
import { CATALOG } from "../catalog.js";
import type { ChatMessage } from "./Chat.js";
import type { TrackedFile } from "./fileChanges.js";

type Phase = "boot" | "auth" | "pick" | "chat" | "offline";

type BootInfo = {
  email: string | null;
  owned: string[];
  plan: string | null;
  messagesRemaining: number | null;
  /** false = nessuna sessione: la chat si apre comunque, /login per entrare. */
  authenticated: boolean;
};

/** Entra nell'alternate screen; l'uscita ripristina sempre il terminale. */
function enterAltScreen(): void {
  process.stdout.write("\x1b[?1049h\x1b[H");
}

function leaveAltScreen(): void {
  process.stdout.write("\x1b[?1049l");
}

/**
 * `agentcloud` senza argomenti: avvio quasi istantaneo in alternate screen.
 * Sequenza: boot (whoami + usage con spinner) → login se serve → scelta o
 * default dell'agente → chat. Alla fine risolve con i dati per salvare la
 * sessione e stampare il codice di ripresa.
 */
export async function runWelcomeTui(): Promise<TuiResult & { agent: string }> {
  enterAltScreen();
  try {
    let result: (TuiResult & { agent: string }) | null = null;
    const { waitUntilExit } = render(
      <Root
        onResult={(r) => {
          result = r;
        }}
      />,
      { exitOnCtrlC: false },
    );
    await waitUntilExit();
    if (!result) {
      return { messages: [] as ChatMessage[], title: "", files: [] as TrackedFile[], agent: "" };
    }
    return result;
  } finally {
    leaveAltScreen();
  }
}

function Root({ onResult }: { onResult: (r: TuiResult & { agent: string }) => void }) {
  const { exit } = useApp();
  const [, setTick] = useState(0);
  const touch = () => setTick((t) => t + 1);

  const [phase, setPhase] = useState<Phase>("boot");
  const [info, setInfo] = useState<BootInfo | null>(null);
  const [offlineMessage, setOfflineMessage] = useState<string>("");

  // Scelta agente (phase "pick"); lo stato serve al render, non un ref.
  const [agentChoice, setAgentChoice] = useState<{ slug: string; name: string } | null>(null);

  const boot = useCallback(async () => {
    try {
      let who: { email?: string | null; owned: string[] };
      try {
        who = await userWhoAmI();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          // Nessuna sessione: NON blocchiamo con una schermata di login.
          // La chat si apre subito e l'utente entra con /login (o incolla
          // un token) quando vuole.
          setInfo({ email: null, owned: [], plan: null, messagesRemaining: null, authenticated: false });
          setAgentChoice(defaultAgentChoice());
          setPhase("chat");
          return;
        }
        throw error;
      }
      let plan: string | null = null;
      let messagesRemaining: number | null = null;
      try {
        const usage = await userRequest<{ plan?: string; messagesRemaining?: number }>("/api/user/usage");
        plan = usage.plan ?? null;
        messagesRemaining = typeof usage.messagesRemaining === "number" ? usage.messagesRemaining : null;
      } catch {
        // usage non disponibile: si va comunque in chat
      }
      setInfo({
        email: who.email || null,
        owned: who.owned,
        plan,
        messagesRemaining,
        authenticated: true,
      });
      // La chat si apre SEMPRE subito: l'agente di default è quello
      // configurato (o il primo del catalogo). /agents cambia agente.
      setAgentChoice(defaultAgentChoice(who.owned));
      setPhase("chat");
    } catch (error) {
      setOfflineMessage(error instanceof Error ? error.message : String(error));
      setPhase("offline");
    }
  }, []);

  useEffect(() => {
    // Reintrovo il boot nel ciclo del task loop (setTimeout 0): setState
    // sincroni dentro l'effect danno cascading render (regola react-hooks).
    const timer = setTimeout(() => void boot(), 0);
    return () => clearTimeout(timer);
  }, [boot]);

  const startChat = (slug: string) => {
    const cat = CATALOG.find((a) => a.slug === slug);
    setAgentChoice({ slug, name: cat?.name ?? slug });
    setPhase("chat");
    touch();
  };

  if (phase === "chat" && agentChoice) {
    return (
      <App
        key={agentChoice.slug}
        agent={agentChoice.slug}
        agentName={agentChoice.name}
        initial={[]}
        session={{
          email: info?.email ?? null,
          plan: info?.plan ?? null,
          messagesRemaining: info?.messagesRemaining ?? null,
          authenticated: info?.authenticated ?? true,
        }}
        showHeader
        onExit={(messages, title, files) => {
          onResult({ messages, title, files, agent: agentChoice.slug });
          exit();
        }}
      />
    );
  }

  if (phase === "pick" && info) {
    const choices = info.owned.map((slug) => {
      const cat = CATALOG.find((a) => a.slug === slug);
      return { slug, name: cat?.name ?? slug, category: cat?.category, price: cat?.price };
    });
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={theme.primary}>
            Ciao{info.email ? `, ${info.email}` : ""}
          </Text>
          <Text color={theme.muted}>Con quale agente vuoi lavorare?</Text>
        </Box>
        <AgentsOverlay
          agents={choices}
          current=""
          height={20}
          onSelect={startChat}
          onClose={() => exit()}
        />
      </Box>
    );
  }

  if (phase === "offline") {
    return (
      <Box flexDirection="column" flexGrow={1} padding={1}>
        <Text bold color={theme.primary}>AgentCloud v{localVersion()}</Text>
        <Text color={theme.error}>Impossibile raggiungere l&apos;API.</Text>
        <Text color={theme.muted}>{offlineMessage}</Text>
        <Text color={theme.muted}>[R] riprova · [Esc] esce</Text>
        <OfflineKeys
          onRetry={() => {
            setPhase("boot");
            void boot();
          }}
          onExit={() => exit()}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="row">
        <Text bold color={theme.primary}>AgentCloud</Text>
        <Text color={theme.muted}> v{localVersion()}</Text>
      </Box>
      <Spinner label="Connessione ad AgentCloud…" />
    </Box>
  );
}

function OfflineKeys({ onRetry, onExit }: { onRetry: () => void; onExit: () => void }) {
  useInput((input, key) => {
    if (input.toLowerCase() === "r") onRetry();
    else if (key.escape) onExit();
  });
  return null;
}

/**
 * Agente di default all'avvio: quello configurato (`agentcloud config
 * --agent`), altrimenti il primo posseduto, altrimenti il primo del
 * catalogo. La chat parte comunque: cambiare agente è `/agents`.
 */
function defaultAgentChoice(owned: string[] = []): { slug: string; name: string } {
  const configured = loadConfig().defaultAgent;
  const candidates = [configured, ...owned].filter((s): s is string => Boolean(s));
  for (const slug of candidates) {
    const cat = CATALOG.find((a) => a.slug === slug);
    if (cat) return { slug, name: cat.name };
  }
  const first = CATALOG.find((a) => !a.comingSoon) ?? CATALOG[0];
  return { slug: first?.slug ?? "support-agent", name: first?.name ?? "Support Agent" };
}

