/**
 * Ingestione della memoria a lungo termine.
 *
 * Dopo una conversazione i fatti estratti diventano memory item. Il percorso
 * è sempre lo stesso e sempre sicuro:
 *
 *   conversazione → filtro secreti → estrazione (LLM, JSON) → controllo
 *   secreti → deduplica → scrittura
 *
 * Il costo dell'estrazione è una chiamata al modello a fine run. Il client
 * manda in genere SEMPRE la storia intera della conversazione, quindi senza
 * protezioni ogni nuovo messaggio ri-proporrebbe tutto all'estrattore. Il
 * **watermark** evita questo spreco: lo stato di ciò che è già stato
 * elaborato sta in un item `meta` (conteggio + impronta del prefisso) e alla
 * run successiva:
 *
 *   - prefisso uguale e nessun messaggio nuovo → niente chiamata, zero costo;
 *   - prefisso uguale con messaggi nuovi → estrai SOLO il suffisso;
 *   - prefisso diverso (storia troncata o compattata) → estrazione completa.
 *
 * Se qualcosa fallisce l'ingestione restituisce zero e l'agente non se ne
 * accorge: la memoria è un extra, la risposta dell'agente è il prodotto.
 */

import { createHash } from "node:crypto";

import type { MemoryExtractor } from "./extraction";
import type { MemoryService } from "./service";
import { isValidScope } from "./scope";
import type { MemoryMessage, MemoryScope } from "./types";

/** Esito dell'ingestione. */
export type IngestResult = {
  /** Fatti proposti dal modello. */
  extracted: number;
  /** Fatti scritti (o aggiornati). */
  stored: number;
  /** Fatti scartati perché contenevano un segreto. */
  rejected: number;
  /**
   * Come l'estrazione è stata eseguita:
   *
   *   - `full`: tutta la conversazione al modello;
   *   - `incremental`: solo i messaggi dopo l'ultima estrazione;
   *   - `unchanged`: niente di nuovo dall'ultima estrazione, niente chiamata.
   *
   * `full` resta il fallback sicuro: quando il watermark non combacia si
   * ripaga una chiamata per intero, ma non si perde mai un fatto.
   */
  mode: "full" | "incremental" | "unchanged";
};

/** Opzioni dell'ingestione. */
export type IngestOptions = {
  /** Servizio della memoria. */
  service: MemoryService;
  /** Estrattore. Senza estrattore non viene ricordato nulla. */
  extractor: MemoryExtractor | null;
  /** Scope (tenant + agente + soggetto). */
  scope: MemoryScope;
  /** Messaggi della conversazione. */
  messages: MemoryMessage[];
  /** Id della conversazione di provenienza. */
  conversationId?: string;
  /**
   * Soglia di caratteri dell'utente sotto la quale non si estrae nulla: una
   * conversazione di due frasi non ha fatti da ricordare e il costo di una
   * chiamata al modello non vale la pena.
   */
  minUserChars?: number;
  /**
   * Scadenza esplicita per gli item di questa conversazione.
   *
   * Serve alle sessioni anonime: la memoria di un visitatore senza account
   * dura pochi giorni, non i 90 di un utente registrato.
   */
  expiresAt?: string | null;
  /** Audit logger. */
  logger?: (event: string, payload: Record<string, unknown>) => void;
};

/** Soglia predefinita di caratteri dell'utente. */
export const DEFAULT_MIN_USER_CHARS = 120;

/** Tipo dell'item che contiene lo stato dell'estrazione. */
const WATERMARK_TYPE = "meta" as const;

/** Prefisso del contenuto dell'item watermark. */
const WATERMARK_PREFIX = "extraction-watermark ";

/**
 * Watermark: impronta del prefisso già elaborato.
 *
 * `count` conta i messaggi (user + assistant) del prefisso, `digest` è
 * l'impronta di QUEL prefisso. Alla run successiva il digest del prefisso
 * corrente si confronta con quello salvato: se combacia, i messaggi oltre
 * `count` sono davvero nuovi.
 */
type WatermarkState = {
  count: number;
  digest: string;
};

/** Impronta stabile di una lista di messaggi. */
export function digestMessages(messages: MemoryMessage[]): string {
  const projected = messages
    .map((message) => `${message.role}\u0000${message.content}`)
    .join("\u0001");
  return createHash("sha256").update(projected).digest("hex");
}

/** Contenuto dell'item che marca lo stato dell'estrazione. */
export function watermarkToContent(state: WatermarkState): string {
  return `${WATERMARK_PREFIX}${state.digest} ${state.count}`;
}

/** Legge lo stato dell'estrazione dal contenuto di un item, se è valido. */
export function watermarkFromContent(content: string): WatermarkState | null {
  if (!content.startsWith(WATERMARK_PREFIX)) return null;
  const parts = content.slice(WATERMARK_PREFIX.length).split(" ");
  const digest = parts[0] ?? "";
  const count = Number(parts[1]);
  if (!/^[0-9a-f]{64}$/.test(digest)) return null;
  if (!Number.isInteger(count) || count < 0) return null;
  return { digest, count };
}

/** Legge lo stato dell'estrazione di uno scope, se esiste. */
async function readWatermark(
  service: MemoryService,
  scope: MemoryScope,
): Promise<WatermarkState | null> {
  const items = await service.list(scope, { types: [WATERMARK_TYPE], limit: 5 });
  for (const item of items) {
    const state = watermarkFromContent(item.content);
    if (state) return state;
  }
  return null;
}

/**
 * Estrae i fatti da una conversazione e li scrive nella memoria.
 *
 * Non lancia mai: un errore qui non deve mai rompere la run.
 */
export async function ingestConversationMemory(
  options: IngestOptions,
): Promise<IngestResult> {
  const result: IngestResult = {
    extracted: 0,
    stored: 0,
    rejected: 0,
    mode: "full",
  };
  const { service, extractor, scope, messages } = options;
  if (!extractor) return result;
  if (!isValidScope(scope)) return result;

  const usable = (messages ?? []).filter(
    (message) => message.content && message.content.trim(),
  );
  if (usable.length === 0) return result;

  const minUserChars = options.minUserChars ?? DEFAULT_MIN_USER_CHARS;
  const userChars = usable
    .filter((message) => message.role === "user")
    .reduce((total, message) => total + message.content.length, 0);
  if (userChars < minUserChars) return result;

  try {
    let mode: IngestResult["mode"] = "full";
    let fresh: MemoryMessage[] = usable;
    const watermark = await readWatermark(service, scope);
    if (watermark && watermark.count > 0 && usable.length >= watermark.count) {
      const prefixDigest = digestMessages(usable.slice(0, watermark.count));
      if (prefixDigest === watermark.digest) {
        if (usable.length === watermark.count) {
          // Nessun messaggio nuovo: niente da fare, nemmeno una chiamata.
          result.mode = "unchanged";
          options.logger?.("memory_ingest", {
            tenantId: scope.tenantId,
            agentId: scope.agentId,
            userId: scope.userId,
            extracted: 0,
            stored: 0,
            rejected: 0,
            mode: result.mode,
          });
          return result;
        }
        fresh = usable.slice(watermark.count);
        mode = "incremental";
      }
      // Prefisso diverso (truncato/compattato): resta il fallback full.
    }
    result.mode = mode;

    const facts = await extractor.extract(fresh, {
      conversationId: options.conversationId,
    });
    result.extracted = facts.length;

    // Un solo round trip di embeddings per tutto il batch, e una sola lista
    // di candidati per la deduplica; il resto vale come l'add singolo.
    const saved = await service.addMany(
      facts.map((fact) => ({
        scope,
        type: fact.type,
        content: fact.content,
        importance: fact.importance,
        sourceConversationId: options.conversationId ?? null,
        ...(options.expiresAt !== undefined
          ? { expiresAt: options.expiresAt }
          : {}),
      })),
    );
    for (const item of saved) {
      if (item) result.stored++;
      else result.rejected++;
    }

    // Il watermark copre TUTTA la conversazione vista finora, non solo il
    // pezzo appena elaborato: alla prossima run il confronto riparte da qui.
    // Il contenuto cambia a ogni run (contiene un digest), quindi NON ci si
    // può affidare alla deduplica per similarità: i watermark vecchi vengono
    // rimossi prima di scrivere quello nuovo — resta SEMPRE un solo item
    // meta per scope, senza dipendere dal provider di embeddings. Non scade
    // mai (senza scadenza le run future perderebbero il confronto).
    await service.deleteAll(scope, { types: [WATERMARK_TYPE] });
    await service.add({
      scope,
      type: WATERMARK_TYPE,
      content: watermarkToContent({
        count: usable.length,
        digest: digestMessages(usable),
      }),
      importance: 0.05,
      expiresAt: null,
    });
  } catch (error) {
    console.error("memory: ingestion failed", error);
    return result;
  }

  options.logger?.("memory_ingest", {
    tenantId: scope.tenantId,
    agentId: scope.agentId,
    userId: scope.userId,
    extracted: result.extracted,
    stored: result.stored,
    rejected: result.rejected,
    mode: result.mode,
  });
  return result;
}
