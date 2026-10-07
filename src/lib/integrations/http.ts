/**
 * Chiamate HTTP verso le API dei provider: un solo punto per timeout, backoff,
 * `Retry-After` e redazione degli errori (Phase 2, decisione 13).
 *
 * Prima non esisteva gestione del 429 su nessuna integrazione: ogni proxy
 * faceva `fetch` e riportava `429 Too Many Requests` al modello, che non aveva
 * modo di reagire. Qui i 429 e i 5xx ritentano da soli con backoff esponenziale
 * e rispettando l'header `Retry-After` quando il provider lo invia.
 *
 * I token non compaiono mai qui dentro: ogni proxy li mette nell'header e
 * riceve indietro solo testo/status. Gli errori riportano status e un estratto
 * del corpo già troncato, mai gli header della richiesta.
 */

import type { TokenUsage } from "./types";

export const DEFAULT_TIMEOUT_MS = 15_000;

/** Ritentiamo solo se la risposta è rientrata: un errore di rete non consuma budget. */
const DEFAULT_MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 300;
/** Tetto al backoff: oltre qualche secondo il modello riceverebbe un timeout. */
const MAX_BACKOFF_MS = 4_000;

export type ProviderRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Authorization già pronto. */
  headers?: Record<string, string>;
  /**
   * Corpo della richiesta. Accetta anche byte oltre alla stringa: Graph carica
   * i file generati (docx/xlsx/pptx) come binario, non come testo.
   */
  body?: string | Uint8Array;
  /**
   * True quando la risposta è un file (download da Graph). In quel caso il corpo
   * viene letto come byte e finisce in `bytes`, non in `text`: `res.text()`
   * corromperebbe un binario.
   */
  binary?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  /** Etichetta per gli errori, es. "WooCommerce". */
  providerLabel?: string;
};

/** Compone l'header Authorization in base al tipo di token del provider. */
export function authHeader(
  usage: TokenUsage,
  accessToken: string,
  secretToken?: string | null,
): string {
  if (usage === "keypair") {
    const secret = secretToken ?? "";
    const basic = Buffer.from(`${accessToken}:${secret}`, "utf8").toString("base64");
    return `Basic ${basic}`;
  }
  return `Bearer ${accessToken}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** `Retry-After` può essere secondi o una data HTTP; accettiamo entrambi. */
function retryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
}

export type ProviderResponse = {
  ok: boolean;
  status: number;
  /** Corpo come testo (i provider restituiscono quasi sempre JSON). */
  text: string;
  /** Byte del corpo, presenti solo con `binary: true`. */
  bytes?: Uint8Array;
  /** Corpo parsato come JSON, o `undefined` se non è JSON valido. */
  json?: unknown;
  /** Messaggio d'errore già pronto per il modello. */
  error?: string;
};

function truncate(s: string, max = 300): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/**
 * Esegue la richiesta con retry su 429/5xx e timeout via AbortController.
 * Non ritenta 4xx (tranne 429): un 401 o un 403 non si risolvono ripetendo.
 */
export async function providerRequest(
  url: string,
  opts: ProviderRequestOptions = {},
): Promise<ProviderResponse> {
  const {
    method = "GET",
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    providerLabel = "provider",
  } = opts;

  let last: ProviderResponse | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        // `BodyInit` non accetta il `Uint8Array<ArrayBufferLike>` di Node per
        // via della generic del buffer, ma `fetch` lo gestisce a runtime: è il
        // caso dell'upload binario su Graph.
        body: body as BodyInit | undefined,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : String(e);
      // Rete irraggiungibile: un tentativo in più può bastare (flapping DNS),
      // ma non è un errore del provider, quindi niente backoff esponenziale.
      if (attempt < maxRetries) {
        await sleep(BASE_BACKOFF_MS);
        continue;
      }
      return {
        ok: false,
        status: 0,
        text: "",
        error: `${providerLabel} network error: ${truncate(msg)}`,
      };
    }
    clearTimeout(timer);

    // Con `binary` il corpo è un file: leggiamo byte e, solo in caso di errore,
    // lo decodifichiamo come testo perché Graph risponde JSON anche sui 4xx/5xx.
    let bytes: Uint8Array | undefined;
    let text: string;
    if (opts.binary) {
      bytes = new Uint8Array(await res.arrayBuffer().catch(() => new ArrayBuffer(0)));
      text = res.ok ? "" : new TextDecoder().decode(bytes.subarray(0, 500));
    } else {
      text = await res.text().catch(() => "");
    }
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < maxRetries) {
      const backoff = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      await sleep(retryAfterMs(res.headers.get("retry-after")) ?? backoff);
      continue;
    }

    last = { ok: res.ok, status: res.status, text, bytes, json };
    if (!res.ok) {
      // 429 esaurito: il messaggio dice al modello che è un rate limit, non un bug.
      const detail = extractProviderMessage(json) || truncate(text) || res.statusText;
      last.error =
        res.status === 429
          ? `${providerLabel} rate limit reached (429). Retry later.`
          : `${providerLabel} API error ${res.status}: ${truncate(detail)}`;
    }
    return last;
  }

  return (
    last ?? {
      ok: false,
      status: 0,
      text: "",
      error: `${providerLabel} request failed`,
    }
  );
}

/** I provider mettono il messaggio in posti diversi: message/error/detail/title. */
function extractProviderMessage(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const j = json as Record<string, unknown>;
  for (const key of ["message", "error_description", "detail", "title", "error"]) {
    const v = j[key];
    if (typeof v === "string" && v.trim()) return v;
    // Airtable: { error: { type, message } }
    if (v && typeof v === "object") {
      const inner = (v as Record<string, unknown>).message;
      if (typeof inner === "string" && inner.trim()) return inner;
    }
  }
  return "";
}