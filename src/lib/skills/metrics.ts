/**
 * Metriche delle Competenze per la dashboard.
 *
 * Perché una query dedicata: gli usi di una competenza stanno in `skill_runs`,
 * collegata a `installed_skills`, non in `agent_runs`. La dashboard vuole
 * "quante volte è stata usata, con che tasso di successo, quando l'ultima
 * volta" per ogni competenza installata: qui si aggrega tutto in una volta.
 *
 * Se le tabelle non esistono ancora la funzione restituisce un elenco vuoto:
 * la sezione dashboard mostra allora lo stato vuoto, non un errore.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type InstalledSkillMetric = {
  /** Id della riga `installed_skills`. */
  installedId: string;
  skillId: string | null;
  slug: string;
  name: string;
  description: string;
  risk: "low" | "medium" | "high";
  permissions: string[];
  /** Agente su cui è installata (agent_instance_id). */
  agentSlug: string;
  enabled: boolean;
  installedAt: string | null;
  owner: "official" | "community" | "user";
  /** Quante volte è stata attivata. */
  uses: number;
  /** Ultima attivazione. */
  lastUsedAt: string | null;
  /** Attivazioni con esito success. */
  successes: number;
  /** Token consumati dalle run che l'hanno usata. */
  tokens: number;
};

export type SkillsSummary = {
  installed: InstalledSkillMetric[];
  totals: {
    installed: number;
    enabled: number;
    uses: number;
    /** 0-100, arrotondato; 0 quando non ci sono usi. */
    successRate: number;
  };
};

/**
 * Competenze installate dall'account con le loro metriche di attivazione.
 *
 * Multitenant: il filtro `account_id` è su `installed_skills`, e `skill_runs`
 * è raggiungibile solo attraverso quelle righe (RLS in `schema-skills.sql`).
 */
export async function getInstalledSkillsSummary(
  accountId: string,
): Promise<SkillsSummary> {
  const empty: SkillsSummary = {
    installed: [],
    totals: { installed: 0, enabled: 0, uses: 0, successRate: 0 },
  };

  const admin = createAdminClient();
  if (!admin) return empty;

  try {
    const { data, error } = await admin
      .from("installed_skills")
      .select(
        "id, skill_id, agent_instance_id, enabled, installed_at, skills (id, slug, name, description, risk_level, permissions, owner)",
      )
      .eq("account_id", accountId);

    if (error || !data || data.length === 0) return empty;

    const rows = data as unknown as Array<{
      id: string;
      skill_id: string | null;
      agent_instance_id: string;
      enabled: boolean;
      installed_at: string | null;
      skills: {
        id: string;
        slug: string;
        name: string;
        description: string;
        risk_level: string;
        permissions: string[] | null;
        owner: string;
      } | null;
    }>;

    const installedIds = rows.map((r) => r.id);

    // Le metriche stanno in `skill_runs`: una sola query su tutti gli id.
    const byInstalledId = new Map<
      string,
      { uses: number; successes: number; tokens: number; lastUsedAt: string | null }
    >();
    if (installedIds.length > 0) {
      const { data: runs } = await admin
        .from("skill_runs")
        .select("installed_skill_id, outcome, tokens, created_at")
        .in("installed_skill_id", installedIds);

      for (const run of (runs ?? []) as Array<{
        installed_skill_id: string;
        outcome: string;
        tokens: number | null;
        created_at: string;
      }>) {
        const bucket = byInstalledId.get(run.installed_skill_id) ?? {
          uses: 0,
          successes: 0,
          tokens: 0,
          lastUsedAt: null,
        };
        bucket.uses += 1;
        if (run.outcome === "success") bucket.successes += 1;
        bucket.tokens += run.tokens ?? 0;
        if (run.created_at && (!bucket.lastUsedAt || run.created_at > bucket.lastUsedAt)) {
          bucket.lastUsedAt = run.created_at;
        }
        byInstalledId.set(run.installed_skill_id, bucket);
      }
    }

    const installed: InstalledSkillMetric[] = rows.map((row) => {
      const s = row.skills;
      const metrics = byInstalledId.get(row.id) ?? {
        uses: 0,
        successes: 0,
        tokens: 0,
        lastUsedAt: null,
      };
      const risk =
        s?.risk_level === "high" || s?.risk_level === "medium" ? s.risk_level : "low";
      const owner =
        s?.owner === "user" || s?.owner === "community" ? s.owner : "official";
      return {
        installedId: row.id,
        skillId: s?.id ?? row.skill_id,
        slug: s?.slug ?? "unknown",
        name: s?.name ?? "Competenza",
        description: s?.description ?? "",
        risk,
        permissions: s?.permissions ?? [],
        agentSlug: row.agent_instance_id,
        enabled: row.enabled !== false,
        installedAt: row.installed_at,
        owner,
        ...metrics,
      };
    });

    // Più usate in alto, poi per nome: è l'ordine in cui si capisce cosa
    // funziona davvero.
    installed.sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));

    const totals = installed.reduce(
      (acc, s) => {
        acc.installed += 1;
        if (s.enabled) acc.enabled += 1;
        acc.uses += s.uses;
        acc.successes += s.successes;
        return acc;
      },
      { installed: 0, enabled: 0, uses: 0, successes: 0 },
    );

    return {
      installed,
      totals: {
        installed: totals.installed,
        enabled: totals.enabled,
        uses: totals.uses,
        successRate: totals.uses > 0 ? Math.round((totals.successes / totals.uses) * 100) : 0,
      },
    };
  } catch {
    return empty;
  }
}
