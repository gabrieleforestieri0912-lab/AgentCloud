/**
 * Lettura dei parametri di query della API della memoria.
 *
 * Modulo puro (nessun import): i parametri si validano una volta sola, e
 * valgono per tutte le rotte.
 */

import { isMemoryType } from "./types";
import type { MemoryType } from "./types";

/** Tipo di memoria richiesto dalla query, se valido. */
export function readTypeParam(value: string | null): MemoryType | undefined {
  if (!value) return undefined;
  return isMemoryType(value) ? value : undefined;
}

/** Limite di risultati richiesto dalla query, con tetto massimo. */
export function readLimitParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}
