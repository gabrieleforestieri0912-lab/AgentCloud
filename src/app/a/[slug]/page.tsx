import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAgentBySlug } from "@/lib/agents";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";
import PublicAgentChat from "./PublicAgentChat";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const agent = getAgentBySlug(slug) || getAgentRuntimeConfig(slug);
  if (!agent) return {};

  return {
    title: `${agent.name} | AgentCloud`,
    description: agent.description,
    robots: { index: false, follow: false },
  };
}

export default async function PublicAgentPage({ params }: Props) {
  const { slug } = await params;
  const agentMeta = getAgentBySlug(slug);
  const agentRuntime = getAgentRuntimeConfig(slug);

  if (!agentMeta && !agentRuntime) notFound();

  const name = agentMeta?.name || agentRuntime!.name;
  const description = agentMeta?.description || agentRuntime!.description;

  return (
    <PublicAgentChat
      slug={slug}
      name={name}
      description={description}
    />
  );
}
