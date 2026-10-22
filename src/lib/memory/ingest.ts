/**
 * Ingestione della memoria a lungo termine.
 *
 * Dopo una conversazione i fatti estratti diventano memory item. Il percorso
 * è sempre lo stesso e sempre sicuro:
 *
 *   conversazione → filtro secreti → estrazione (LLM, JSON) → controllo
 *   secreti → deduplica → scrittura
 *
 * Se qualcosa fallisce l'ingestione restituisce zero e l'agente non se ne
 * accorge: la memoria è un extra, la risposta dell'agente è il prodotto.
 */

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

/**
 * Estrae i fatti da una conversazione e li scrive nella memoria.
 *
 * Non lancia mai: un errore qui non deve mai rompere la run.
 */
export async function ingestConversationMemory(
  options: IngestOptions,
): Promise<IngestResult> {
  const result: IngestResult = { extracted: 0, stored: 0, rejected: 0 };
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
    const facts = await extractor.extract(usable, {
      conversationId: options.conversationId,
    });
    result.extracted = facts.length;

    for (const fact of facts) {
      const saved = await service.add({
        scope,
        type: fact.type,
        content: fact.content,
        importance: fact.importance,
        sourceConversationId: options.conversationId ?? null,
        ...(options.expiresAt !== undefined
          ? { expiresAt: options.expiresAt }
          : {}),
      });
      if (saved) result.stored++;
      else result.rejected++;
    }
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
  });
  return result;
}
