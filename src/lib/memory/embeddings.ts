/**
 * Embeddings of the memory items.
 *
 * The project has no embedding provider (the xKiro gateway does not expose
 * `/embeddings`), so the default provider is a LOCAL, deterministic one:
 * signed feature hashing over word unigrams, word bigrams and character
 * trigrams. It needs no key, no network and no new dependency, and it gives a
 * stable similarity for the same text (so the same memory item always looks
 * the same in every request).
 *
 * The provider is pluggable: setting `EMBEDDINGS_API_KEY` switches to an
 * OpenAI-compatible HTTP provider, without touching the rest of the code.
 *
 * Server-only: the HTTP provider reads API keys from the environment.
 */

/** A provider able to turn texts into vectors. */
export interface EmbeddingProvider {
  /** Name of the provider, for logs and diagnostics. */
  readonly name: string;
  /** Length of the produced vectors. */
  readonly dimensions: number;
  /** Embeds a batch of texts, in the same order. */
  embed(texts: string[]): Promise<number[][]>;
}

/** Dimensions of the local provider. */
export const LOCAL_EMBEDDING_DIMENSIONS = 256;

/**
 * Normalizes a text before hashing: lowercase, without accents, without
 * punctuation, with collapsed whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** FNV-1a 32 bit hash. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // hash * 16777619, kept in the 32 bit range
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Extracts the features of a text: words, word pairs and character trigrams.
 *
 * The trigrams make the similarity robust to typos and to morphological
 * variants ("pomeriggio" vs "pomeriggio").
 */
export function extractFeatures(text: string): Map<string, number> {
  const features = new Map<string, number>();
  const normalized = normalizeText(text);
  if (!normalized) return features;

  const words = normalized.split(" ").filter(Boolean);
  for (const word of words) {
    features.set(`w:${word}`, (features.get(`w:${word}`) ?? 0) + 1);
    if (word.length >= 4) {
      for (let i = 0; i <= word.length - 3; i++) {
        const gram = `c:${word.slice(i, i + 3)}`;
        features.set(gram, (features.get(gram) ?? 0) + 1);
      }
    }
  }
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `b:${words[i]} ${words[i + 1]}`;
    features.set(bigram, (features.get(bigram) ?? 0) + 1);
  }
  return features;
}

/**
 * Local deterministic embedding provider (feature hashing).
 *
 * Weights: word unigrams count fully, word bigrams a bit less, character
 * trigrams less still: they are there to make the match tolerant, not to
 * dominate the score.
 */
export function createLocalEmbeddingProvider(
  dimensions: number = LOCAL_EMBEDDING_DIMENSIONS,
): EmbeddingProvider {
  return {
    name: "local-hash",
    dimensions,
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map((text) => embedLocally(text, dimensions));
    },
  };
}

/** Embeds one text with the local algorithm. */
export function embedLocally(
  text: string,
  dimensions: number = LOCAL_EMBEDDING_DIMENSIONS,
): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const features = extractFeatures(text);
  for (const [feature, count] of features) {
    const hash = fnv1a(feature);
    const index = hash % dimensions;
    // The second hash bit decides the sign, so different features landing on
    // the same bucket cancel out instead of piling up.
    const sign = (hash >>> 13) & 1 ? 1 : -1;
    const weight =
      feature.startsWith("w:") ? 1 + Math.log(count) : feature.startsWith("b:") ? 0.6 : 0.35;
    vector[index] += sign * weight;
  }
  return normalizeVector(vector);
}

/** L2 normalization. A zero vector stays zero. */
export function normalizeVector(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vector;
  return vector.map((value) => value / norm);
}

/** Options of the OpenAI-compatible provider. */
export type OpenAICompatibleEmbeddingOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  dimensions?: number;
};

/**
 * OpenAI-compatible embedding provider (`POST {baseUrl}/embeddings`).
 *
 * Used when `EMBEDDINGS_API_KEY` is set: no new dependency, only `fetch`.
 */
export function createOpenAICompatibleEmbeddingProvider(
  options: OpenAICompatibleEmbeddingOptions,
): EmbeddingProvider {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  return {
    name: "openai-compatible",
    dimensions: options.dimensions ?? 1536,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      const res = await fetch(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: options.model, input: texts }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          `Embeddings API error ${res.status}: ${detail.slice(0, 300)}`,
        );
      }
      const json = (await res.json()) as {
        data?: { embedding?: number[] }[];
      };
      const rows = json.data ?? [];
      if (rows.length !== texts.length) {
        throw new Error(
          `Embeddings API returned ${rows.length} vectors for ${texts.length} texts.`,
        );
      }
      return rows.map((row) => normalizeVector(row.embedding ?? []));
    },
  };
}

/** True when an external embedding provider is configured. */
export function hasExternalEmbeddingProvider(): boolean {
  return Boolean(
    process.env.EMBEDDINGS_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.LLM_API_KEY,
  );
}

/**
 * Returns the configured provider.
 *
 * With an API key the HTTP provider is used, otherwise the local one: the
 * memory keeps working (with a lexical similarity) even without credentials.
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  const apiKey =
    process.env.EMBEDDINGS_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY;
  if (apiKey) {
    const baseUrl =
      process.env.EMBEDDINGS_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1";
    const model =
      process.env.EMBEDDINGS_MODEL ||
      process.env.OPENAI_EMBEDDING_MODEL ||
      "text-embedding-3-small";
    return createOpenAICompatibleEmbeddingProvider({ apiKey, baseUrl, model });
  }
  return createLocalEmbeddingProvider();
}
