/**
 * Logica pura degli artifact tool (create/update/rewrite).
 *
 * Niente rete, niente DB, niente import `@/`: testabile con
 * `node --experimental-strip-types`. Gli handler nei tool usano queste
 * funzioni; i messaggi d'errore sono già pronti per il modello (dicono cosa
 * correggere, non solo cosa è sbagliato).
 */

export type ArtifactType =
  | "html"
  | "markdown"
  | "code"
  | "svg"
  | "mermaid"
  | "csv"
  | "text";

const VALID_TYPES: ArtifactType[] = [
  "html",
  "markdown",
  "code",
  "svg",
  "mermaid",
  "csv",
  "text",
];

/** Come per i blocchi file: oltre i 2 MB non si va (stesso tetto della chat). */
export const ARTIFACT_MAX_BYTES = 2 * 1024 * 1024;
/** Quanto contenuto file il client passa nel contesto tool (oltre si tronca). */
export const ARTIFACT_CONTEXT_CHARS = 100_000;

export function isValidArtifactType(t: string): t is ArtifactType {
  return (VALID_TYPES as string[]).includes(t);
}

/** Id stabili per riuso/versione: kebab-case, come gli slug dei file. */
export function normalizeArtifactId(raw: unknown): string {
  const slug = String(raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "artifact";
}

export function defaultFileName(id: string, type: ArtifactType): string {
  const ext =
    type === "markdown" ? "md" : type === "code" ? "txt" : type === "text" ? "txt" : type;
  return `${id}.${ext}`;
}

export type StrEdit = { old_str: string; new_str: string };

/**
 * Semantica str_replace: `old_str` deve comparire ESATTAMENTE una volta.
 * Zero match = il modello ha citato male il testo; più match = ambiguo.
 * In entrambi i casi l'errore dice come proseguire (rewrite per i grandi cambi).
 */
export function applyStrReplace(
  content: string,
  edit: StrEdit,
): { ok: true; content: string } | { ok: false; error: string } {
  const { old_str, new_str } = edit;
  if (!old_str) {
    return { ok: false, error: "update_artifact: old_str is empty. Provide the exact text to replace." };
  }
  const first = content.indexOf(old_str);
  if (first === -1) {
    return {
      ok: false,
      error:
        "update_artifact: old_str not found verbatim (no changes applied). " +
        "Copy it exactly from the latest version, or use rewrite_artifact for large changes.",
    };
  }
  if (content.indexOf(old_str, first + old_str.length) !== -1) {
    return {
      ok: false,
      error:
        "update_artifact: old_str matches more than once (no changes applied). " +
        "Make old_str longer so it is unique, or use rewrite_artifact.",
    };
  }
  return {
    ok: true,
    content: content.slice(0, first) + new_str + content.slice(first + old_str.length),
  };
}

/** Applica una serie di edit in ordine; si ferma al primo errore. */
export function applyStrEdits(
  content: string,
  edits: StrEdit[],
): { ok: true; content: string; applied: number } | { ok: false; error: string; applied: number } {
  let current = content;
  let applied = 0;
  for (const edit of edits) {
    const r = applyStrReplace(current, edit);
    if (!r.ok) return { ok: false, error: r.error, applied };
    current = r.content;
    applied++;
  }
  return { ok: true, content: current, applied };
}

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Tronca il contenuto per il contesto tool, segnalandolo. */
export function truncateForContext(content: string): { text: string; truncated: boolean } {
  if (content.length <= ARTIFACT_CONTEXT_CHARS) return { text: content, truncated: false };
  return { text: content.slice(0, ARTIFACT_CONTEXT_CHARS), truncated: true };
}
