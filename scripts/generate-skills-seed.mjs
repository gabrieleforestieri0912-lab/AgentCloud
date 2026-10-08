/**
 * Genera `supabase/seed-skills.sql` dal catalogo TypeScript.
 *
 * Perché generare invece di scrivere a mano: il seed era stato scritto a mano
 * con slug che non combaciavano con i cataloghi reali (`quotes-estimates`
 * invece di `quote-agent`, `google-sheets` invece di `googlesheets`, 10 skill
 * mancanti). Il codice funzionava lo stesso — la UI legge il catalogo statico —
 * ma un seed applicato così creava righe che nessuna pagina poteva linkare.
 *
 * Ora la fonte è unica: il catalogo in `src/lib/skills/catalog.ts`. Per
 * rigenerare il seed dopo aver modificato il catalogo:
 *
 *     npm run seed:skills
 *
 * Il test `test:skills-catalog-parity` verifica che il file sia allineato, così
 * il drift non può tornare silenziosamente.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { SKILL_PLUGINS } from "../src/lib/skills/catalog.ts";

const OUT = "supabase/seed-skills.sql";

/** Escape per una stringa SQL con apici singoli. */
function q(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Array SQL per le permissioni. */
function sqlArray(values) {
  return `ARRAY[${values.map(q).join(", ")}]`;
}

/** Data di rilascio per la versione, derivata dal changelog del plugin. */
function releaseDate(plugin) {
  return plugin.changelog[0]?.date ?? "2026-01-15";
}

const lines = [];

lines.push("-- Skills & Plugins — seed del catalogo ufficiale");
lines.push("--");
lines.push("-- GENERATO da scripts/generate-skills-seed.mjs a partire da");
lines.push("-- src/lib/skills/catalog.ts. Non modificarlo a mano: modifica il");
lines.push("-- catalogo e rilancia `npm run seed:skills`.");
lines.push("--");
lines.push(`-- ${SKILL_PLUGINS.length} plugin, ${SKILL_PLUGINS.reduce((n, p) => n + p.skills.length, 0)} skill, tutte in italiano.`);
lines.push("--");
lines.push("-- Gli slug di agenti e integrazioni sono quelli REALI del marketplace");
lines.push("-- (src/lib/agents.ts) e del catalogo integrazioni (src/lib/integrations.ts):");
lines.push("-- è ciò che permette a /skills e alle card agente di linkare senza");
lines.push("-- traduzioni intermedie.");
lines.push("");
lines.push("-- Idempotente: ogni INSERT usa `ON CONFLICT ... DO UPDATE` sulla chiave");
lines.push("-- naturale (slug), quindi rieseguire il file aggiorna le righe senza");
lines.push("-- duplicarle.");
lines.push("");

// ── Plugins ────────────────────────────────────────────────────────────
lines.push("-- === PLUGINS ===");
lines.push("");
for (const plugin of SKILL_PLUGINS) {
  lines.push(`-- ${plugin.icon} ${plugin.name} · ${plugin.tagline}`);
  lines.push(
    `INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)`,
  );
  lines.push(`VALUES (${[
    q(plugin.slug),
    q(plugin.name),
    q(plugin.tagline),
    q(plugin.description),
    q(plugin.category),
    q(plugin.icon),
    q(plugin.priceTier),
    q(plugin.version),
  ].join(", ")})`);
  // Niente `;` dopo VALUES: ON CONFLICT è parte della stessa istruzione.
  lines.push("ON CONFLICT (slug) DO UPDATE SET");
  lines.push("  name = EXCLUDED.name,");
  lines.push("  tagline = EXCLUDED.tagline,");
  lines.push("  description = EXCLUDED.description,");
  lines.push("  category = EXCLUDED.category,");
  lines.push("  icon = EXCLUDED.icon,");
  lines.push("  price_tier = EXCLUDED.price_tier,");
  lines.push("  version = EXCLUDED.version;");
  lines.push("");
}

// ── Skills ──────────────────────────────────────────────────────────────
lines.push("-- === SKILLS ===");
lines.push("");
lines.push("-- Ogni skill è un file SKILL.md scaricabile: `description` è il testo");
lines.push("-- che l'agente legge per decidere se attivarla (progressive");
lines.push("-- disclosure), `permissions` è il soffitto di ciò che può fare.");
lines.push("");

let total = 0;
for (const plugin of SKILL_PLUGINS) {
  lines.push(`-- ${plugin.name} (${plugin.skills.length} skill)`);
  lines.push(
    "INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES",
  );
  plugin.skills.forEach((skill, index) => {
    total++;
    // L'ultima riga NON ha `;`: ON CONFLICT chiude l'istruzione.
    const terminator = index === plugin.skills.length - 1 ? "" : ",";
    lines.push(
      `  (${[
        q(skill.slug),
        q(skill.name),
        q(skill.description),
        q(plugin.version),
        q("it"),
        q("official"),
        q(skill.risk),
        sqlArray(skill.permissions),
      ].join(", ")})${terminator}`,
    );
  });
  lines.push("ON CONFLICT (slug) DO UPDATE SET");
  lines.push("  name = EXCLUDED.name,");
  lines.push("  description = EXCLUDED.description,");
  lines.push("  version = EXCLUDED.version,");
  lines.push("  risk_level = EXCLUDED.risk_level,");
  lines.push("  permissions = EXCLUDED.permissions;");
  lines.push("");
}

// ── Plugin ↔ Skills ────────────────────────────────────────────────────
lines.push("-- === PLUGIN-SKILLS ===");
lines.push("");
for (const plugin of SKILL_PLUGINS) {
  lines.push(`-- ${plugin.name}`);
  lines.push("INSERT INTO plugin_skills (plugin_id, skill_id)");
  lines.push("SELECT p.id, s.id FROM plugins p, skills s");
  lines.push(
    `WHERE p.slug = ${q(plugin.slug)} AND s.slug IN (${plugin.skills.map((s) => q(s.slug)).join(", ")})`,
  );
  // Chiave primaria composta (plugin_id, skill_id): rieseguire il seed non
  // deve duplicare i collegamenti.
  lines.push("ON CONFLICT (plugin_id, skill_id) DO NOTHING;");
  lines.push("");
}

// ── Plugin ↔ Agents ────────────────────────────────────────────────────
lines.push("-- === PLUGIN-AGENTS ===");
lines.push("");
lines.push("-- `fit = primary` = l'agente è costruito per questa competenza.");
lines.push("-- `secondary` = funziona bene, ma non è il suo caso d'uso principale.");
lines.push("");
for (const plugin of SKILL_PLUGINS) {
  lines.push(`-- ${plugin.name}`);
  const rows = plugin.agents.map((agent, index) => {
    const union = index === 0 ? "" : "UNION ALL\n";
    return `${union}  SELECT p.id, ${q(agent.slug)}, ${q(agent.fit)}, ${q(agent.rationale)} FROM plugins p WHERE p.slug = ${q(plugin.slug)}`;
  });
  lines.push("INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)");
  lines.push(rows.join("\n"));
  // Chiave primaria composta (plugin_id, agent_slug): il vincolo unique fa da
  // protezione, quindi qui il conflitto è un no-op invece di un errore.
  lines.push("ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET");
  lines.push("  fit = EXCLUDED.fit,");
  lines.push("  rationale = EXCLUDED.rationale;");
  lines.push("");
}

// ── Plugin ↔ Integrations ──────────────────────────────────────────────
lines.push("-- === PLUGIN-INTEGRATIONS ===");
lines.push("");
lines.push("-- `status = required` = la competenza la usa per funzionare.");
lines.push("-- `availability = coming_soon` = non è ancora collegabile: MAI un");
lines.push("-- prerequisito (l'utente può installare comunque e la competenza lavora");
lines.push("-- in modalità manuale).");
lines.push("");
for (const plugin of SKILL_PLUGINS) {
  lines.push(`-- ${plugin.name}`);
  lines.push(
    "INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)",
  );
  const rows = plugin.integrations.map((integration, index) => {
    const union = index === 0 ? "" : "UNION ALL\n";
    return `${union}  SELECT p.id, ${q(integration.brand)}, ${q(integration.status)}, ${q(resolveAvailability(integration.brand))}, ${q(integration.rationale)} FROM plugins p WHERE p.slug = ${q(plugin.slug)}`;
  });
  lines.push(rows.join("\n"));
  lines.push("ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET");
  lines.push("  status = EXCLUDED.status,");
  lines.push("  availability = EXCLUDED.availability,");
  lines.push("  rationale = EXCLUDED.rationale;");
  lines.push("");
}

// ── Note finali ─────────────────────────────────────────────────────────
lines.push("-- === NOTE ===");
lines.push("");
lines.push(`-- Versione di rilascio: ${releaseDate(SKILL_PLUGINS[0])} (cambia con il changelog del catalogo).`);
lines.push("--");
lines.push("-- Applica DOPO supabase/schema-skills.sql:");
lines.push("--");
lines.push("--   supabase db push");
lines.push("--   psql $DATABASE_URL -f supabase/seed-skills.sql");
lines.push("--");
lines.push("-- Le tabelle `installed_skills` e `skill_runs` restano vuote: sono");
lines.push("-- per-account e si riempiono con l'installazione e l'uso reale.");
lines.push("");

writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(`generato ${OUT}: ${SKILL_PLUGINS.length} plugin, ${total} skill`);

/**
 * Disponibilità dell'integrazione, letta dal catalogo UI.
 *
 * La importiamo qui (e non in cima) perché `resolveIntegration` è usato solo
 * qui e l'import in cima renderebbe circolare la lettura del file.
 */
function resolveAvailability(brand) {
  const entry = integrationCatalog().find(
    (i) => i.brand === brand || i.name.toLowerCase().replace(/\s+/g, "-") === brand,
  );
  return entry?.available ? "live" : "coming_soon";
}

/** Catalogo integrazioni, letto dal sorgente (senza import alias). */
function integrationCatalog() {
  const source = readFileSync("src/lib/integrations.ts", "utf8");
  const entries = [];
  // Blocco `export const INTEGRATIONS: Integration[] = [ ... ];`
  const block = source.slice(
    source.indexOf("export const INTEGRATIONS"),
    source.indexOf("];", source.indexOf("export const INTEGRATIONS")),
  );
  for (const match of block.matchAll(
    /name:\s*"([^"]+)",\s*brand:\s*"([^"]+)",[\s\S]*?available:\s*(true|false)/g,
  )) {
    entries.push({ name: match[1], brand: match[2], available: match[3] === "true" });
  }
  return entries;
}
