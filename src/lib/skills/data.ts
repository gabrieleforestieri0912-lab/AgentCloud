/**
 * Accesso dati alle Competenze (Skill) e ai Plugin.
 *
 * Perché esiste: `skills`/`plugins` sono la fonte di verità quando la
 * migration (`supabase/schema-skills.sql` + `seed-skills.sql`) è stata
 * applicata, ma su un ambiente dove le tabelle non esistono ancora le API
 * restituirebbero liste vuote e il catalogo non sarebbe navigabile. Qui si
 * prova Supabase e, se la query fallisce, si ricade sul catalogo statico
 * (`src/lib/skills/catalog.ts`), che ne rispecchia 1:1 il contenuto.
 *
 * Il fallback non è una copia "di comodo": è la stessa sorgente da cui
 * generiamo gli zip scaricabili, così download e UI non possono divergere.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  SKILL_PLUGINS,
  catalogPluginsForAgent,
  getCatalogPlugin,
  type ResolvedIntegration,
  type SkillEntry,
  type SkillPlugin,
  resolvePluginIntegrations,
} from "./catalog";

/** Plugin come lo vede la UI: catalogo + integrazioni già risolte. */
export type ResolvedPlugin = SkillPlugin & {
  skills: (SkillEntry & { pluginSlug: string })[];
  resolvedIntegrations: ResolvedIntegration[];
  skillCount: number;
  liveIntegrationCount: number;
};

/**
 * Arricchisce un plugin del catalogo statico con i campi derivati che la UI
 * usa. Applicato anche ai plugin arrivati dal DB, così i due percorsi hanno
 * la stessa forma.
 */
export function decoratePlugin(plugin: SkillPlugin): ResolvedPlugin {
  const skills = plugin.skills.map((s) => ({ ...s, pluginSlug: plugin.slug }));
  const resolvedIntegrations = resolvePluginIntegrations(plugin);
  return {
    ...plugin,
    skills,
    resolvedIntegrations,
    skillCount: skills.length,
    liveIntegrationCount: resolvedIntegrations.filter((i) => i.available).length,
  };
}

/**
 * Tipo grezzo della riga `plugins` con le relazioni. Le tabelle non hanno un
 * tipo generato disponibile (migration non ancora applicata ovunque), quindi
 * dichiariamo la forma minima che il select usa.
 */
type PluginRow = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: string | null;
  price_tier: string;
  version: string;
  plugin_skills?: { skills: SkillRow | SkillRow[] | null }[];
};

type SkillRow = {
  slug: string;
  name: string;
  description: string;
  risk_level: SkillRowRisk;
  permissions: string[] | null;
};

type SkillRowRisk = SkillEntry["risk"];

const RISKS: SkillRowRisk[] = ["low", "medium", "high"];

/**
 * Converte una riga `plugins` (DB) nel tipo del catalogo.
 *
 * Restituisce `null` se mancano i dati minimi: meglio mostrare il catalogo
 * statico che una card mezza vuota.
 */
function pluginFromRow(row: PluginRow): SkillPlugin | null {
  if (!row?.slug || !row?.name || !row?.tagline || !row?.description) return null;
  const skills: SkillEntry[] = [];
  for (const link of row.plugin_skills ?? []) {
    const raw = link?.skills;
    const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const s of rows) {
      if (!s?.slug || !s?.name || !s?.description) continue;
      skills.push({
        slug: s.slug,
        name: s.name,
        description: s.description,
        risk: RISKS.includes(s.risk_level) ? s.risk_level : "low",
        permissions: s.permissions ?? [],
        // Contenuti procedurali vivono nel catalogo statico: il DB conserva
        // i metadati, il corpo della skill è il file SKILL.md che scarichiamo.
        whenNot: [],
        procedure: [],
        rules: [],
        output: s.description,
        example: "",
      });
    }
  }
  const priceTier =
    row.price_tier === "addon" || row.price_tier === "included" || row.price_tier === "free"
      ? row.price_tier
      : "included";
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    icon: row.icon ?? "📦",
    priceTier,
    version: row.version ?? "1.0.0",
    skills,
    agents: [],
    integrations: [],
    // Il changelog è contenuto di prodotto, non metadato: quando il plugin è
    // noto al catalogo statico lo merge riprende quello (vedi
    // `mergeWithCatalog`), quindi qui si lascia vuoto.
    changelog: [],
  };
}

/** Merge del DB sul catalogo statico: il DB aggiorna, non sostituisce. */
function mergeWithCatalog(rows: PluginRow[]): SkillPlugin[] {
  const bySlug = new Map(SKILL_PLUGINS.map((p) => [p.slug, p]));
  const seen = new Set<string>();
  const merged: SkillPlugin[] = [];

  for (const row of rows) {
    const fromDb = pluginFromRow(row);
    if (!fromDb) continue;
    const base = bySlug.get(fromDb.slug);
    // Le relazioni (agenti, integrazioni, corpo delle skill, changelog) stanno
    // nel catalogo statico: se il plugin è noto, il DB serve solo metadati
    // (nome, tagline, descrizione, icona, versione).
    merged.push(
      base
        ? {
            ...base,
            ...fromDb,
            agents: base.agents,
            integrations: base.integrations,
            skills: base.skills.length ? base.skills : fromDb.skills,
            changelog: base.changelog,
          }
        : fromDb,
    );
    seen.add(fromDb.slug);
  }

  for (const plugin of SKILL_PLUGINS) {
    if (!seen.has(plugin.slug)) merged.push(plugin);
  }
  return merged;
}

/**
 * Tutti i plugin, dalla fonte migliore disponibile.
 *
 * `revalidate` è basso (5 minuti): la pagina è pubblica e deve essere
 * veloce, e il catalato non cambia più di una volta al mese.
 */
export async function getPlugins(): Promise<ResolvedPlugin[]> {
  const admin = createAdminClient();
  if (admin) {
    try {
      const { data, error } = await admin
        .from("plugins")
        .select(
          "slug, name, tagline, description, category, icon, price_tier, version, plugin_skills(skills(slug, name, description, risk_level, permissions))",
        )
        .order("name");
      if (!error && data && data.length > 0) {
        return mergeWithCatalog(data as unknown as PluginRow[]).map(decoratePlugin);
      }
    } catch {
      // Nessun errore propagato: il fallback statico copre il caso.
    }
  }
  return SKILL_PLUGINS.map(decoratePlugin);
}

/** Un plugin per slug, o `undefined` se lo slug non esiste. */
export async function getPlugin(slug: string): Promise<ResolvedPlugin | undefined> {
  const plugins = await getPlugins();
  return plugins.find((p) => p.slug === slug);
}

/** Plugin consigliati per un agente del marketplace. */
export async function getRecommendedPlugins(agentSlug: string): Promise<ResolvedPlugin[]> {
  const plugins = await getPlugins();
  return catalogPluginsForAgent(agentSlug)
    .map((p) => plugins.find((x) => x.slug === p.slug))
    .filter((p): p is ResolvedPlugin => p !== undefined);
}

/** Una skill per slug, con il plugin di appartenenza. */
export async function getSkill(
  slug: string,
): Promise<(SkillEntry & { pluginSlug: string; plugin: ResolvedPlugin }) | undefined> {
  const plugins = await getPlugins();
  for (const plugin of plugins) {
    const skill = plugin.skills.find((s) => s.slug === slug);
    if (skill) return { ...skill, pluginSlug: plugin.slug, plugin };
  }
  return undefined;
}

/** Categorie presenti nel catalogo, con quante card hanno quella categoria. */
export function pluginCategories(plugins: ResolvedPlugin[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of plugins) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return Array.from(counts, ([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value));
}

/** Agenti che hanno almeno un plugin consigliato, deduplicati. */
export function agentOptions(plugins: ResolvedPlugin[]): { slug: string; pluginCount: number }[] {
  const counts = new Map<string, number>();
  for (const p of plugins) {
    for (const a of p.agents) counts.set(a.slug, (counts.get(a.slug) ?? 0) + 1);
  }
  return Array.from(counts, ([slug, pluginCount]) => ({ slug, pluginCount })).sort((a, b) =>
    a.slug.localeCompare(b.slug),
  );
}

/** Integrazioni presenti nei plugin, deduplicate. */
export function integrationOptions(
  plugins: ResolvedPlugin[],
): { brand: string; name: string; available: boolean }[] {
  const seen = new Map<string, { brand: string; name: string; available: boolean }>();
  for (const p of plugins) {
    for (const i of p.resolvedIntegrations) {
      if (!seen.has(i.brand)) {
        seen.set(i.brand, { brand: i.brand, name: i.name, available: i.available });
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Numero totale di skill nel catalogo (per i contatori della pagina). */
export function totalSkillCount(plugins: ResolvedPlugin[]): number {
  return plugins.reduce((sum, p) => sum + p.skillCount, 0);
}

export { getCatalogPlugin };
