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
import type { Locale } from "@/lib/i18n/constants";
import { getZipStrings } from "@/lib/i18n/skillCatalog";

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
  locale: Locale = "it",
): string {
  const t = getZipStrings(locale);
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
  lines.push(`locale: ${t.localeTag}`);
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

  lines.push(`## ${t.whenToUse}`);
  lines.push("");
  lines.push(
    `- ${t.whenToUseBullets[0]}`,
    `- ${t.whenToUseBullets[1]}`,
    skill.example ? `- ${t.activationExample}: «${skill.example}».` : "",
  );
  lines.push("");

  lines.push(`## ${t.whenNotToUse}`);
  lines.push("");
  if (skill.whenNot.length > 0) {
    for (const w of skill.whenNot) lines.push(`- ${w}`);
  } else {
    lines.push(`- ${t.whenNotFallback}`);
  }
  lines.push("");

  lines.push(`## ${t.procedure}`);
  lines.push("");
  if (skill.procedure.length > 0) {
    skill.procedure.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  } else {
    t.procedureFallback.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  lines.push("");

  lines.push(`## ${t.rules}`);
  lines.push("");
  if (skill.rules.length > 0) {
    for (const r of skill.rules) lines.push(`- ${r}`);
  } else {
    for (const r of t.rulesFallback) lines.push(`- ${r}`);
  }
  lines.push("");
  if (skill.risk === "high") {
    lines.push(...t.highRiskNote, "");
  }
  lines.push(...t.integrationLimits, "");

  lines.push(`## ${t.expectedOutput}`);
  lines.push("");
  lines.push(skill.output);
  lines.push("");

  lines.push(`## ${t.examples}`);
  lines.push("");
  if (skill.example) {
    lines.push(`**${t.exampleRequest}**: «${skill.example}»`);
  } else {
    lines.push(`**${t.exampleRequest}**: ${t.exampleRequestFallback}`);
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
function pluginReadme(plugin: SkillPlugin, locale: Locale = "it"): string {
  const t = getZipStrings(locale);
  const integrations = resolvePluginIntegrations(plugin);
  const lines: string[] = [
    `# ${plugin.name}`,
    "",
    plugin.tagline,
    "",
    plugin.description,
    "",
    `## ${t.readmeContents}`,
    "",
    ...plugin.skills.map((s) => `- \`${s.slug}\` — ${s.name} (${t.readmeRisk}: ${s.risk})`),
    "",
    `## ${t.readmeAgents}`,
    "",
    ...plugin.agents.map((a) => `- ${a.fit === "primary" ? `**${t.readmePrimary}**` : t.readmeSecondary}: \`${a.slug}\` — ${a.rationale}`),
    "",
    `## ${t.readmeIntegrations}`,
    "",
    ...integrations.map(
      (i) =>
        `- ${i.available ? "" : `_${t.readmeComingSoon}_ · `}${i.status === "required" ? `**${t.readmeRequired}**` : t.readmeOptional}: ${i.name} — ${i.rationale}`,
    ),
    "",
    `## ${t.readmeInstall}`,
    "",
    ...t.readmeInstallSteps.map((step, i) => `${i + 1}. ${step}`),
    "",
    `## ${t.readmeRules}`,
    "",
    ...t.readmeRulesBullets.map((b) => `- ${b}`),
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
export async function buildPluginZip(
  plugin: SkillPlugin,
  locale: Locale = "it",
): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const skill of plugin.skills) {
    zip.file(`${plugin.slug}/${skill.slug}/SKILL.md`, buildSkillMarkdown(skill, plugin, locale));
  }
  zip.file(`${plugin.slug}/README.md`, pluginReadme(plugin, locale));
  zip.file(`${plugin.slug}/plugin.json`, pluginManifest(plugin));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/** Pacchetto .zip di una singola skill (cartella installabile a mano). */
export async function buildSkillZip(
  skill: SkillEntry & { pluginSlug: string },
  plugin: SkillPlugin,
  locale: Locale = "it",
): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(`${skill.slug}/SKILL.md`, buildSkillMarkdown(skill, plugin, locale));
  zip.file(`${skill.slug}/README.md`, pluginReadme(plugin, locale));
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
