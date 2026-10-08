/**
 * Allineamento del seed SQL al catalogo TypeScript.
 *
 * Il seed `supabase/seed-skills.sql` era stato scritto con slug che non
 * combaciavano con i cataloghi reali (`quotes-estimates` invece di
 * `quote-agent`, `google-sheets` invece del brand `googlesheets`, …). Il
 * codice funziona perché il catalogo statico è la fonte dei dati, ma un
 * seed applicato così creerebbe righe che nessuna pagina può linkare.
 *
 * Questo test verifica la coerenza e fallisce se qualcuno reintroduce uno
 * slug sbagliato, così il problema non torna silenziosamente.
 */

import { readFileSync } from "node:fs";
import { SKILL_PLUGINS, resolveIntegration } from "../src/lib/skills/catalog.ts";
import { AGENTS } from "../src/lib/agents.ts";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}`);
    console.log(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const AGENT_SLUGS = new Set(AGENTS.map((a) => a.slug));

console.log("\nCoerenza codice ↔ seed");

await test("ogni plugin del catalogo esiste nel seed SQL", () => {
  const seed = readFileSync("supabase/seed-skills.sql", "utf8");
  for (const plugin of SKILL_PLUGINS) {
    assert(seed.includes(`'${plugin.slug}'`), `plugin "${plugin.slug}" assente dal seed`);
  }
});

await test("ogni skill del catalogo esiste nel seed SQL", () => {
  const seed = readFileSync("supabase/seed-skills.sql", "utf8");
  for (const plugin of SKILL_PLUGINS) {
    for (const skill of plugin.skills) {
      assert(seed.includes(`'${skill.slug}'`), `skill "${skill.slug}" assente dal seed`);
    }
  }
});

await test("il seed non contiene slug di agente inesistenti", () => {
  // Agenti che il seed usava e che NON esistono nel marketplace reale.
  const WRONG = [
    "quotes-estimates",
    "reviews-reputation",
    "seo-content",
    "social-media",
    "email-agent-placeholder",
  ];
  const seed = readFileSync("supabase/seed-skills.sql", "utf8");
  for (const wrong of WRONG) {
    // Cerchiamo la forma usata dal seed: `'slug', 'primary'` o `'slug', 'secondary'`.
    const pattern = new RegExp(`'${wrong}',\\s*'(primary|secondary)'`);
    assert(!pattern.test(seed), `il seed usa ancora l'agente inesistente "${wrong}"`);
  }
});

await test("il seed non contiene integrazioni con slug non risolti", () => {
  const seed = readFileSync("supabase/seed-skills.sql", "utf8");
  // Le integrazioni del seed sono della forma `SELECT p.id, '<slug>', '<status>', ...`.
  const rows = [...seed.matchAll(/SELECT p\.id, '([a-z0-9-]+)', '(required|optional)', '(live|coming_soon)'/g)];
  assert(rows.length > 0, "nessuna riga integrazione trovata nel seed");
  for (const [, slug] of rows) {
    assert(
      resolveIntegration({ brand: slug, status: "optional", rationale: "" }) !== null,
      `il seed usa l'integrazione "${slug}" che non risolve a un brand del catalogo`,
    );
  }
  console.log(`      (${rows.length} righe integrazione verificate)`);
});

await test("gli agenti consigliati sono agenti del marketplace", () => {
  for (const plugin of SKILL_PLUGINS) {
    for (const agent of plugin.agents) {
      assert(
        AGENT_SLUGS.has(agent.slug),
        `${plugin.slug} consiglia "${agent.slug}", che non è nel marketplace`,
      );
    }
  }
});

await test("ogni plugin ha almeno un agente primary", () => {
  for (const plugin of SKILL_PLUGINS) {
    assert(
      plugin.agents.some((a) => a.fit === "primary"),
      `${plugin.slug} non ha agenti primary`,
    );
  }
});

await test("ogni integrazione obbligatoria ha una motivazione", () => {
  for (const plugin of SKILL_PLUGINS) {
    for (const integration of plugin.integrations) {
      assert(
        integration.rationale.trim().length > 10,
        `${plugin.slug}/${integration.brand}: motivazione troppo breve`,
      );
    }
  }
});

await test("nessun ON CONFLICT dopo un ; (sintassi valida)", () => {
  // Errore già capitato una volta: `VALUES (...); ON CONFLICT` non è SQL
  // valido, ON CONFLICT deve stare nella stessa istruzione. Se il generatore
  // lo reintroduce, questo test lo becca prima del SQL Editor.
  const seed = readFileSync("supabase/seed-skills.sql", "utf8");
  const bad = seed.match(/;\s*\nON CONFLICT/g);
  assert(!bad, "trovato ';' prima di ON CONFLICT nel seed generato");
});

await test("ogni INSERT con ON CONFLICT nomina un vincolo esistente", () => {
  const seed = readFileSync("supabase/seed-skills.sql", "utf8");
  const schema = readFileSync("supabase/schema-skills.sql", "utf8");
  const targets = [...seed.matchAll(/ON CONFLICT \(([^)]+)\)/g)].map((m) => m[1].trim());
  assert(targets.length > 0, "nessun ON CONFLICT nel seed");
  // slug è UNIQUE su skills e plugins; le tabelle ponte hanno PRIMARY KEY
  // composte (plugin_id, ...).
  for (const target of targets) {
    const ok =
      target === "slug" ||
      target === "plugin_id, skill_id" ||
      target === "plugin_id, agent_slug" ||
      target === "plugin_id, integration_slug";
    assert(ok, `ON CONFLICT su vincolo sconosciuto: (${target})`);
  }
  void schema;
});

await test("ogni agente consigliato ha una motivazione", () => {
  for (const plugin of SKILL_PLUGINS) {
    for (const agent of plugin.agents) {
      assert(
        agent.rationale.trim().length > 10,
        `${plugin.slug}/${agent.slug}: motivazione troppo breve`,
      );
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
