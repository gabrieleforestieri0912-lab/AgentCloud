/**
 * Configuration of the agent memory.
 *
 * Every knob has a default (see `DEFAULT_MEMORY_CONFIG`) and can be changed
 * per agent through the environment (global) and through the per-agent
 * overrides (database, added in phase 5).
 *
 * The names are English because the whole project names things in English;
 * the comments are in Italian like everywhere else.
 */

/** Configuration of the memory of one agent. */
export type MemoryConfig = {
  /** Master switch: when false the agent never reads nor writes memory. */
  enabled: boolean;
  /** Days after which an item expires (0 = never expires). */
  ttlDays: number;
  /** How many items are retrieved and injected into the prompt. */
  retrievalK: number;
  /** Maximum number of tokens of the `<memoria>` block. */
  tokenBudget: number;
  /** Token threshold that triggers the summary of the short-term memory. */
  shortTermTokenThreshold: number;
  /** Similarity above which a new fact updates an existing item. */
  dedupeThreshold: number;
  /** Default importance of a new item. */
  defaultImportance: number;
  /** Items with importance below this value decay faster. */
  lowImportanceThreshold: number;
  /** Days after which a low importance item expires if never used. */
  lowImportanceTtlDays: number;
};

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Default configuration, overridable with the environment. */
export function defaultMemoryConfig(): MemoryConfig {
  return {
    enabled: (process.env.MEMORY_ENABLED ?? "true").toLowerCase() !== "false",
    ttlDays: num(process.env.MEMORY_TTL_DAYS, 90),
    retrievalK: num(process.env.MEMORY_RETRIEVAL_K, 5),
    tokenBudget: num(process.env.MEMORY_TOKEN_BUDGET, 800),
    shortTermTokenThreshold: num(process.env.MEMORY_SHORT_TERM_TOKENS, 4000),
    dedupeThreshold: num(process.env.MEMORY_DEDUPE_THRESHOLD, 0.92),
    defaultImportance: num(process.env.MEMORY_DEFAULT_IMPORTANCE, 0.5),
    lowImportanceThreshold: num(process.env.MEMORY_LOW_IMPORTANCE, 0.3),
    lowImportanceTtlDays: num(process.env.MEMORY_LOW_IMPORTANCE_TTL_DAYS, 14),
  };
}

/**
 * Resolves the configuration of an agent.
 *
 * The per-agent overrides win over the environment; the environment wins
 * over the defaults.
 */
export function resolveMemoryConfig(
  agentId: string,
  overrides?: Partial<MemoryConfig> | null,
): MemoryConfig {
  const base = defaultMemoryConfig();
  if (!overrides) return base;
  const merged: MemoryConfig = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null) continue;
    (merged as unknown as Record<string, unknown>)[key] = value;
  }
  return merged;
}

/**
 * Computes the expiration of a new item.
 *
 * An item with a low importance, that has never been used, expires sooner:
 * the memory of the agent must not fill up with trivia.
 */
export function computeExpiry(
  config: MemoryConfig,
  importance: number,
  createdAt: Date = new Date(),
): string | null {
  const days =
    importance < config.lowImportanceThreshold
      ? config.lowImportanceTtlDays
      : config.ttlDays;
  if (!days || days <= 0) return null;
  return new Date(createdAt.getTime() + days * 86_400_000).toISOString();
}
