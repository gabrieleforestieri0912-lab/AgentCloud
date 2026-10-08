/**
 * Generatore dei pacchetti .zip scaricabili (plugin e singole skill).
 *
 * Perché generare al volo: il catalogo vive nel codice/DB, non in storage.
 * Un file pre-buildato in `public/` andrebbe rigenerato a ogni modifica di
 * una SKILL.md e non rifletterebbe le installazioni. Qui il pacchetto è
 * derivato dalla stessa fonte della UI, quindi non può divergere.
 *
 * Formato (modello Claude Skills):
 *   <slug>/
 *     SKILL.md            obbligatorio, < 500 righe
 *     references/         opzionale
 *     templates/          opzionale
 *     examples/           opzionale
 *     examples/plugin.json metadati del plugin (solo nei pacchetti plugin)
 *
 * Il nome del file porta la versione (`agentcloud-<plugin>-v1.0.0.zip`) così
 * la cache del browser e i link condivisi restano coerenti.
 */

import JSZip from "jszip";
import type { SkillEntry, SkillPlugin } from "./catalog";
import { resolvePluginIntegrations } from "./catalog";

/** Limite del formato: oltre, la skill non è più caricabile dagli agenti. */
const MAX_LINES = 500;

/** Riga frontmatter YAML: `"` dentro una stringa va doppiato. */
function yamlString(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Lista YAML inline: `["a", "b"]`. */
function yamlList(values: string[]): string {
  return `[${values.map(yamlString).join(", ")}]`;
}

/**
 * Compone il corpo della SKILL.md.
 *
 * La struttura segue il formato dichiarato nel prompt di prodotto: quando
 * usarla, quando NON usarla, procedura, regole, output atteso, esempi. I
 * riferimenti lunghi restano fuori dal corpo (regola < 500 righe).
 */
export function buildSkillMarkdown(
  skill: SkillEntry,
  plugin: SkillPlugin,
): string {
  const integrations = resolvePluginIntegrations(plugin);
  const required = integrations.filter((i) => i.status === "required").map((i) => i.name);
  const optional = integrations.filter((i) => i.status === "optional").map((i) => i.name);

  const lines: string[] = [];

  // --- frontmatter ------------------------------------------------------
  lines.push("---");
  lines.push(`name: ${skill.slug}`);
  lines.push("description: >");
  for (const chunk of wrapText(skill.description, 88)) {
    lines.push(`  ${chunk}`);
  }
  lines.push(`version: ${plugin.version}`);
  lines.push("locale: it");
  lines.push(`agents: ${yamlList(plugin.agents.filter((a) => a.fit === "primary").map((a) => a.slug))}`);
  lines.push(`integrations_required: ${yamlList(required)}`);
  lines.push(`integrations_optional: ${yamlList(optional)}`);
  lines.push(`permissions: ${yamlList(skill.permissions)}`);
  lines.push(`risk_level: ${skill.risk}`);
  lines.push("---");

  // --- corpo ------------------------------------------------------------
  lines.push("");
  lines.push(`# ${skill.name}`);
  lines.push("");
  lines.push(skill.description);
  lines.push("");

  lines.push("## Quando usarla");
  lines.push("");
  lines.push(
    "- La richiesta del cliente riguarda direttamente questo compito.",
    "- I dati necessari sono disponibili nelle integrazioni collegate.",
    skill.example ? `- Esempio di attivazione: «${skill.example}».` : "",
  );
  lines.push("");

  lines.push("## Quando NON usarla");
  lines.push("");
  if (skill.whenNot.length > 0) {
    for (const w of skill.whenNot) lines.push(`- ${w}`);
  } else {
    lines.push("- Il compito esce dagli ambiti descritti sopra.");
  }
  lines.push("");

  lines.push("## Procedura passo-passo");
  lines.push("");
  if (skill.procedure.length > 0) {
    skill.procedure.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  } else {
    lines.push("1. Raccogli gli input necessari dalla richiesta.");
    lines.push("2. Leggi i dati dalle integrazioni collegate.");
    lines.push("3. Applica le regole della sezione successiva.");
    lines.push("4. Restituisci l'output nel formato dichiarato.");
  }
  lines.push("");

  lines.push("## Regole e vincoli");
  lines.push("");
  if (skill.rules.length > 0) {
    for (const r of skill.rules) lines.push(`- ${r}`);
  } else {
    lines.push("- Tono: professionale, diretto, orientato al risultato.");
    lines.push("- Nessun dato inventato: se manca, si dichiara che manca.");
    lines.push("- GDPR: solo i dati necessari, mai segreti nei documenti.");
  }
  lines.push("");
  if (skill.risk === "high") {
    lines.push(
      "> **Azione ad alto rischio**: le operazioni che comportano effetti",
      "> esterni (invio a terzi, pagamenti, pubblicazioni, cancellazioni)",
      "> richiedono l'approvazione esplicita dell'utente prima di procedere.",
      "",
    );
  }
  lines.push(
    "- La skill non può usare integrazioni diverse da quelle collegate all'agente.",
    "- Le integrazioni «in arrivo» non sono mai un prerequisito: in attesa si lavora",
    "  in modalità manuale e si esporta il risultato.",
    "",
  );

  lines.push("## Output atteso");
  lines.push("");
  lines.push(skill.output);
  lines.push("");

  lines.push("## Esempi");
  lines.push("");
  if (skill.example) {
    lines.push(`**Richiesta**: «${skill.example}»`);
  } else {
    lines.push("**Richiesta**: descrivi il compito come lo farebbe un utente.");
  }
  lines.push("");
  lines.push("```");
  lines.push(skill.output);
  lines.push("```");
  lines.push("");

  return `${lines.filter((l, i) => !(l === "" && lines[i - 1] === "")).join("\n")}\n`;
}

/** Spezza un paragrafo su parole, senza spezzare le parole lunghe. */
function wrapText(text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line.length + word.length + 1 > width) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

/** README del pacchetto plugin: cosa contiene e come si installa. */
function pluginReadme(plugin: SkillPlugin): string {
  const integrations = resolvePluginIntegrations(plugin);
  const lines: string[] = [
    `# ${plugin.name}`,
    "",
    plugin.tagline,
    "",
    plugin.description,
    "",
    "## Cosa contiene",
    "",
    ...plugin.skills.map((s) => `- \`${s.slug}\` — ${s.name} (rischio: ${s.risk})`),
    "",
    "## Agenti consigliati",
    "",
    ...plugin.agents.map((a) => `- ${a.fit === "primary" ? "**primario**" : "secondario"}: \`${a.slug}\` — ${a.rationale}`),
    "",
    "## Integrazioni consigliate",
    "",
    ...integrations.map(
      (i) =>
        `- ${i.available ? "" : "_in arrivo_ · "}${i.status === "required" ? "**necessaria**" : "opzionale"}: ${i.name} — ${i.rationale}`,
    ),
    "",
    "## Installazione",
    "",
    "1. Scarica questo pacchetto e decomprimilo.",
    "2. In AgentCloud apri `/skills` e installa il plugin sull'agente scelto.",
    "3. Oppure carica la singola cartella `references/` come skill personalizzata.",
    "",
    "## Regole",
    "",
    "- Le skill ad alto rischio richiedono approvazione esplicita.",
    "- Nessuna integrazione «in arrivo» è un prerequisito.",
    "- Le skill non possono accedere a dati fuori dal tuo account.",
    "",
  ];
  return lines.join("\n");
}

/** Manifesto JSON del pacchetto: stessa forma dei record del DB. */
function pluginManifest(plugin: SkillPlugin) {
  return `${JSON.stringify(
    {
      name: plugin.name,
      slug: plugin.slug,
      version: plugin.version,
      tagline: plugin.tagline,
      category: plugin.category,
      agents: plugin.agents,
      integrations: plugin.integrations,
      skills: plugin.skills.map((s) => ({
        slug: s.slug,
        name: s.name,
        risk_level: s.risk,
        permissions: s.permissions,
      })),
    },
    null,
    2,
  )}\n`;
}

/** Nome del file scaricato, con versione (regola del prompt di prodotto). */
export function downloadFileName(slug: string, version: string): string {
  return `agentcloud-${slug}-v${version}.zip`;
}

/** Pacchetto .zip di un singolo plugin (con tutte le sue skill). */
export async function buildPluginZip(plugin: SkillPlugin): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const skill of plugin.skills) {
    zip.file(`${plugin.slug}/${skill.slug}/SKILL.md`, buildSkillMarkdown(skill, plugin));
  }
  zip.file(`${plugin.slug}/README.md`, pluginReadme(plugin));
  zip.file(`${plugin.slug}/plugin.json`, pluginManifest(plugin));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/** Pacchetto .zip di una singola skill (cartella installabile a mano). */
export async function buildSkillZip(
  skill: SkillEntry & { pluginSlug: string },
  plugin: SkillPlugin,
): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(`${skill.slug}/SKILL.md`, buildSkillMarkdown(skill, plugin));
  zip.file(`${skill.slug}/README.md`, pluginReadme(plugin));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/** Numero di righe del corpo di una SKILL.md (controllo del formato). */
export function skillMarkdownLines(skill: SkillEntry, plugin: SkillPlugin): number {
  return buildSkillMarkdown(skill, plugin).split("\n").length;
}

/** La skill rispetta il limite di 500 righe del formato. */
export function skillFitsFormat(skill: SkillEntry, plugin: SkillPlugin): boolean {
  return skillMarkdownLines(skill, plugin) < MAX_LINES;
}
