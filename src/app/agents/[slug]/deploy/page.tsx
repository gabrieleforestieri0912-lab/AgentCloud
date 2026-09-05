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
import { getSessionUser } from "@/lib/supabase/server";
import { listShopifyConnections } from "@/lib/shopify/connections";
import { getGoogleConnectionSummary } from "@/lib/google/connections";
import DeployAgentClient from "./deploy-client";

export type DeployConnections = {
  shopifyConnected: boolean;
  shopifyShops: string[];
  googleConnected: boolean;
  googleEmail: string | null;
};

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

  // Real connection state for logged-in users, so the "Connect tools" list
  // can mark already-connected services as active. Anonymous visitors get
  // no state (nothing is connected for them).
  const user = await getSessionUser();
  let connections: DeployConnections = {
    shopifyConnected: false,
    shopifyShops: [],
    googleConnected: false,
    googleEmail: null,
  };
  if (user) {
    const shops = await listShopifyConnections(user.id).catch(() => []);
    const google = await getGoogleConnectionSummary(user.id).catch(() => null);
    connections = {
      shopifyConnected: shops.some((s) => s.connected),
      shopifyShops: shops.filter((s) => s.connected).map((s) => s.shopDomain),
      googleConnected: Boolean(google?.connected),
      googleEmail: google?.googleEmail ?? null,
    };
  }

  return (
    <DeployAgentClient
      slug={slug}
      marketplaceAgents={navAgents}
      connections={connections}
    />
  );
}
