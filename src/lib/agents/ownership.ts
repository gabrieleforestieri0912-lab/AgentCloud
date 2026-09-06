import { createAdminClient } from "@/lib/supabase/admin";
import { getAgentRuntimeConfig } from "./registry";

/**
 * Server-only: restituisce gli slug degli agenti posseduti dall'utente
 * (righe di abbonamento/possesso attive in `user_agents`), filtrati su quelli
 * che esistono davvero nel registry runtime.
 *
 * Perché il filtro: la tabella potrebbe contenere slug di agenti rimossi dal
 * catalogo; mostrarli romperebbe la chat. È usata per popolare il selettore
 * agenti nella sidebar della chat.
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
