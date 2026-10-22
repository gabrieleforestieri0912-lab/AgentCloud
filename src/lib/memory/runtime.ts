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
import type { MemoryConfig } from "./config";
import { getAgentMemoryConfig } from "./config-store";
import { getEmbeddingProvider } from "./embeddings";
import { createLlmMemoryExtractor } from "./extraction";
import type { MemoryExtractor } from "./extraction";
import { createMemoryService } from "./service";
import type { MemoryService } from "./service";
import { createLlmConversationSummarizer } from "./summarizer";
import type { ConversationSummarizer } from "./summarizer";
import { createMemoryStore } from "./supabase-store";

/** Servizi costruiti in questo processo, per (tenant, agente). */
const services = new Map<
  string,
  { service: MemoryService; persistent: boolean; config: MemoryConfig }
>();

/**
 * Restituisce il servizio della memoria di un agente.
 *
 * La configurazione è per tenant: due account che usano lo stesso agente
 * possono avere parametri diversi, quindi il servizio è memorizzato per
 * (tenant, agente).
 *
 * `persistent` dice se la memoria sopravvive al processo: con `false` il
 * servizio usa lo store in memoria (modalità degradata).
 */
export async function getMemoryService(
  agentId: string,
  tenantId?: string,
): Promise<{ service: MemoryService; persistent: boolean; config: MemoryConfig }> {
  const key = `${tenantId ?? ""}:${agentId}`;
  const cached = services.get(key);
  if (cached) return cached;

  const { store, persistent } = await createMemoryStore();
  const overrides = tenantId
    ? await getAgentMemoryConfig(tenantId, agentId)
    : null;
  const config = resolveMemoryConfig(agentId, overrides);
  const service = createMemoryService({
    store,
    config,
    embeddings: getEmbeddingProvider(),
    summarizer: createLlmConversationSummarizer(),
  });
  const entry = { service, persistent, config };
  services.set(key, entry);
  return entry;
}

/**
 * Dimentica il servizio in cache di un agente.
 *
 * Va chiamata quando la configurazione cambia: il servizio tiene dentro la
 * configurazione con cui è stato costruito.
 */
export function resetMemoryService(tenantId: string, agentId: string): void {
  services.delete(`${tenantId}:${agentId}`);
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
