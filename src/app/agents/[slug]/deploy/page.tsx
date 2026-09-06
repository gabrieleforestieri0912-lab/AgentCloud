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
import {
  TENANT_SHOPIFY_ID,
  listShopifyConnections,
} from "@/lib/shopify/connections";
import { TENANT_GOOGLE_ID, getGoogleConnectionSummary } from "@/lib/google/connections";
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

  // Real connection state, so the "Connect tools" list can mark already-
  // connected services as active. The owner is resolved PER SERVICE, matching
  // where each connect route stores the row:
  //  - Google: signed-in users read their own rows; access-code holders
  //    (admin) read the shared tenant store (TENANT_GOOGLE_ID) — same owner
  //    /api/auth/google/* uses for code holders.
  //  - Shopify: signed-in users read their own rows; access-code holders
  //    WITHOUT a session read the shared tenant store (TENANT_SHOPIFY_ID —
  //    the same owner /api/shopify/install|callback use for code holders).
  //  - Anonymous visitors get no state (nothing is connected for them).
  const user = await getSessionUser();
  // Shopify mirrors /api/shopify/install|callback|status exactly: access-code
  // holders use the shared tenant store (even when signed in), regular
  // signed-in users their own rows.
  const shopifyOwnerId = unlocked
    ? TENANT_SHOPIFY_ID
    : user?.id ?? null;
  const googleOwnerId = unlocked ? TENANT_GOOGLE_ID : user?.id ?? null;
  let connections: DeployConnections = {
    shopifyConnected: false,
    shopifyShops: [],
    googleConnected: false,
    googleEmail: null,
  };
  if (shopifyOwnerId) {
    const shops = await listShopifyConnections(shopifyOwnerId).catch(() => []);
    connections = {
      ...connections,
      shopifyConnected: shops.some((s) => s.connected),
      shopifyShops: shops.filter((s) => s.connected).map((s) => s.shopDomain),
    };
  }
  if (googleOwnerId) {
    const google = await getGoogleConnectionSummary(googleOwnerId).catch(
      () => null,
    );
    connections = {
      ...connections,
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
