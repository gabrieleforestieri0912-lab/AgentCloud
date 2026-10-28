import type { Metadata } from "next";
import ChatInterface from "@/components/ChatInterface";
import { GhostModeProvider } from "@/components/GhostModeProvider";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSessionUser } from "@/lib/supabase/server";
import { accountIdentityFromUser } from "@/lib/account-identity";

import { pageSeo } from "@/lib/seo";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { getEnabledAgentSlugs } from "@/lib/agents";
import { getLocalizedAgentInfo } from "@/lib/i18n/agentCatalog";
import { getOwnedAgentSlugs } from "@/lib/agents/ownership";

// Pagina /chat: server component che decide l'accesso (utente Supabase oppure
// codice di accesso), risolve quali agenti mostrare nel selettore e passa
// query/agente iniziali alla ChatInterface client.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { chat } = getDictionary(locale);
  const title = chat.metaTitle;
  const description = chat.metaDescription;
  return pageSeo({ title, description, path: "/chat", locale });
}

export default async function ChatPage(props: {
  searchParams?: Promise<{ q?: string; agent?: string }>;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const user = await getSessionUser();

  const searchParams = await props.searchParams;
  const initialQuery = searchParams?.q;
  const agentParam =
    typeof searchParams?.agent === "string" ? searchParams.agent : undefined;

  // Gli admin / possessori del codice senza utente Supabase vedono in chat
  // l'intero catalogo (stessa gestione degli utenti normali, con cronologia).
  // Gli agenti posseduti dall'utente (abbonamento attivo in `user_agents`)
  // hanno la precedenza: chi li ha li vede sempre. Chi non possiede nulla
  // vede comunque gli agenti abilitati in prova gratuita (5 messaggi/giorno).
  let availableAgents: { slug: string; name: string }[] = [];
  if (user) {
    const ownedSlugs = await getOwnedAgentSlugs(user.id, user);
    availableAgents = ownedSlugs.map((slug) => ({
      slug,
      name: AGENT_RUNTIME[slug]?.name ?? slug,
    }));
  }

  // Chi non possiede agenti non resta a botte ferme: il freemium di 5 messaggi
  // al giorno vale per QUALSIASI agente (/api/agent/run non chiede il possesso,
  // conta solo il budget giornaliero), quindi il selettore mostra l'elenco
  // ristretto degli agenti abilitati dai feature flag — il gateway vero resta
  // il contatore dei 5 messaggi, non l'acquisto.
  if (availableAgents.length === 0) {
    availableAgents = getEnabledAgentSlugs()
      .filter((slug) => Boolean(AGENT_RUNTIME[slug]))
      .map((slug) => ({ slug, name: AGENT_RUNTIME[slug].name }));
  }

  // La chat è sempre usabile con l'assistente generico, anche senza agenti acquistati
  if (availableAgents.length === 0) {
    availableAgents = [{ slug: "", name: dict.chat.assistantName }];
  }

  // Quando la CTA del marketplace apre la chat per un agente specifico
  // (/chat?agent=<slug>), mostriamo il nome (localizzato) dell'agente
  // nell'intestazione, così il visitatore sa con chi sta parlando — anche
  // prima di possederlo.
  let agentLabel: string | undefined;
  if (agentParam) {
    const runtime = AGENT_RUNTIME[agentParam];
    if (runtime) {
      agentLabel = getLocalizedAgentInfo(
        agentParam,
        locale,
        { name: runtime.name, description: runtime.description },
      ).name;
    }
  }

  return (
    <main className="min-h-dvh bg-neutral-950">
      {/*
        Modalità Ghost (chat incognito): il provider tiene lo stato volatile
        della modalità (niente storage, niente URL). Al refresh o alla chiusura
        della tab tutto torna allo stato iniziale e la chat fantasma sparisce.
      */}
      <GhostModeProvider>
        <ChatInterface
          account={accountIdentityFromUser(user)}
          initialQuery={initialQuery}
          agentId={agentParam}
          agentLabel={agentLabel}
          availableAgents={availableAgents}
        />
      </GhostModeProvider>
    </main>
  );
}
