import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatInterface from "@/components/ChatInterface";
import { getLocale } from "@/lib/i18n/locale";
import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";

import { pageSeo } from "@/lib/seo";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { getLocalizedAgentInfo } from "@/lib/i18n/agentCatalog";
import { getOwnedAgentSlugs } from "@/lib/agents/ownership";

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
  // Access-code holders skip the login requirement entirely — the code grants
  // platform access without a Supabase account. They simply have no owned
  // agents yet, so the generic chat (which runs anonymously) is available.
  const accessGranted = await hasPlatformAccess();
  if (!user && !accessGranted) redirect("/login");

  const searchParams = await props.searchParams;
  const initialQuery = searchParams?.q;
  const agentParam =
    typeof searchParams?.agent === "string" ? searchParams.agent : undefined;

  const ownedSlugs = user ? await getOwnedAgentSlugs(user.id) : [];
  const availableAgents = ownedSlugs.map((slug) => ({
    slug,
    name: AGENT_RUNTIME[slug]?.name ?? slug,
  }));

  // When the marketplace CTA opens the chat for a specific agent
  // (/chat?agent=<slug>), show that agent's (localized) name in the header so
  // the visitor knows which agent they're talking to — even before owning it.
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
      <Navbar />
      <ChatInterface
        initialQuery={initialQuery}
        agentId={agentParam}
        agentLabel={agentLabel}
        availableAgents={availableAgents}
      />
    </main>
  );
}
