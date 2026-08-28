import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentRuntimeConfig } from "./registry";

/**
 * Server-only: return the slugs of agents the given user currently owns
 * (active subscription/ownership rows), filtered to agents that actually exist
 * in the runtime registry. Used to populate the chat sidebar's agent picker.
 */
export async function getOwnedAgentSlugs(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("user_agents")
    .select("agent_slug")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error || !data) return [];
  return (data as Array<{ agent_slug: string }>)
    .map((r) => r.agent_slug)
    .filter((slug) => Boolean(getAgentRuntimeConfig(slug)));
}
