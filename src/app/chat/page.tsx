import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatInterface from "@/components/ChatInterface";
import { getLocale } from "@/lib/i18n/locale";
import { getSessionUser } from "@/lib/supabase/server";
import { isPreviewMode } from "@/lib/preview";
import { pageSeo } from "@/lib/seo";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
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
  const user = await getSessionUser();
  const isPreview = !user && (await isPreviewMode());
  if (!user && !isPreview) redirect("/login");

  const searchParams = await props.searchParams;
  const initialQuery = searchParams?.q;
  const agentParam =
    typeof searchParams?.agent === "string" ? searchParams.agent : undefined;

  const ownedSlugs = user ? await getOwnedAgentSlugs(user.id) : [];
  const availableAgents = ownedSlugs.map((slug) => ({
    slug,
    name: AGENT_RUNTIME[slug]?.name ?? slug,
  }));

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <ChatInterface
        initialQuery={initialQuery}
        agentId={agentParam}
        availableAgents={availableAgents}
      />
    </main>
  );
}
