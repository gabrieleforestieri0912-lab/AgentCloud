import { createTwoFilesPatch, diffLines } from "diff";

/**
 * Modifiche ai file della sessione.
 *
 * Origine dati: gli eventi SSE `file` di `/api/agent/run` portano ogni volta
 * il contenuto COMPLETO — la prima vista è "creato", le successive sono
 * "modificato" con diff contro la versione precedente. Niente "eliminato"
 * dall'agente oggi (non esiste il tool): il tipo c'è per il futuro e per
 * l'undo di una creazione.
 *
 * Le versioni vivono qui in memoria e nella sessione salvata; la durabilità
 * server passa per POST/DELETE `/api/chat/files` (vedi api.ts), mai per
 * magie locali.
 */

export type FileOp = "created" | "modified" | "deleted";

export type TrackedFile = {
  filename: string;
  /** Tutte le versioni viste, in ordine. head = indice di quella corrente. */
  versions: string[];
  /** Indice in versions, -1 = eliminato (undo di una creazione). */
  head: number;
  op: FileOp;
  added: number;
  removed: number;
};

/** Transizione di undo/redo: porta head da `from` a `to` (-1 = eliminato). */
export type FileTransition = { filename: string; from: number; to: number };

function countDiff(oldText: string, newText: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const part of diffLines(oldText, newText)) {
    const lines = part.count ?? 0;
    if (part.added) added += lines;
    else if (part.removed) removed += lines;
  }
  return { added, removed };
}

function statsFor(versions: string[], head: number): { op: FileOp; added: number; removed: number } {
  if (head < 0) {
    const prev = versions[0] ?? "";
    const { removed } = countDiff(prev, "");
    return { op: "deleted", added: 0, removed };
  }
  if (head === 0) {
    const { added } = countDiff("", versions[0] ?? "");
    return { op: "created", added, removed: 0 };
  }
  const { added, removed } = countDiff(versions[head - 1] ?? "", versions[head] ?? "");
  return { op: "modified", added, removed };
}

/**
 * Registra un evento `file` dallo stream. Ritorna lo stato aggiornato e, se
 * c'è un cambiamento reale, la transizione da impilare per undo/redo.
 * Contenuto identico al precedente = nessun cambiamento (lo stream può
 * ripetere lo stesso file).
 */
export function applyFileEvent(
  files: TrackedFile[],
  filename: string,
  content: string,
): { files: TrackedFile[]; transition: FileTransition | null } {
  const existing = files.find((f) => f.filename === filename);
  if (!existing) {
    const versions = [content];
    const stats = statsFor(versions, 0);
    return {
      files: [...files, { filename, versions, head: 0, ...stats }],
      transition: { filename, from: -1, to: 0 },
    };
  }
  const current = existing.head >= 0 ? (existing.versions[existing.head] ?? "") : "";
  if (current === content) return { files, transition: null };
  // Se era eliminato (undo di creazione), il nuovo contenuto lo resuscita.
  const versions = [...existing.versions, content];
  const head = versions.length - 1;
  const stats = statsFor(versions, head);
  return {
    files: files.map((f) => (f.filename === filename ? { ...f, versions, head, ...stats } : f)),
    transition: { filename, from: existing.head, to: head },
  };
}

/** Applica una transizione (undo o redo) ricalcolando le statistiche. */
export function applyTransition(files: TrackedFile[], t: FileTransition): TrackedFile[] {
  return files.map((f) => {
    if (f.filename !== t.filename) return f;
    const stats = statsFor(f.versions, t.to);
    return { ...f, head: t.to, ...stats };
  });
}

/** Contenuto corrente di un file, o null se eliminato/sconosciuto. */
export function currentContent(files: TrackedFile[], filename: string): string | null {
  const f = files.find((x) => x.filename === filename);
  if (!f || f.head < 0) return null;
  return f.versions[f.head] ?? null;
}

export function fileTotals(files: TrackedFile[]): { count: number; added: number; removed: number } {
  let added = 0;
  let removed = 0;
  let count = 0;
  for (const f of files) {
    if (f.head < 0) continue;
    count++;
    added += f.added;
    removed += f.removed;
  }
  return { count, added, removed };
}

export type DiffLine = { kind: " " | "+" | "-" | "@"; text: string };

/** Diff unificato tra due versioni, pronto da renderizzare colorato. */
export function unifiedDiff(filename: string, oldText: string, newText: string): DiffLine[] {
  const patch = createTwoFilesPatch(`a/${filename}`, `b/${filename}`, oldText, newText, "precedente", "attuale", {
    context: 3,
  });
  return patch
    .split("\n")
    .filter((l) => !l.startsWith("---") && !l.startsWith("+++") && l !== "")
    .map((l): DiffLine => {
      if (l.startsWith("@@")) return { kind: "@", text: l };
      if (l.startsWith("+")) return { kind: "+", text: l.slice(1) };
      if (l.startsWith("-")) return { kind: "-", text: l.slice(1) };
      return { kind: " ", text: l.startsWith(" ") ? l.slice(1) : l };
    });
}

/** Titolo automatico della chat: prime parole del primo messaggio (max 6). */
export function makeTitle(text: string): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).slice(0, 6);
  const title = words.join(" ");
  return title.length > 60 ? `${title.slice(0, 60)}…` : title;
}
