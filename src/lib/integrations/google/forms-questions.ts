/**
 * Costruzione delle domande per la Google Forms API (v1).
 *
 * Modulo puro: dal formato semplice che il modello produce
 * ({title, type, options, required, description}) al JSON `questionItem`
 * della API. Testabile senza token né rete.
 *
 * Tipi supportati: text, paragraph, choice (radio), dropdown, checkbox,
 * scale, date. Altri tipi (time, file upload, video...) restano fuori di
 * proposito: l'upload file richiede Drive aggiuntivo e i flussi Lead/HR
 * coperti dal prodotto non ne hanno bisogno.
 */

export type FormQuestionType =
  | "text"
  | "paragraph"
  | "choice"
  | "dropdown"
  | "checkbox"
  | "scale"
  | "date";

export type FormQuestionSpec = {
  title: unknown;
  /** Tipo grezzo (dal modello): la normalizzazione avviene in buildQuestionItem. */
  type: unknown;
  description?: unknown;
  required?: unknown;
  /** Opzioni per choice/dropdown/checkbox (min 1). */
  options?: unknown;
  /** Scala: estremi (default 1-5) con etichette opzionali. */
  scaleLow?: unknown;
  scaleHigh?: unknown;
  scaleLowLabel?: unknown;
  scaleHighLabel?: unknown;
};

export type FormsRequest = Record<string, unknown>;

const MAX_TITLE = 300;
const MAX_OPTIONS = 20;
const MAX_OPTION_LEN = 200;

function clean(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

/** Normalizza il tipo: alias comuni del modello verso i 7 tipi supportati. */
export function normalizeQuestionType(raw: unknown): FormQuestionType | null {
  const t = String(raw ?? "").toLowerCase().trim();
  if (["text", "short", "short_text", "riga", "breve"].includes(t)) return "text";
  if (["paragraph", "long", "long_text", "paragrafo", "testo_lungo"].includes(t)) return "paragraph";
  if (["choice", "radio", "single", "scelta", "multipla"].includes(t)) return "choice";
  if (["dropdown", "select", "menu", "tendina"].includes(t)) return "dropdown";
  if (["checkbox", "multiple", "multi", "caselle"].includes(t)) return "checkbox";
  if (["scale", "rating", "scala", "valutazione"].includes(t)) return "scale";
  if (["date", "data"].includes(t)) return "date";
  return null;
}

function cleanOptions(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[;\n]/) : [];
  return list
    .map((o) => clean(o, MAX_OPTION_LEN))
    .filter(Boolean)
    .slice(0, MAX_OPTIONS);
}

/**
 * Costruisce il `questionItem` per una domanda. Ritorna un errore leggibile
 * (per il modello) quando la specifica è invalida, invece di un 400 della API.
 */
export function buildQuestionItem(
  spec: FormQuestionSpec,
): { ok: true; item: FormsRequest } | { ok: false; error: string } {
  const title = clean(spec.title, MAX_TITLE);
  if (!title) return { ok: false, error: "Question requires a title." };
  const type = normalizeQuestionType(spec.type);
  if (!type) {
    return {
      ok: false,
      error: `Unknown question type "${String(spec.type ?? "")}". Use: text, paragraph, choice, dropdown, checkbox, scale, date.`,
    };
  }
  const required = spec.required === true;
  const description = clean(spec.description, 1000) || undefined;

  const base: FormsRequest = { title, ...(description ? { description } : {}) };

  if (type === "text" || type === "paragraph") {
    return {
      ok: true,
      item: {
        ...base,
        questionItem: { question: { required, textQuestion: { paragraph: type === "paragraph" } } },
      },
    };
  }
  if (type === "choice" || type === "dropdown" || type === "checkbox") {
    const options = cleanOptions(spec.options);
    if (options.length === 0) {
      return { ok: false, error: `Question "${title}" (${type}) requires at least one option.` };
    }
    const choiceType = type === "choice" ? "RADIO" : type === "dropdown" ? "DROPBOX" : "CHECKBOX";
    return {
      ok: true,
      item: {
        ...base,
        questionItem: {
          question: {
            required,
            choiceQuestion: { type: choiceType, options: options.map((value) => ({ value })), shuffle: false },
          },
        },
      },
    };
  }
  if (type === "scale") {
    const low = Number.isFinite(Number(spec.scaleLow)) ? Math.max(0, Math.min(10, Number(spec.scaleLow))) : 1;
    const high = Number.isFinite(Number(spec.scaleHigh)) ? Math.max(low + 1, Math.min(10, Number(spec.scaleHigh))) : 5;
    return {
      ok: true,
      item: {
        ...base,
        questionItem: {
          question: {
            required,
            scaleQuestion: {
              low,
              high,
              ...(clean(spec.scaleLowLabel, 100) ? { lowLabel: clean(spec.scaleLowLabel, 100) } : {}),
              ...(clean(spec.scaleHighLabel, 100) ? { highLabel: clean(spec.scaleHighLabel, 100) } : {}),
            },
          },
        },
      },
    };
  }
  // date
  return {
    ok: true,
    item: {
      ...base,
      questionItem: { question: { required, dateQuestion: { includeYear: true } } },
    },
  };
}

/**
 * Richiesta batchUpdate per aggiungere una domanda in coda al form
 * (indice = numero di item esistenti, passato dal chiamante che legge il form).
 */
export function buildAddQuestionRequest(
  spec: FormQuestionSpec,
  index: number,
): { ok: true; request: FormsRequest } | { ok: false; error: string } {
  const built = buildQuestionItem(spec);
  if (!built.ok) return built;
  return {
    ok: true,
    request: { createItem: { item: built.item, location: { index: Math.max(0, index) } } },
  };
}

/**
 * Riassunto leggibile delle risposte: conteggio totale + distribuzione per le
 * domande a scelta + ultime email testuali (capped, niente dump integrali).
 * Il calcolo è lato AgentCloud su dati scaricati (niente PII oltre il
 * necessario, niente identificativi utente esposti oltre le risposte stesse).
 */
export function summarizeResponses(
  formTitle: string,
  questions: { itemId: string; title: string }[],
  responses: { responseId: string; answers: Record<string, string[]> }[],
  maxExamples = 5,
): string {
  const lines = [`"${formTitle}": ${responses.length} risposte.`];
  if (responses.length === 0) return lines[0] + " Nessuna risposta ancora.";
  const titles = new Map(questions.map((q) => [q.itemId, q.title]));
  // Distribuzione per domanda (prime 10 domande).
  for (const q of questions.slice(0, 10)) {
    const counts = new Map<string, number>();
    let answered = 0;
    for (const r of responses) {
      const vals = r.answers[q.itemId];
      if (vals && vals.length > 0) {
        answered++;
        for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    if (answered === 0) continue;
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([v, n]) => `${v} (${n})`)
      .join(", ");
    lines.push(`- ${titles.get(q.itemId) ?? q.itemId}: ${answered}/${responses.length} risposte${top ? ` — ${top}` : ""}`);
  }
  // Esempi recenti (solo testo libero, max 5 risposte × prime 3 domande).
  const examples: string[] = [];
  for (const r of responses.slice(-maxExamples)) {
    const bits = questions
      .slice(0, 3)
      .map((q) => r.answers[q.itemId]?.[0])
      .filter(Boolean) as string[];
    if (bits.length > 0) examples.push(`  · ${bits.join(" | ").slice(0, 200)}`);
  }
  if (examples.length > 0) lines.push("Ultime risposte:\n" + examples.join("\n"));
  return lines.join("\n");
}
