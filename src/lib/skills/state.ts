import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stato di installazione delle competenze per un agente.
 *
 * Serve alla pagina agente (e alla dashboard) per non mostrare "Installa" a
 * chi ha già installato. La query va su `installed_skills` filtrata per
 * `account_id`: senza sessione non si legge nulla e la UI mostra la scheda in
 * sola lettura, che è il comportamento giusto per un visitatore.
 */

export type InstalledSkillState = {
  slug: string;
  installed: boolean;
  enabled: boolean;
};

export async function getInstalledSkillsState(
  accountId: string | null,
  agentSlug: string,
): Promise<Record<string, InstalledSkillState>> {
  const state: Record<string, InstalledSkillState> = {};
  if (!accountId) return state;

  const admin = createAdminClient();
  if (!admin) return state;

  try {
    const { data, error } = await admin
      .from("installed_skills")
      .select("enabled, skills (slug)")
      .eq("account_id", accountId)
      .eq("agent_instance_id", agentSlug);

    if (error || !data) return state;

    for (const row of data as unknown as Array<{
      enabled: boolean;
      skills: { slug: string } | null;
    }>) {
      if (!row.skills?.slug) continue;
      state[row.skills.slug] = {
        slug: row.skills.slug,
        installed: true,
        enabled: row.enabled !== false,
      };
    }
    return state;
  } catch {
    return state;
  }
}
