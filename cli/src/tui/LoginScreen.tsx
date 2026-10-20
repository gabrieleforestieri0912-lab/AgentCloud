import React, { useCallback, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import fs from "node:fs";
import { theme } from "./theme.js";
import { Spinner } from "./Spinner.js";
import { browserLoginWithFallback, CallbackTimeoutError } from "../auth/flows.js";
import { loginWithToken, validateAccessToken } from "../api.js";
import { loadConfig, loadCredentials, credentialsPath } from "../config.js";

type Mode = "menu" | "browser" | "token" | "device" | "done";

/**
 * Schermata di login dentro la TUI (si apre da `agentcloud`, dalla chat con
 * /login o lanciando `chat` senza credenziali).
 *
 * Due strade: browser (loopback + PKCE, consigliata) o token incollato
 * (mascherato, validato via /api/extension/session prima del salvataggio).
 * Sul timeout del callback (5 min) l'utente sceglie R (riprova browser) o
 * T (token); se il browser non si apre, parte il device flow automatico.
 */
export function LoginScreen({ onDone, onExit }: { onDone: () => void; onExit: () => void }) {
  const [mode, setMode] = useState<Mode>("menu");
  const [menuIndex, setMenuIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  // Il ref è l'immagine istantanea per gli handler di input (i setState
  // arrivano dopo il render); il state serve al rendering.
  const busyRef = useRef(false);
  const setBusyBoth = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };

  const say = useCallback((message: string) => setStatus(message), []);

  const finish = useCallback(
    (message: string) => {
      setError(null);
      setStatus(message);
      setMode("done");
      setTimeout(() => onDone(), 900);
    },
    [onDone],
  );

  const runBrowser = useCallback(() => {
    setBusyBoth(true);
    setError(null);
    setMode("browser");
    setStatus("Preparo il login…");
    void browserLoginWithFallback(loadConfig().apiUrl, (message) => {
      say(message);
      setMode(message.includes("da qualunque dispositivo") ? "device" : "browser");
    })
      .then(() => {
        setBusyBoth(false);
        const creds = loadCredentials();
        finish(creds?.email ? `Accesso effettuato come ${creds.email}` : "Accesso completato.");
      })
      .catch((e) => {
        setBusyBoth(false);
        setStatus(null);
        setError(e instanceof CallbackTimeoutError ? "Tempo scaduto in attesa del browser." : e instanceof Error ? e.message : String(e));
      });
    return;
  }, [finish, say]);

  const runToken = useCallback(
    (value: string) => {
      setBusyBoth(true);
      setStatus("Valido il token…");
      void validateAccessToken(value)
        .then(({ email }) => loginWithToken(value).then(() => email))
        .then((email) => {
          if (email) updateCredentialsEmail(email);
          setBusyBoth(false);
          finish(`Accesso effettuato come ${email || "utente"}`);
        })
        .catch((e) => {
          setBusyBoth(false);
          setStatus(null);
          setError(e instanceof Error ? e.message : String(e));
        });
    },
    [finish],
  );

  useInput((input, key) => {
    if (busyRef.current) return;
    if (mode === "menu") {
      if (key.upArrow) setMenuIndex((i) => (i + 2) % 3);
      if (key.downArrow) setMenuIndex((i) => (i + 1) % 3);
      if (key.return) {
        if (menuIndex === 0) runBrowser();
        else if (menuIndex === 1) {
          setMode("token");
          setStatus("Incolla il token (guarda /account → Token API)…");
        } else onExit();
      }
      return;
    }
    if (mode === "token" || !error) return;
    // Errore a schermo (timeout o fallimento): scorciatoie R/T/Esc.
    if (key.escape) { setError(null); setMode("menu"); return; }
    if (input.toLowerCase() === "r") runBrowser();
    if (input.toLowerCase() === "t") { setError(null); setToken(""); setMode("token"); setStatus(null); }
  });

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.primary}>Accedi ad AgentCloud</Text>
        <Text color={theme.muted}>Serve per parlare con i tuoi agenti dal terminale.</Text>
      </Box>

      {mode === "menu" ? (
        <Box flexDirection="column">
          {[
            { label: "Accedi con il browser", hint: "consigliato" },
            { label: "Incolla un token di accesso", hint: "generali in /account → Token API" },
            { label: "Esci", hint: "Ctrl+C" },
          ].map((o, i) => (
            <Box key={o.label}>
              <Text color={i === menuIndex ? theme.primary : theme.muted}>{i === menuIndex ? "> " : "  "}</Text>
              <Text bold={i === menuIndex} color={i === menuIndex ? theme.text : theme.muted}>
                {o.label}
              </Text>
              {o.hint ? <Text color={theme.muted}> — {o.hint}</Text> : null}
            </Box>
          ))}
        </Box>
      ) : null}

      {mode === "browser" ? <Spinner label={status || "In attesa del browser…"} /> : null}
      {mode === "device" ? <Spinner label={status || "In attesa di approvazione…"} /> : null}

      {mode === "token" ? (
        <MaskedTokenInput
          value={token}
          onChange={setToken}
          onSubmit={runToken}
          onCancel={() => { setMode("menu"); setStatus(null); }}
          busy={busy}
        />
      ) : null}

      {mode !== "token" && status && !error ? <Text color={theme.muted}>{status}</Text> : null}
      {error ? (
        <Box flexDirection="column">
          <Text color={theme.error}>{error}</Text>
          <Text color={theme.muted}>[R] riprova browser · [T] incolla token · [Esc] menu</Text>
        </Box>
      ) : null}
    </Box>
  );
}

/** Aggiorna solo l'email nelle credenziali (best-effort, mai il token). */
function updateCredentialsEmail(email: string): void {
  try {
    const raw = JSON.parse(fs.readFileSync(credentialsPath(), "utf8")) as { email?: string };
    raw.email = email;
    fs.writeFileSync(credentialsPath(), JSON.stringify(raw, null, 2), "utf8");
    try { fs.chmodSync(credentialsPath(), 0o600); } catch { /* Windows ACL */ }
  } catch { /* best-effort */ }
}

/**
 * Editor del token mascherato: mostra pallini invece dei caratteri,
 * gestisce incolla (chunk multi-carattere), backspace, Invio valida,
 * Esc torna al menu. In sovrapposizione con busy non consuma tasti.
 */
function MaskedTokenInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  useInput((input, key) => {
    if (busy) return;
    if (key.escape) { onCancel(); return; }
    if (key.return) {
      const v = value.trim();
      if (v) onSubmit(v);
      return;
    }
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      // Incolla multilinea: newline e spazi non esistono in un token, via.
      onChange(value + input.replace(/\s/g, ""));
    }
  });
  const dots = "•".repeat(Math.min(value.length, 60));
  return (
    <Box>
      <Text color={theme.accent}>token › </Text>
      <Text color={theme.muted}>{dots || "(in attesa di incollare)"}</Text>
      <Text inverse> </Text>
    </Box>
  );
}
