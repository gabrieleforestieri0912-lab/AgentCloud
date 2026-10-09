/**
 * Validazione delle Competenze (SKILL.md).
 *
 * Perché esiste: una skill caricata da un utente finisce nel system prompt di
 * un agente che ha accesso ai dati dell'account. Serve quindi un controllo
 * SERVER, non solo nella UI: frontmatter obbligatorio, limiti di dimensione,
 * niente segreti, niente link esterni negli script.
 *
 * Il modulo è puro (nessuna dipendenza, nessuna I/O) così è testabile in
 * isolamento: il validatore è puro e non tocca il database.
 */

import type { SkillRisk } from "./catalog";

/** Limiti del formato (vedi `src/lib/skills/zip.ts` per il lato generazione). */
export const LIMITS = {
  /** Righe massime del corpo di SKILL.md. */
  maxLines: 500,
  /** Byte massimi per file nel pacchetto. */
  maxFileBytes: 1024 * 1024,
  /** Byte massimi del pacchetto .zip. */
  maxZipBytes: 5 * 1024 * 1024,
  /** Byte massimi del corpo di SKILL.md. */
  maxSkillMdBytes: 256 * 1024,
} as const;

export type ValidationIssue = {
  /** `error` blocca il caricamento, `warning` è informativo. */
  level: "error" | "warning";
  field: string;
  message: string;
};

export type ParsedFrontmatter = {
  fields: Record<string, string | string[]>;
  body: string;
  /** Indice (0-based) della riga dopo il frontmatter, per i messaggi. */
  bodyStartLine: number;
};

/**
 * Frontmatter YAML minimale.
 *
 * Perché non una libreria: il formato ammette solo scalari e liste inline di
 * stringhe (`["a", "b"]`), che si parsano in modo deterministico. Importare un
 * parser YAML completo aggiungerebbe superficie d'attacco (anchor, alias,
 * tag) inutile per un file che l'utente scrive a mano.
 */
export function parseFrontmatter(source: string): ParsedFrontmatter | null {
  // Tolle il BOM: alcuni editor lo aggiungono e romperebbe l'apertura del
  // frontmatter, rendendo la skill invalida senza motivo.
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  if (!/^---\r?\n/.test(text)) return null;

  const lines = text.split(/\r?\n/);
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (end === -1) return null;

  const fields: Record<string, string | string[]> = {};
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Continuazione di una lista su più righe o di un `>` block scalar.
    if (/^\s+\S/.test(line) && currentKey !== null) {
      const trimmed = line.trim();
      if (currentList) {
        if (trimmed === "-") continue;
        currentList.push(stripQuotes(trimmed));
      } else if (currentList === null && typeof fields[currentKey] === "string") {
        fields[currentKey] = `${fields[currentKey]} ${trimmed}`.trim();
      }
      continue;
    }

    const match = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    currentKey = key;

    if (rawValue === "") {
      // Può essere una lista su righe successive: la raccogliamo e la
      // materializziamo quando finisce.
      currentList = [];
      fields[key] = currentList;
      continue;
    }
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      fields[key] = parseInlineList(rawValue);
      currentList = null;
      continue;
    }
    if (rawValue === ">" || rawValue === "|") {
      fields[key] = "";
      currentList = null;
      continue;
    }
    fields[key] = stripQuotes(rawValue);
    currentList = null;
  }

  return { fields, body: lines.slice(end + 1).join("\n"), bodyStartLine: end + 1 };
}

/** Lista inline `["a", "b"]` → array di stringhe. */
function parseInlineList(raw: string): string[] {
  const inner = raw.slice(1, -1).trim();
  if (!inner) return [];
  return inner
    .split(",")
    .map((part) => stripQuotes(part.trim()))
    .filter((part) => part.length > 0);
}

/** Rimuove le virgolette attorno a un valore YAML. */
function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && /^".*"$/.test(trimmed)) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  if (trimmed.length >= 2 && /^'.*'$/.test(trimmed)) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

/** Campo scalare del frontmatter (stringa o lista → stringa vuota). */
export function frontmatterString(
  fields: Record<string, string | string[]>,
  key: string,
): string {
  const value = fields[key];
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : "";
}

/** Campo lista del frontmatter (scalare → lista con un elemento). */
export function frontmatterList(
  fields: Record<string, string | string[]>,
  key: string,
): string[] {
  const value = fields[key];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

const VALID_RISKS: SkillRisk[] = ["low", "medium", "high"];
const VALID_OWNERS = ["official", "community", "user"];

/** `kebab-case` non vuoto, max 64 caratteri. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ValidatedSkill = {
  slug: string;
  name: string;
  description: string;
  version: string;
  locale: string;
  agents: string[];
  integrationsRequired: string[];
  integrationsOptional: string[];
  permissions: string[];
  risk: SkillRisk;
  body: string;
};

/**
 * Valida il contenuto di un `SKILL.md`.
 *
 * Restituisce TUTTI i problemi (non il primo): l'utente deve poter correggere
 * tutto in un colpo. `ok` è false se c'è almeno un `error`.
 */
export function validateSkillMarkdown(source: string): {
  ok: boolean;
  skill: ValidatedSkill | null;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  const bytes = new TextEncoder().encode(source).length;

  if (bytes > LIMITS.maxSkillMdBytes) {
    issues.push({
      level: "error",
      field: "SKILL.md",
      message: `Il file è troppo grande (${formatBytes(bytes)}): il massimo è ${formatBytes(LIMITS.maxSkillMdBytes)}.`,
    });
  }

  const parsed = parseFrontmatter(source);
  if (!parsed) {
    issues.push({
      level: "error",
      field: "frontmatter",
      message:
        "Frontmatter mancante o non chiuso: il file deve iniziare con --- e chiudersi con un altro ---.",
    });
    return { ok: false, skill: null, issues };
  }

  const { fields, body } = parsed;

  // --- name -------------------------------------------------------------
  const slug = frontmatterString(fields, "name").trim();
  if (!slug) {
    issues.push({ level: "error", field: "name", message: "Campo `name` obbligatorio." });
  } else if (!SLUG_RE.test(slug) || slug.length > 64) {
    issues.push({
      level: "error",
      field: "name",
      message: "`name` deve essere kebab-case (es. tracking-ordine), max 64 caratteri.",
    });
  }

  // --- description ------------------------------------------------------
  const description = frontmatterString(fields, "description").trim();
  if (!description) {
    issues.push({
      level: "error",
      field: "description",
      message: "Campo `description` obbligatorio: è il testo che l'agente legge per decidere se attivare la skill.",
    });
  } else if (description.length < 20) {
    issues.push({
      level: "warning",
      field: "description",
      message: "La description è troppo breve per far decidere bene l'agente: descrivi cosa fa e quando usarla.",
    });
  }

  // --- version / locale -------------------------------------------------
  const version = frontmatterString(fields, "version").trim() || "1.0.0";
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    issues.push({
      level: "warning",
      field: "version",
      message: `Versione "${version}" non semantica: usa x.y.z (es. 1.0.0).`,
    });
  }
  const locale = frontmatterString(fields, "locale").trim() || "it";
  if (!/^[a-z]{2}(-[A-Za-z]{2})?$/.test(locale)) {
    issues.push({
      level: "warning",
      field: "locale",
      message: `Locale "${locale}" non riconosciuto: usa un codice come it o en.`,
    });
  }

  // --- risk -------------------------------------------------------------
  const rawRisk = frontmatterString(fields, "risk_level").trim() || "low";
  const risk = (VALID_RISKS as string[]).includes(rawRisk) ? (rawRisk as SkillRisk) : "low";
  if (!(VALID_RISKS as string[]).includes(rawRisk)) {
    issues.push({
      level: "error",
      field: "risk_level",
      message: `risk_level "${rawRisk}" non valido: usa low, medium o high.`,
    });
  }

  // --- owner ------------------------------------------------------------
  const owner = frontmatterString(fields, "owner").trim();
  if (owner && !(VALID_OWNERS as string[]).includes(owner)) {
    issues.push({
      level: "warning",
      field: "owner",
      message: `owner "${owner}" sconosciuto: le skill utente vengono comunque salvate come "user".`,
    });
  }

  // --- corpo ------------------------------------------------------------
  const bodyLines = body.split("\n").filter((l) => l.trim().length > 0).length;
  if (bodyLines > LIMITS.maxLines) {
    issues.push({
      level: "error",
      field: "SKILL.md",
      message: `Il corpo è troppo lungo (${bodyLines} righe): il massimo è ${LIMITS.maxLines}. Sposta i riferimenti lunghi in references/.`,
    });
  }
  if (!body.trim()) {
    issues.push({
      level: "error",
      field: "SKILL.md",
      message: "Il corpo della skill è vuoto: serve almeno la procedura.",
    });
  }

  // --- contenuti pericolosi --------------------------------------------
  for (const issue of scanDangerousContent(source)) issues.push(issue);

  const hasError = issues.some((i) => i.level === "error");
  if (hasError) return { ok: false, skill: null, issues };

  return {
    ok: true,
    issues,
    skill: {
      slug,
      // Il nome leggibile viene dal primo heading del corpo: nei SKILL.md reali
      // è lì, e obbligare di ripeterlo nel frontmatter duplicherebbe il dato.
      name: firstHeading(body) || slug,
      description,
      version,
      locale,
      agents: frontmatterList(fields, "agents"),
      integrationsRequired: frontmatterList(fields, "integrations_required"),
      integrationsOptional: frontmatterList(fields, "integrations_optional"),
      permissions: frontmatterList(fields, "permissions"),
      risk,
      body,
    },
  };
}

/** Pattern che non devono mai arrivare in una skill caricata da un utente. */
const DANGEROUS_PATTERNS: { re: RegExp; field: string; message: string }[] = [
  {
    // Assegnazioni esplicite di un segreto: `API_KEY = "..."`, `token: ...`,
    // `secret=...`. Il nome del segreto conta, non il valore: se qualcuno
    // scrive `api_key = $MY_VAR` non è un segreto nel file e non deve essere
    // bloccato, quindi non richiediamo un valore tipo chiave.
    re: /\b(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|secret[_-]?key|client[_-]?secret|private[_-]?key|password|passwd)\b\s*[:=]\s*["']?[^\s"']{12,}/gi,
    field: "secrets",
    message:
      "Il file assegna un segreto (API key, token, password). Rimuovilo: le competenze non devono contenere segreti.",
  },
  {
    // Formati di chiave con prefisso riconoscibile, anche senza assegnazione:
    // `sk_live_...`, `ghp_...`, `AKIA...`, `xoxb-...`.
    re: /\b(?:sk|pk|rk)_(?:live|test|prod)_[a-zA-Z0-9]{12,}\b/g,
    field: "secrets",
    message:
      "Il file contiene una stringa che sembra una chiave API o un token. Rimuovila: le competenze non devono contenere segreti.",
  },
  {
    re: /\bgh[pousr]_[a-zA-Z0-9]{20,}\b/g,
    field: "secrets",
    message: "Il file contiene un token GitHub. Rimuovilo.",
  },
  {
    re: /\bxox[baprs]-[a-zA-Z0-9-]{10,}\b/g,
    field: "secrets",
    message: "Il file contiene un token Slack. Rimuovilo.",
  },
  {
    re: /\bAKIA[0-9A-Z]{16}\b/g,
    field: "secrets",
    message: "Il file contiene una chiave AWS. Rimuovila.",
  },
  {
    re: /\bsupabase_(?:anon|service)_role_key\b\s*[:=]/gi,
    field: "secrets",
    message: "Il file contiene un riferimento a una chiave Supabase. Rimuovilo.",
  },
  {
    re: /\bBearer\s+[a-zA-Z0-9._-]{24,}/g,
    field: "secrets",
    message: "Il file contiene un Authorization header con un token. Rimuovilo.",
  },
  {
    // Collegamento da paese ostile: la skill non deve poter dirottare il
    // traffico dell'agente verso un endpoint controllato da terzi.
    re: /https?:\/\/(?:[a-z0-9-]+\.)*(?:bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly|ngrok\.io|requestbin\.\w+)/gi,
    field: "external-link",
    message:
      "Il file contiene un link abbreviato o di tunnel: usa l'URL diretto e verificabile.",
  },
];

/**
 * Scansiona il contenuto alla ricerca di pattern pericolosi.
 *
 * Esposta separatamente perché la stessa scansione va ripetuta sui file
 * `scripts/` del pacchetto, dove i link esterni sono del tutto vietati.
 */
export function scanDangerousContent(source: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const { re, field, message } of DANGEROUS_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(source)) {
      issues.push({ level: "error", field, message });
    }
  }
  return issues;
}

/**
 * Valida i file di uno script dentro il pacchetto.
 *
 * Regole più strette del SKILL.md: nessun link esterno, nessuna shell
 * pipe-remota, nessun riferimento a variabili d'ambiente con segreti. Uno
 * script che esce dalla sandbox non è uno script didattico.
 */
export function validateScriptFile(path: string, content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (new TextEncoder().encode(content).length > LIMITS.maxFileBytes) {
    issues.push({
      level: "error",
      field: path,
      message: `File troppo grande (max ${formatBytes(LIMITS.maxFileBytes)}).`,
    });
  }

  const externalUrl = /https?:\/\//gi;
  if (externalUrl.test(content)) {
    issues.push({
      level: "error",
      field: path,
      message: "Gli script non possono contenere link esterni: solo calcoli locali e deterministici.",
    });
  }

  const dangerousShell = [
    /\brm\s+-rf?\s+\//,
    /\bcurl\b[^\n]*\|\s*(?:ba)?sh/,
    /\bwget\b[^\n]*\|\s*(?:ba)?sh/,
    /\beval\s*\(/,
    /\bchild_process\b/,
    /\bprocess\.env\b/,
  ];
  for (const re of dangerousShell) {
    if (re.test(content)) {
      issues.push({
        level: "error",
        field: path,
        message: "Lo script contiene un comando non consentito (shell remota, eval, accesso a env).",
      });
    }
  }

  issues.push(...scanDangerousContent(content));
  return issues;
}

/** Estensioni ammesse nel pacchetto. */
export const ALLOWED_EXTENSIONS = [".md", ".txt", ".csv", ".json", ".yaml", ".yml", ".py", ".js", ".sh"] as const;

/** Il percorso di un file è accettabile? Nessun path traversal, no hidden. */
export function validatePackagePath(path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const normalized = path.replace(/\\/g, "/");

  if (normalized.includes("..")) {
    issues.push({
      level: "error",
      field: path,
      message: "Il pacchetto contiene un percorso con `..`: non è consentito.",
    });
  }
  if (normalized.startsWith("/") || /^[a-z]:/i.test(normalized)) {
    issues.push({
      level: "error",
      field: path,
      message: "Il pacchetto contiene un percorso assoluto: usa percorsi relativi.",
    });
  }
  const ext = normalized.slice(normalized.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    issues.push({
      level: "error",
      field: path,
      message: `Estensione non consentita (${ext || "nessuna"}). Ammesse: ${ALLOWED_EXTENSIONS.join(", ")}.`,
    });
  }
  return issues;
}

/** Primo heading Markdown del corpo (`# Titolo`). */
function firstHeading(body: string): string | null {
  const match = /^#\s+(.+)$/m.exec(body);
  return match ? match[1].trim() : null;
}

/** Byte in formato leggibile. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Riepilogo leggibile dei problemi, per la UI di upload. */
export function formatIssues(issues: ValidationIssue[]): string[] {
  return issues.map((i) => `[${i.level === "error" ? "errore" : "avviso"}] ${i.field}: ${i.message}`);
}
