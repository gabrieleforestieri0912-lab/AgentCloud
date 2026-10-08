/**
 * Competenze abilitate per un agente + registro delle attivazioni.
 *
 * Perché qui e non in `runtime.ts`: questo modulo tocca il DB (lettura delle
 * skill installate, scrittura del log di attivazione), `runtime.ts` resta puro
 * e testabile. La regola che conta è la stessa in entrambi: una skill non
 * esce dai permessi dell'agente, e ogni attivazione lascia una traccia.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getEnabledToolsForAgent } from "@/lib/agents/feature-flags";
import { catalogPluginsForAgent, getCatalogSkill } from "./catalog";
import {
  applyPermissionCeiling,
  agentAvailablePermissions,
  buildSkillIndex,
  buildSkillTurnMessage,
  selectSkillsToLoad,
  type RuntimeSkill,
} from "./runtime";

/**
 * Skill abilitate per un account su un agente.
 *
 * Se `installed_skills` non esiste ancora (migration non applicata) o non
 * ci sono righe, il fallback è il catalogo ufficiale dei plugin consigliati
 * all'agente: la piattaforma resta utilizzabile e il prompt resta coerente,
 * semplicemente senza lo stato "installato per questo account".
 */
export async function getEnabledSkills(
  accountId: string | null,
  agentSlug: string,
): Promise<RuntimeSkill[]> {
  const official = officialSkillsForAgent(agentSlug);
  const available = agentAvailablePermissions(getEnabledToolsForAgent(agentSlug));

  if (!accountId) {
    return official.map((s) => applyPermissionCeiling(s, available));
  }

  const admin = createAdminClient();
  if (!admin) return official.map((s) => applyPermissionCeiling(s, available));

  try {
    const { data, error } = await admin
      .from("installed_skills")
      .select(
        "id, enabled, installed_at, skills (id, slug, name, description, risk_level, permissions, owner)",
      )
      .eq("account_id", accountId)
      .eq("agent_instance_id", agentSlug)
      .eq("enabled", true);

    if (error || !data || data.length === 0) {
      return official.map((s) => applyPermissionCeiling(s, available));
    }

    const rows = data as unknown as Array<{
      id: string;
      skills:
        | {
            slug: string;
            name: string;
            description: string;
            risk_level: string;
            permissions: string[] | null;
            owner: string;
          }
        | null;
    }>;

    const skills: RuntimeSkill[] = [];
    for (const row of rows) {
      const s = row.skills;
      // Una skill utente caricata via upload non ha una voce nel catalogo
      // statico: la usiamo comunque (è già validata al caricamento).
      if (!s?.slug) continue;
      const isOfficial = s.owner === "official" || s.owner === "community";
      skills.push(
        applyPermissionCeiling(
          {
            slug: s.slug,
            name: s.name,
            description: s.description,
            risk: (["low", "medium", "high"] as const).includes(
              s.risk_level as "low" | "medium" | "high",
            )
              ? (s.risk_level as RuntimeSkill["risk"])
              : "low",
            permissions: s.permissions ?? [],
            loaded: false,
            degraded: false,
            source: isOfficial ? "official" : "user",
          },
          available,
        ),
      );
    }

    return skills.length > 0 ? skills : official.map((s) => applyPermissionCeiling(s, available));
  } catch {
    return official.map((s) => applyPermissionCeiling(s, available));
  }
}

/**
 * Skill ufficiali consigliate a un agente, dal catalogo statico.
 *
 * È il fallback e anche il contenuto di default: un utente che non ha ancora
 * installato nulla riceve comunque le procedure del plugin consigliato, che è
 * il comportamento atteso ("le competenze ufficiali sono incluse nel prezzo").
 */
function officialSkillsForAgent(agentSlug: string): RuntimeSkill[] {
  const plugins = catalogPluginsForAgent(agentSlug);
  const skills: RuntimeSkill[] = [];
  for (const plugin of plugins) {
    for (const entry of plugin.skills) {
      skills.push({
        slug: entry.slug,
        name: entry.name,
        description: entry.description,
        risk: entry.risk,
        permissions: entry.permissions,
        loaded: false,
        degraded: false,
        source: "official",
      });
    }
  }
  return skills;
}

/**
 * Blocco di competenze per il system prompt + le skill da caricare nel turno.
 *
 * Restituisce entrambi perché la route li usa in due punti diversi: il primo
 * nel system prompt (sempre), il secondo come messaggio utente (solo quando
 * qualcosa è stato caricato).
 */
export async function prepareSkillsForRun(options: {
  accountId: string | null;
  agentSlug: string;
  userText: string;
}): Promise<{
  skills: RuntimeSkill[];
  indexBlock: string;
  turnMessage: string | null;
}> {
  const skills = await getEnabledSkills(options.accountId, options.agentSlug);
  const withLoad = selectSkillsToLoad(skills, options.userText);
  return {
    skills: withLoad,
    indexBlock: buildSkillIndex(skills),
    turnMessage: withLoad.length ? buildSkillTurnMessage(withLoad) : null,
  };
}

export type { RuntimeSkill };

/**
 * Registra l'attivazione di una competenza.
 *
 * Va in `skill_runs` (visibile in dashboard) e non è bloccante: se il log
 * fallisce l'esecuzione continua, perché la metrica non vale un errore
 * mostrato all'utente.
 */
export async function logSkillActivations(options: {
  accountId: string | null;
  agentSlug: string;
  runId: string;
  skills: RuntimeSkill[];
  outcome?: "success" | "failure" | "skipped";
  tokens?: number;
}): Promise<void> {
  if (!options.accountId || options.skills.length === 0) return;
  const admin = createAdminClient();
  if (!admin) return;

  try {
    const { data: installed } = await admin
      .from("installed_skills")
      .select("id, skill_id, skills(slug)")
      .eq("account_id", options.accountId)
      .eq("agent_instance_id", options.agentSlug);

    if (!installed || installed.length === 0) return;
    const rows = installed as unknown as Array<{
      id: string;
      skills: { slug: string } | null;
    }>;
    const bySlug = new Map(rows.map((r) => [r.skills?.slug, r.id] as const));

    const payload = options.skills
      .map((skill) => ({ skill, installedId: bySlug.get(skill.slug) }))
      .filter((x): x is { skill: RuntimeSkill; installedId: string } => Boolean(x.installedId))
      .map((x) => ({
        installed_skill_id: x.installedId,
        run_id: options.runId,
        outcome: options.outcome ?? "success",
        tokens: options.tokens ?? null,
      }));

    if (payload.length === 0) return;
    await admin.from("skill_runs").insert(payload);
  } catch {
    // Log best-effort: nessun errore propagato.
  }
}

/** Numero di plugin ufficiali che contengono una data skill (per le card). */
export function skillBelongsToOfficialPlugin(slug: string): boolean {
  return Boolean(getCatalogSkill(slug));
}
