/**
 * Runtime della memoria: costruisce (e riusa) il servizio e l'estrattore.
 *
 * Il servizio viene costruito una volta per agente e tenuto in memoria del
 * processo: il client Supabase e il provider di embeddings sono riutilizzabili
 * e non ha senso ricrearli a ogni richiesta.
 *
 * Se il database non è raggiungibile il servizio cade sullo store in memoria:
 * l'agente continua a rispondere, senza memoria persistente. `persistent`
 * dice al chiamante in quale dei due casi siamo.
 */

import { resolveMemoryConfig } from "./config";
import { getEmbeddingProvider } from "./embeddings";
import { createLlmMemoryExtractor } from "./extraction";
import type { MemoryExtractor } from "./extraction";
import { createMemoryService } from "./service";
import type { MemoryService } from "./service";
import { createLlmConversationSummarizer } from "./summarizer";
import type { ConversationSummarizer } from "./summarizer";
import { createMemoryStore } from "./supabase-store";

/** Servizi costruiti in questo processo, per agente. */
const services = new Map<string, { service: MemoryService; persistent: boolean }>();

/**
 * Restituisce il servizio della memoria di un agente.
 *
 * `persistent` dice se la memoria sopravvive al processo: con `false` il
 * servizio usa lo store in memoria (modalità degradata).
 */
export async function getMemoryService(
  agentId: string,
): Promise<{ service: MemoryService; persistent: boolean }> {
  const cached = services.get(agentId);
  if (cached) return cached;

  const { store, persistent } = await createMemoryStore();
  const service = createMemoryService({
    store,
    config: resolveMemoryConfig(agentId),
    embeddings: getEmbeddingProvider(),
    summarizer: createLlmConversationSummarizer(),
  });
  const entry = { service, persistent };
  services.set(agentId, entry);
  return entry;
}

/** Crea l'estrattore dei fatti. */
export function getMemoryExtractor(model?: string): MemoryExtractor {
  return createLlmMemoryExtractor({ model });
}

/** Crea il riassuntore delle conversazioni. */
export function getConversationSummarizer(
  model?: string,
): ConversationSummarizer {
  return createLlmConversationSummarizer({ model });
}
