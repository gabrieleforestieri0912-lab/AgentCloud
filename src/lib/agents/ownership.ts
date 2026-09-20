import { createAdminClient } from "@/lib/supabase/admin";
import { resolveIsAdmin } from "@/lib/admin-access";
import { getAgentRuntimeConfig, AGENT_RUNTIME } from "./registry";

/**
 * Server-only: restituisce gli slug degli agenti posseduti dall'utente
 * (righe di abbonamento/possesso attive in `user_agents`), filtrati su quelli
 * che esistono davvero nel registry runtime.
 *
 * ADMIN: un admin (ADMIN_EMAILS oppure profiles.role = 'admin') possiede
 * SEMPRE tutti gli agenti — non deve passare da Stripe/PayPal. Viene quindi
 * restituito l'intero catalogo runtime, così la UI mostra "Apri in chat"
 * invece delle CTA di acquisto.
 *
 * BETA BYPASS: se l'utente ha ruolo beta_tester/internal_qa e
 * ENABLE_WAITLIST_BETA_BYPASS=true, restituisce TUTTI gli agenti.
 *
 * Perché il filtro: la tabella potrebbe contenere slug di agenti rimossi dal
 * catalogo; mostrarli romperebbe la chat. È usata per popolare il selettore
 * agenti nella sidebar della chat.
 */
export async function getOwnedAgentSlugs(
  userId: string,
  user?: { id?: string | null; email?: string | null } | null,
): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  // ADMIN: accesso a tutti gli agenti, nessun checkout richiesto.
  if (await resolveIsAdmin(user ?? { id: userId })) {
    return Object.keys(AGENT_RUNTIME).filter((slug) =>
      Boolean(getAgentRuntimeConfig(slug)),
    );
  }

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
    .select("agent_slug, status, current_period_end")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error || !data) return [];

  return (data as Array<{ agent_slug: string; status: string; current_period_end: string | null }>)
    .map((r) => r.agent_slug)
    .filter((slug) => Boolean(getAgentRuntimeConfig(slug)));
}

