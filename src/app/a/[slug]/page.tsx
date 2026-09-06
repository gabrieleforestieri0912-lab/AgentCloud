import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAgentBySlug, localizeAgent } from "@/lib/agents";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";
import { getLocalizedAgentInfo } from "@/lib/i18n/agentCatalog";
import { getLocale } from "@/lib/i18n/locale";
import PublicAgentChat from "./PublicAgentChat";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const agentMeta = getAgentBySlug(slug);
  const agentRuntime = getAgentRuntimeConfig(slug);
  if (!agentMeta && !agentRuntime) return {};

  const meta = agentMeta
    ? localizeAgent(agentMeta, locale)
    : getLocalizedAgentInfo(slug, locale, {
        name: agentRuntime!.name,
        description: agentRuntime!.description,
      });
  return {
    title: `${meta.name} | AgentCloud`,
    description: meta.description,
    robots: { index: false, follow: false },
  };
}

export default async function PublicAgentPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const agentMeta = getAgentBySlug(slug);
  const agentRuntime = getAgentRuntimeConfig(slug);

  if (!agentMeta && !agentRuntime) notFound();

  const meta = agentMeta
    ? localizeAgent(agentMeta, locale)
    : getLocalizedAgentInfo(slug, locale, {
        name: agentRuntime!.name,
        description: agentRuntime!.description,
      });
  const name = meta.name;
  const description = meta.description;

  return (
    <PublicAgentChat
      slug={slug}
      name={name}
      description={description}
    />
  );
}
