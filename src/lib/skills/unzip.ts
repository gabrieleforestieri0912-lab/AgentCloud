/**
 * Lettura di un pacchetto .zip di competenza lato server.
 *
 * Perché separato dalla validazione: `validate.ts` è puro e testabile, qui
 * c'è la parte che tocca i byte (JSZip) e deve stare vicino alle route.
 *
 * Il pacchetto atteso è lo stesso generato da `buildSkillZip`: una cartella
 * `<skill-slug>/SKILL.md` più eventuali `references/`, `templates/`,
 * `examples/`. Si accetta anche lo .zip "piatto" (SKILL.md in radice) perché
 * è il formato che gli utenti producono con più facilità.
 */

import JSZip from "jszip";
import { getCatalogSkill } from "./catalog";
import {
  LIMITS,
  formatBytes,
  validatePackagePath,
  validateScriptFile,
  validateSkillMarkdown,
  type ValidatedSkill,
  type ValidationIssue,
} from "./validate";

export type UnzippedSkill = {
  skill: ValidatedSkill;
  issues: ValidationIssue[];
  /** File del pacchetto, per la anteprima. */
  files: { path: string; bytes: number }[];
  /** Slug del plugin ufficiale che contiene questa skill, se esiste. */
  pluginSlug: string | null;
};

export type UnzipResult =
  | { ok: true; result: UnzippedSkill }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Valida un buffer .zip e ne estrae la skill.
 *
 * Non solleva mai: ogni problema torna come `ValidationIssue`, così la route
 * può rispondere 400 con un elenco leggibile invece di un 500.
 */
export async function readSkillZip(buffer: ArrayBuffer | Uint8Array): Promise<UnzipResult> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const issues: ValidationIssue[] = [];

  if (bytes.byteLength > LIMITS.maxZipBytes) {
    issues.push({
      level: "error",
      field: "pacchetto",
      message: `Il pacchetto è troppo grande (${formatBytes(bytes.byteLength)}): il massimo è ${formatBytes(LIMITS.maxZipBytes)}.`,
    });
    return { ok: false, issues };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    issues.push({
      level: "error",
      field: "pacchetto",
      message: "Il file non è uno .zip valido. Ricompatta la cartella e riprova.",
    });
    return { ok: false, issues };
  }

  // --- percorsi e dimensioni -------------------------------------------
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length === 0) {
    issues.push({ level: "error", field: "pacchetto", message: "Lo .zip è vuoto." });
    return { ok: false, issues };
  }

  const files: { path: string; bytes: number }[] = [];
  for (const entry of entries) {
    issues.push(...validatePackagePath(entry.name));
    // La dimensione dichiarata nell'header .zip può mentire (zip bomb): le
    // dimensioni reali si rileggono dopo l'estrazione, più sotto.
    files.push({ path: entry.name, bytes: 0 });
  }

  const hasErrors = () => issues.some((i) => i.level === "error");
  if (hasErrors()) return { ok: false, issues };

  // --- SKILL.md ---------------------------------------------------------
  const skillEntries = entries.filter(
    (e) => /(^|\/)SKILL\.md$/i.test(e.name.replace(/\\/g, "/")),
  );
  if (skillEntries.length === 0) {
    issues.push({
      level: "error",
      field: "SKILL.md",
      message: "Nessun SKILL.md nel pacchetto: il file è obbligatorio.",
    });
    return { ok: false, issues };
  }
  if (skillEntries.length > 1) {
    issues.push({
      level: "error",
      field: "SKILL.md",
      message: `Il pacchetto contiene ${skillEntries.length} file SKILL.md: deve essercene uno solo.`,
    });
    return { ok: false, issues };
  }

  const content = await skillEntries[0].async("string");
  if (new TextEncoder().encode(content).length > LIMITS.maxSkillMdBytes) {
    issues.push({
      level: "error",
      field: "SKILL.md",
      message: `SKILL.md è troppo grande (max ${formatBytes(LIMITS.maxSkillMdBytes)}).`,
    });
    return { ok: false, issues };
  }

  const validated = validateSkillMarkdown(content);
  issues.push(...validated.issues);
  if (!validated.ok || !validated.skill) return { ok: false, issues };

  // --- scripts: regole più strette -------------------------------------
  for (const entry of entries) {
    const path = entry.name.replace(/\\/g, "/");
    if (!/(^|\/)(scripts|bin)\//.test(path)) continue;
    const scriptContent = await entry.async("string");
    issues.push(...validateScriptFile(path, scriptContent));
  }

  // --- dimensioni reali (zip bomb) -------------------------------------
  let totalBytes = 0;
  for (const entry of entries) {
    const raw = await entry.async("uint8array");
    totalBytes += raw.byteLength;
    const index = files.findIndex((f) => f.path === entry.name);
    if (index >= 0) files[index] = { path: entry.name, bytes: raw.byteLength };
  }
  if (totalBytes > LIMITS.maxZipBytes) {
    issues.push({
      level: "error",
      field: "pacchetto",
      message: `Contenuto estratto troppo grande (${formatBytes(totalBytes)}): il massimo è ${formatBytes(LIMITS.maxZipBytes)}.`,
    });
  }

  if (hasErrors()) return { ok: false, issues };

  const catalog = getCatalogSkill(validated.skill.slug);
  return {
    ok: true,
    result: {
      skill: validated.skill,
      issues,
      files,
      pluginSlug: catalog?.pluginSlug ?? null,
    },
  };
}
