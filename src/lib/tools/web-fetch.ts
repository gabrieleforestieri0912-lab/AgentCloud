import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Lettura di una pagina web per gli agenti (tool `scrape_page`).
 *
 * Perché un modulo dedicato: la versione che stava dentro `agents/tools.ts`
 * faceva un `fetch` grezzo del body e basta. Restava aperta a tre problemi
 * concreti:
 *
 *  1. **SSRF**: il modello poteva chiedere `http://169.254.169.254/...` o
 *     `http://localhost:3000/...` e il server li serviva al posto loro,
 *     dicendo al modello cosa c'era dentro. Qui l'host viene risolto e
 *     le destinazioni private/riservate sono bloccate, redirect compresi.
 *  2. **Siti che rispondono 403** a uno User-Agent non umano: il tool
 *     restituiva "Forbidden" e l'agente concludeva che la pagina fosse
 *     vuota. Qui si manda un browser plausibile.
 *  3. **Pagine enormi o che non rispondono**: senza tetto e senza timeout
 *     una singola chiamata poteva tenere aperta la run per sempre.
 *
 * Nessuna dipendenza esterna: solo `fetch`, `dns` e `node:net`.
 */

const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 15_000;
/** Testo passato al modello: abbastanza per analizzare, poco per non affogare il contesto. */
const MAX_TEXT_CHARS = 12_000;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

/** Tipi di risposta da cui si può estrarre testo utile. */
const TEXT_CONTENT_TYPES = [
  "text/html",
  "text/plain",
  "text/markdown",
  "text/xml",
  "application/xhtml+xml",
  "application/xml",
  "application/json",
];

/** Nomi host che non devono mai essere raggiungibili dal server. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "instance-data",
]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return true; // forma sconosciuta: meglio bloccare
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = nums;
  if (a === 0 || a === 10 || a === 127) return true; // this-network, privata, loopback
  if (a === 169 && b === 254) return true; // link-local (metadata cloud)
  if (a === 172 && b >= 16 && b <= 31) return true; // privata
  if (a === 192 && b === 168) return true; // privata
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0) return true; // IETF protocol
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + riservati + broadcast
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  if (/^fe[89ab]/.test(lower)) return true; // link-local
  if (lower.startsWith("ff")) return true; // multicast
  const mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  return true;
}

/**
 * Verifica che l'host sia pubblico: solo http/https, niente nomi interni e
 * niente indirizzi che puntano alla rete interna (loopback, privata,
 * link-local, metadata).
 */
async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs can be fetched.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) throw new Error("The URL has no host.");
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error("That address is not reachable.");
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new Error("That address is not reachable.");
    }
    return;
  }
  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new Error(`The host ${host} could not be resolved.`);
  }
  if (!records.length) throw new Error(`The host ${host} could not be resolved.`);
  for (const record of records) {
    if (isPrivateAddress(record.address)) {
      throw new Error("That address is not reachable.");
    }
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

/** HTML → testo leggibile: via script, style e boilerplate, via i salti di riga. */
function htmlToText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeEntities(titleMatch?.[1]?.trim() ?? "");

  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe|canvas)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|article|li|tr|td|th|h[1-6]|header|footer|nav|aside|table|ul|ol|pre|blockquote|figure|figcaption)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const text = decodeEntities(cleaned)
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return { title, text };
}

function charsetFrom(contentType: string, html: string): string {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType)?.[1];
  if (fromHeader) return fromHeader.toLowerCase();
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(html)?.[1];
  return (fromMeta ?? "utf-8").toLowerCase();
}

export type FetchedPage = {
  url: string;
  finalUrl: string;
  title: string;
  text: string;
  truncated: boolean;
};

export type FetchPageResult =
  | { ok: true; page: FetchedPage }
  | { ok: false; error: string };

/**
 * Scarica una pagina e ne estrae il testo.
 * Segue i redirect a mano (massimo 3) per poter ricontrollare a ogni hop che
 * la destinazione resti pubblica.
 */
export async function fetchPage(rawUrl: string): Promise<FetchPageResult> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return {
      ok: false,
      error: "That is not a valid URL. Ask the user for the full link, including https://.",
    };
  }

  let response: Response | null = null;
  let finalUrl = url.toString();

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicUrl(url);
      finalUrl = url.toString();

      const res = await fetch(url, {
        redirect: "manual",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
          "Accept-Language": "en;q=0.9,*;q=0.5",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        if (!location) {
          response = res;
          break;
        }
        url = new URL(location, url);
        continue;
      }

      response = res;
      break;
    }

    if (!response) {
      return { ok: false, error: "The page redirected too many times." };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: `The server answered ${response.status} ${response.statusText}. The page could not be read.`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !TEXT_CONTENT_TYPES.some((t) => contentType.toLowerCase().includes(t))
    ) {
      return {
        ok: false,
        error: `This URL is not a web page (content type: ${contentType.split(";")[0].trim()}). Its content cannot be read as text.`,
      };
    }

    // Lettura a scatti con tetto: una pagina da 50 MB non deve occupare
    // la memoria del server.
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    let truncated = false;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) {
          truncated = true;
          await reader.cancel().catch(() => {});
          break;
        }
        chunks.push(value);
      }
    }
    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));

    let html = buffer.toString("utf8");
    const charset = charsetFrom(contentType, html);
    if (charset !== "utf-8" && charset !== "utf8") {
      try {
        html = new TextDecoder(charset).decode(buffer);
      } catch {
        html = buffer.toString("utf8");
      }
    }

    const { title, text } = htmlToText(html);
    if (!text) {
      return { ok: false, error: "The page was read but it has no readable text." };
    }

    return {
      ok: true,
      page: {
        url: rawUrl.trim(),
        finalUrl,
        title,
        text: text.slice(0, MAX_TEXT_CHARS),
        truncated: truncated || text.length > MAX_TEXT_CHARS,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("timed out") || message.includes("abort")) {
      return { ok: false, error: "The page took too long to answer and the request was stopped." };
    }
    return { ok: false, error: `The page could not be fetched: ${message}` };
  }
}

/**
 * Formato per il modello: cosa ha letto e da dove. I prezzi dell'errore
 * sono già nel messaggio, il modello deve solo riportarli.
 */
export function formatPageForModel(result: FetchPageResult): string {
  if (!result.ok) return `Fetch error: ${result.error}`;
  const { page } = result;
  const lines: string[] = [];
  if (page.title) lines.push(`Title: ${page.title}`);
  lines.push(`URL: ${page.finalUrl}`);
  lines.push(
    page.truncated
      ? "Content (truncated):"
      : "Content:",
  );
  lines.push(page.text);
  return lines.join("\n");
}
