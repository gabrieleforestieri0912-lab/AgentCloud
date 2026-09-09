import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentRuntimeConfig, AGENT_RUNTIME } from "./registry";

/**
 * Server-only: restituisce gli slug degli agenti posseduti dall'utente
 * (righe di abbonamento/possesso attive in `user_agents`), filtrati su quelli
 * che esistono davvero nel registry runtime.
 *
 * BETA BYPASS: se l'utente ha ruolo beta_tester/internal_qa e
 * ENABLE_WAITLIST_BETA_BYPASS=true, restituisce TUTTI gli agenti.
 *
 * Perché il filtro: la tabella potrebbe contenere slug di agenti rimossi dal
 * catalogo; mostrarli romperebbe la chat. È usata per popolare il selettore
 * agenti nella sidebar della chat.
 */
export async function getOwnedAgentSlugs(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  // BETA BYPASS: beta_tester/internal_qa see all agents
  // Remove/disable via ENABLE_WAITLIST_BETA_BYPASS=false before Stripe goes live.
  if (process.env.ENABLE_WAITLIST_BETA_BYPASS === "true") {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.role === "beta_tester" || profile?.role === "internal_qa") {
      return Object.keys(AGENT_RUNTIME).filter((slug) =>
        Boolean(getAgentRuntimeConfig(slug)),
      );
    }
  }

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
