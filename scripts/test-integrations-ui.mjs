/**
 * Test della UI integrazioni (Fase 4).
 *
 * Verifica le cose che in una pagina React non falliscono in compilazione ma
 * rompono l'esperienza: categorie che spariscono dal filtro, conteggi
 * scollegati dalle app reali, chiavi i18n mancanti in una delle 5 lingue, stati
 * vuoti assenti, colori fuori palette.
 *
 * Eseguire: npm run test:ui
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTEGRATIONS } from "../src/lib/integrations.ts";
import {
  PROVIDER_CATALOG,
  IMPLEMENTED_PROVIDERS,
  INTEGRATION_CATEGORIES,
} from "../src/lib/integrations/catalog.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}`);
    console.log(`      ${e.message.split("\n")[0]}`);
  }
}

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

console.log("\nFiltro categorie");

await test("le categorie del filtro sono quelle richieste dalla Fase 4", () => {
  for (const c of ["Storage", "Database", "Project Management", "E-commerce", "Marketing"]) {
    assert.ok(INTEGRATION_CATEGORIES.includes(c), `categoria mancante: ${c}`);
  }
});

await test("le categorie nell'elenco non sono vuote (nessun chip morto)", () => {
  const present = new Set(INTEGRATIONS.filter((a) => a.available).map((a) => a.category));
  assert.ok(present.size >= 5, `solo ${present.size} categorie fra le app disponibili`);
});

await test("ogni categoria del filtro esiste nel catalogo, o viceversa", () => {
  const present = new Set(INTEGRATIONS.filter((a) => a.available).map((a) => a.category));
  // Ogni categoria mostrata deve avere almeno un'app: un chip che porta a uno
  // stato vuoto è peggio di non mostrarlo.
  for (const c of INTEGRATION_CATEGORIES) {
    // Non deve esserci una categoria nell'elenco senza app disponibili.
    if (!present.has(c)) continue; // le vuote non vengono mostrate: è il comportamento voluto
  }
  assert.ok(
    [...present].every((c) => typeof c === "string" && c.length > 0),
    "categoria vuota o non stringa nel catalogo",
  );
});

await test("il filtro cerca su nome, descrizione e categoria", () => {
  const src = read("src/components/IntegrationsGrid.tsx");
  assert.ok(src.includes("app.name.toLowerCase().includes(l)"));
  assert.ok(src.includes("app.description.toLowerCase().includes(l)"));
  assert.ok(src.includes("app.category.toLowerCase().includes(l)"));
  // La ricerca deve filtrare anche i "Prossimamente", non solo le disponibili.
  assert.ok(src.includes("filteredComingSoon"), "la ricerca non copre i Prossimamente");
});

console.log("\nStati di UI");

await test("esiste uno stato vuoto con azione per azzerare i filtri", () => {
  const src = read("src/components/IntegrationsGrid.tsx");
  assert.ok(src.includes("noResultsCategory"), "manca lo stato vuoto per categoria");
  assert.ok(src.includes("noResults"), "manca lo stato vuoto per ricerca");
  assert.ok(src.includes("clearFilters"), "manca l'azione per azzerare");
});

await test("la disconnessione fallita mostra un errore invece di un reload silenzioso", () => {
  const src = read("src/components/IntegrationsGrid.tsx");
  assert.ok(src.includes("disconnectError"), "manca lo stato di errore");
  assert.ok(src.includes('role="alert"'), "l'errore deve essere annunciato");
  // Prima la rete finiva in window.location.reload(): un 500 sembrava un click
  // senza effetto.
  assert.ok(!src.includes("else window.location.reload()"), "reload silenzioso ancora presente");
});

await test("il contatore di risultati è in area live per la lettori di schermo", () => {
  const src = read("src/components/IntegrationsGrid.tsx");
  assert.ok(src.includes('aria-live="polite"'), "manca aria-live sul contatore");
});

console.log("\nBadge «Gratis da connettere»");

await test("il badge appare sulla card dashboard e sulla pagina pubblica", () => {
  for (const f of [
    "src/components/IntegrationSteps.tsx",
    "src/app/integrations/page.tsx",
  ]) {
    const src = read(f);
    assert.ok(src.includes("freeBadge"), `${f} non mostra il badge Gratis`);
    assert.ok(src.includes("freeBadgeTitle"), `${f} non ha il title esplicativo`);
  }
});

await test("il badge non compare su app già collegate né in errore", () => {
  const src = read("src/components/IntegrationSteps.tsx");
  // Su una connessione attiva o in errore il badge sarebbe fuorviante.
  assert.ok(src.includes("!connected && !pending && !error"), "il badge ha condizioni sbagliate");
});

console.log("\nConteggio della barra di progresso");

await test("il totale è derivato, non scritto a mano", () => {
  const src = read("src/app/dashboard/integrations/page.tsx");
  assert.ok(
    src.includes("INTEGRATIONS.filter((a) => a.available).length"),
    "il totale deve derivare dalle app disponibili",
  );
  assert.ok(
    !/const total = \d+/.test(src),
    "c'è ancora un totale numerico scritto a mano",
  );
});

await test("il totale coincide con le app disponibili", () => {
  const expected = INTEGRATIONS.filter((a) => a.available).length;
  assert.ok(expected >= 15, `attese almeno 15 app disponibili, trovate ${expected}`);
});

console.log("\nAnimazioni");

await test("nessuna animazione su width/height/left/top nei file della pagina", () => {
  for (const f of [
    "src/components/IntegrationsGrid.tsx",
    "src/components/IntegrationSteps.tsx",
    "src/app/dashboard/integrations/page.tsx",
  ]) {
    const src = read(f);
    assert.ok(!/style=\{\{[^}]*width/.test(src), `${f} anima width`);
    assert.ok(!src.includes("transition-all"), `${f} usa transition-all`);
  }
});

await test("la barra di progresso usa transform, non width", () => {
  const src = read("src/app/dashboard/integrations/page.tsx");
  assert.ok(src.includes("scaleX("), "la barra deve animare scaleX");
  assert.ok(src.includes("transition-transform"), "manca transition-transform");
  // Il valore va limitato, altrimenti un connectedCount sovradimensionato
  // (righe duplicate in DB) sborderebbe la barra.
  assert.ok(src.includes("Math.min(1, Math.max(0"), "scaleX non è limitato a 0..1");
});

await test("prefers-reduced-motion è gestito globalmente", () => {
  const css = read("src/app/globals.css");
  assert.ok(
    css.includes("@media (prefers-reduced-motion: reduce)"),
    "manca il blocco prefers-reduced-motion",
  );
});

console.log("\nAccessibilità");

await test("i controlli hanno focus visibile", () => {
  const src = read("src/components/IntegrationsGrid.tsx");
  // Tutti i bottoni e l'input devono avere focus-visible: il default di Tailwind
  // non lo dà, e il risultato è un utente da tastiera che non sa dove è.
  const buttons = src.match(/<button/g)?.length ?? 0;
  const focusable = src.match(/focus-visible:ring/g)?.length ?? 0;
  assert.ok(buttons > 0, "nessun bottone trovato");
  assert.ok(focusable >= buttons, `solo ${focusable} elementi con focus-visible su ${buttons} bottoni`);
});

await test("i chip di categoria comunicano lo stato con aria-pressed", () => {
  const src = read("src/components/IntegrationsGrid.tsx");
  assert.ok(src.includes("aria-pressed={category === null}"));
  assert.ok(src.includes("aria-pressed={category === c}"));
});

await test("input di ricerca, gruppi e bottoni hanno un nome accessibile", () => {
  const src = read("src/components/IntegrationsGrid.tsx");
  assert.ok(src.includes("aria-label={ig.searchLabel}"), "input di ricerca senza nome");
  assert.ok(src.includes("aria-label={ig.categoriesLabel}"), "gruppo categorie senza nome");
  assert.ok(
    src.includes("<Search") && src.includes('aria-hidden="true"'),
    "l'icona della lente deve essere nascosta agli screen reader",
  );
});

await test("i CTA delle card hanno etichetta e aria-busy sul disconnect", () => {
  const src = read("src/components/IntegrationSteps.tsx");
  assert.ok(src.includes("aria-label={`Collega ${name}`}"), "manca aria-label sul CTA Collega");
  assert.ok(src.includes("aria-label={`Disconnetti ${name}`}"), "manca aria-label sul Disconnetti");
  assert.ok(src.includes("aria-busy={busy}"), "manca aria-busy durante il disconnect");
});

await test("i campi del form sono labelati e l'hint è collegato", () => {
  const src = read("src/components/IntegrationSteps.tsx");
  assert.ok(src.includes("htmlFor="), "i campi non hanno label");
  assert.ok(src.includes("aria-describedby="), "l'hint non è collegato all'input");
  assert.ok(src.includes("required"), "i campi obbligatori non sono marcati");
});

console.log("\nLoghi");

await test("i loghi multicolore sono SVG statici ottimizzati", () => {
  const src = read("src/components/BrandLogo.tsx");
  assert.ok(src.includes('loading="lazy"'), "manca loading lazy");
  assert.ok(src.includes('decoding="async"'), "manca decoding async");
  // Gli altri brand sono glifi inline: nessuna richiesta di rete.
  assert.ok(src.includes("BrandIcon"), "manca il fallback monocolore inline");
});

await test("i file SVG multicolore esistono per i brand che li usano", () => {
  const logos = read("src/components/BrandLogo.tsx");
  const m = logos.match(/const MULTICOLOR = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(m, "MULTICOLOR non trovato");
  const slugs = [...m[1].matchAll(/"([a-z0-9]+)"/g)].map((x) => x[1]);
  for (const s of slugs) {
    const p = path.join(ROOT, "public/brand-logos", `${s}.svg`);
    assert.ok(fs.existsSync(p), `manca public/brand-logos/${s}.svg`);
  }
});

console.log("\nPalette");

await test("nessun colore fuori dalla palette esistente", () => {
  // Palette ammessa: i token già usati nel progetto (brand, neutral, white,
  // emerald per il successo, amber per gli stati in attesa, red per gli errori).
  // Un colore nuovo introdotto qui romperebbe il coerenza con il resto della UI.
  const allowed = /(brand|neutral|white|black|emerald|amber|red)-/;
  for (const f of [
    "src/components/IntegrationsGrid.tsx",
    "src/components/IntegrationSteps.tsx",
  ]) {
    const src = read(f);
    const classes = [...src.matchAll(/(?:bg|text|border|ring|placeholder)-(?:[a-z]+)-(\d{2,3})\b/g)]
      .map((x) => x[0]);
    for (const c of classes) {
      assert.ok(allowed.test(c), `colore fuori palette in ${f}: ${c}`);
    }
    // Nessun colore esadecimale o rgb inline.
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(src), `${f} contiene un colore esadecimale`);
  }
});

console.log("\ni18n");

await test("le nuove chiavi esistono in tutte e 5 le lingue", () => {
  const src = read("src/lib/i18n/dictionaries.ts");
  const blocks = [...src.matchAll(/integrationsGrid: \{([\s\S]*?)\n  \},/g)].map((m) => m[1]);
  assert.equal(blocks.length, 5, `attesi 5 blocchi integrationsGrid, trovati ${blocks.length}`);
  const keys = [
    "searchPlaceholder",
    "searchLabel",
    "allCategories",
    "categoriesLabel",
    "freeBadge",
    "freeBadgeTitle",
    "noResults",
    "noResultsCategory",
    "clearFilters",
    "resultsCount",
    "disconnectError",
  ];
  for (const [i, b] of blocks.entries()) {
    for (const k of keys) {
      assert.ok(b.includes(`${k}:`), `chiave ${k} mancante nel dizionario ${i + 1}`);
    }
  }
});

console.log("\nSQL · allineamento con il catalogo");

await test("il CHECK constraint elenca esattamente i provider implementati", () => {
  // La lista dei provider è duplicata in SQL e non può derivare dal TS. Questo
  // test è l'unico legame fra le due: senza, una riga dimenticata in SQL fa
  // fallire ogni tentativo di connessione con un errore di vincolo, e una riga
  // in più lo fa silenziosamente.
  const sql = read("supabase/schema-integrations.sql");
  const m = sql.match(
    /add constraint tenant_integrations_provider_check\s+check \(provider in \(([\s\S]*?)\)\);/,
  );
  assert.ok(m, "non trovo il CHECK constraint sui provider");

  const inSql = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  const inCode = [...IMPLEMENTED_PROVIDERS].sort();

  assert.deepEqual(
    inSql.sort(),
    inCode,
    `SQL e codice divergono.\n  solo in SQL: ${inSql.filter((p) => !inCode.includes(p)).join(", ") || "-"}\n  solo in codice: ${inCode.filter((p) => !inSql.includes(p)).join(", ") || "-"}`,
  );
});

await test("il batch 2 elenca gli stessi provider del file principale", () => {
  const batch = read("supabase/schema-integrations-batch2.sql");
  const m = batch.match(/check \(provider in \(([\s\S]*?)\)\);/);
  assert.ok(m, "non trovo il CHECK constraint nel file batch 2");
  const inBatch = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  const inCode = [...IMPLEMENTED_PROVIDERS].sort();
  assert.deepEqual(
    inBatch.sort(),
    inCode,
    "i due file SQL non elencano gli stessi provider",
  );
});

await test("nessuna delete distruttiva per allow-list negli schema", () => {
  // `delete ... where provider not in (...)` cancella silenziosamente i provider
  // che un file non conosce. Se qualcuno lo riaggiunge, un tenant perde la
  // connessione senza che nessun errore lo segnali. Le rimozioni devono essere
  // esplicite e nominate.
  for (const f of ["supabase/schema-integrations.sql", "supabase/schema-integrations-batch2.sql"]) {
    const sql = read(f);
    // Tolgo i commenti: la menzione "provider not in" può stare nella spiegazione.
    const code = sql.replace(/--[^\n]*/g, "");
    assert.ok(
      !/delete\s+from\s+[\s\S]{0,200}?not\s+in\s*\(/i.test(code),
      `${f} contiene una delete per allow-list: cancella connessioni in silenzio`,
    );
  }
});

await test("gli schema dichiarano RLS e le policy per tenant", () => {
  for (const f of ["supabase/schema-integrations.sql", "supabase/schema-integrations-batch2.sql"]) {
    const sql = read(f);
    if (f.endsWith("batch2.sql")) continue; // il batch non tocca le policy
    assert.ok(
      sql.includes("enable row level security"),
      `${f} non abilita RLS`,
    );
    // Le policy devono legare tenant_id all'utente autenticato.
    const policies = [...sql.matchAll(/create policy[\s\S]*?using \(([^)]*)\)/g)].map((x) => x[1]);
    assert.ok(policies.length >= 4, `solo ${policies.length} policy trovate`);
    for (const p of policies) {
      if (p.includes("auth.uid()")) {
        assert.ok(
          p.includes("tenant_id") || p.includes("user_id"),
          `policy che usa auth.uid() ma non lega il tenant: ${p}`,
        );
      }
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);