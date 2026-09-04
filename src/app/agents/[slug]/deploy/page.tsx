import { notFound } from "next/navigation";
import {
  AGENTS,
  AVAILABLE_AGENTS,
  getAgentBySlug,
  isAvailable,
  localizeAgent,
} from "@/lib/agents";
import { getLocale } from "@/lib/i18n/locale";
import { hasPlatformAccess } from "@/lib/access-code";
import DeployAgentClient from "./deploy-client";

/**
 * Server wrapper around the (client) deploy form. The availability gate must
 * run server-side per request: `isAvailable` reflects the runtime feature
 * flags, but access-code holders unlock EVERY agent — including the ones
 * still flagged "coming soon" — so their deploy pages must render.
 */
export default async function DeployAgentPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const rawAgent = getAgentBySlug(slug);
  if (!rawAgent) notFound();

  const unlocked = await hasPlatformAccess();
  if (!unlocked && !isAvailable(slug)) notFound();

  const locale = await getLocale();
  // Navbar agent list: the full catalog for access holders, the flag-gated
  // list otherwise (mirrors what the marketplace pages pass down).
  const navAgents = (unlocked ? AGENTS : AVAILABLE_AGENTS).map((agent) =>
    localizeAgent(agent, locale),
  );

  return <DeployAgentClient slug={slug} marketplaceAgents={navAgents} />;
}
