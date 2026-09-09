import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import { getLocale } from "@/lib/i18n/locale";
import { getSessionUser } from "@/lib/supabase/server";

import { pageSeo } from "@/lib/seo";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { getLocalizedAgentInfo } from "@/lib/i18n/agentCatalog";
import { getOwnedAgentSlugs } from "@/lib/agents/ownership";

// Pagina /chat: server component che decide l'accesso (utente Supabase oppure
// codice di accesso), risolve quali agenti mostrare nel selettore e passa
// query/agente iniziali alla ChatInterface client.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isIt = locale === "it";
  const title = isIt ? "Chatta con l'AI" : "Chat with AI";
  const description = isIt
    ? "Chiedi alla nostra AI di automatizzare email, ticket di supporto, generazione lead, social media e altro. Descrivi cosa ti serve e lo costruiremo."
    : "Ask our AI to automate emails, support tickets, lead generation, social media, and more. Describe what you need and we'll build it.";
  return pageSeo({ title, description, path: "/chat", locale });
}

export default async function ChatPage(props: {
  searchParams?: Promise<{ q?: string; agent?: string }>;
}) {
  const locale = await getLocale();
  const user = await getSessionUser();
  // I possessori del codice saltano del tutto il login: il codice concede
  // accesso alla piattaforma senza account Supabase. Non hanno agenti
  // posseduti, quindi resta disponibile la chat generica (che gira in
  // anonimo).
  if (!user && !true) redirect("/login");

  const searchParams = await props.searchParams;
  const initialQuery = searchParams?.q;
  const agentParam =
    typeof searchParams?.agent === "string" ? searchParams.agent : undefined;

  // Gli admin / possessori del codice senza utente Supabase vedono in chat
  // l'intero catalogo (stessa gestione degli utenti normali, con cronologia).
  // Solo gli agenti a cui l'utente si è effettivamente abbonato vengono
  // mostrati nella chat. Un nuovo utente parte con la lista vuota e
  // aggiunge agenti man mano che li acquista dal marketplace.
  let availableAgents: { slug: string; name: string }[] = [];
  if (user) {
    const ownedSlugs = await getOwnedAgentSlugs(user.id);
    availableAgents = ownedSlugs.map((slug) => ({
      slug,
      name: AGENT_RUNTIME[slug]?.name ?? slug,
    }));
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
    <main className="min-h-screen bg-neutral-950">
      <ChatInterface
        initialQuery={initialQuery}
        agentId={agentParam}
        agentLabel={agentLabel}
        availableAgents={availableAgents}
      />
    </main>
  );
}
