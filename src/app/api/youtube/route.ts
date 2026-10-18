import { NextResponse } from "next/server";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

/**
 * API Route: /api/youtube
 *
 * GET /api/youtube?url=<link-youtube>&q=<testo-del-link>
 *
 * Perché esiste: le bolle della chat mostrano i link YouTube come card con
 * titolo e anteprima REALI del video, non come link di testo. Il client non
 * può chiedere direttamente a YouTube (CORS + il motore di ricerca richiede
 * scraping del markup, che è roba server-side), quindi questa route fa da
 * ponte:
 *
 * 1. link a un video (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`, `live/`)
 *    → si legge il titolo/autore/anteprima dall'oEmbed pubblico di YouTube
 *    (nessuna API key);
 * 2. link di ricerca (`results?search_query=`) oppure un ID che non esiste
 *    (i modelli inventano gli ID: l'oEmbed risponde 404) → si cerca su
 *    YouTube e si prende il primo video organico, così anche un link di
 *    ricerca o un ID fasullo diventa una card che punta a un video vero.
 *
 * Il "salvataggio" di un ID inventato dipende dal testo del link (`q`): la
 * query di ricerca di ripiego è costruita da quello, quindi il prompt chiede
 * etichette descrittive ("Come creare un prodotto Shopify (YouTube)").
 *
 * Niente dati privati escono da qui: risponde solo con metadati pubblici di
 * YouTube, quindi è anche raggiungibile senza sessione (le chat pubbliche
 * `/a/...` rendono markdown anch'esse).
 */

/** Host YouTube accettati: nient'altro, così la route non diventa un proxy. */
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

const VIDEO_ID_RE = /^[\w-]{11}$/;

/** UA browser + cookie SOCS: senza, YouTube risponde con la pagina consenso UE
 *  e il markup dei risultati non contiene mai i video. */
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
  Cookie: "SOCS=CAI",
};

const TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;
const RESULT_LIMIT_PER_HOUR = 60;

export type YouTubeCard = {
  id: string;
  url: string;
  title: string;
  author?: string;
  thumbnail?: string;
};

/** Cache in memoria: la stessa card ricompare in più bolle e in più chat,
 *  e senza tappo ogni messaggio rifarebbe due chiamate a YouTube. In
 *  serverless vale come tappo per istanza — il rate limit copre il resto. */
const cache = new Map<string, { value: YouTubeCard | null; expires: number }>();

/** ID del video da un link diretto, oppure null (link di ricerca, host strano). */
function videoIdFrom(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!YOUTUBE_HOSTS.has(u.hostname)) return null;
  if (u.hostname === "youtu.be") {
    const id = u.pathname.split("/")[1] ?? "";
    return VIDEO_ID_RE.test(id) ? id : null;
  }
  if (u.pathname === "/watch") {
    const id = u.searchParams.get("v") ?? "";
    return VIDEO_ID_RE.test(id) ? id : null;
  }
  const match = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
  return match ? match[1] : null;
}

/** Query di ricerca da un link `results?search_query=...`, oppure null. */
function searchQueryFrom(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!YOUTUBE_HOSTS.has(u.hostname) || u.pathname !== "/results") return null;
  const q = u.searchParams.get("search_query")?.trim();
  return q || null;
}

/** Pulisce il testo del link usato come query di ripiego: toglie il suffisso
 *  "(YouTube)" che il prompt chiede nelle etichette e scarta URL veri (una
 *  ricerca "https://..." non tornerebbe nulla di sensato). */
function cleanFallbackQuery(q: string | null): string | null {
  if (!q) return null;
  const cleaned = q.replace(/\(?\bYouTube\)?\s*$/i, "").trim();
  if (!cleaned || /^https?:\/\//i.test(cleaned)) return null;
  return cleaned.slice(0, 160);
}

/** Titolo, autore e anteprima di un video dal suo ID (oEmbed pubblico). */
async function fetchOembed(id: string): Promise<YouTubeCard | null> {
  const pageUrl = `https://www.youtube.com/watch?v=${id}`;
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`;
  const res = await fetch(endpoint, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };
  if (!data?.title) return null;
  return { id, url: pageUrl, title: data.title, author: data.author_name, thumbnail: data.thumbnail_url };
}

/** Primo video organico per una query: si legge il markup dei risultati e si
 *  prende il primo `videoRenderer` (Shorts e annunci usano altri tag, quindi
 *  restano fuori). */
async function searchFirstVideo(query: string): Promise<string | null> {
  const res = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/"videoRenderer":\{"videoId":"([\w-]{11})"/);
  return match ? match[1] : null;
}

/** Catena completa: video diretto → (se l'ID non esiste) ricerca. */
async function resolveYouTubeCard(rawUrl: string, fallbackQuery: string | null): Promise<YouTubeCard | null> {
  const directId = videoIdFrom(rawUrl);
  if (directId) {
    const card = await fetchOembed(directId);
    if (card) return card;
  }
  const query = searchQueryFrom(rawUrl) ?? fallbackQuery;
  if (!query) return null;
  const foundId = await searchFirstVideo(query);
  if (!foundId) return null;
  return fetchOembed(foundId);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") ?? "";
  const fallbackQuery = cleanFallbackQuery(searchParams.get("q"));

  let parsed: URL | null = null;
  try {
    parsed = new URL(rawUrl);
  } catch {
    parsed = null;
  }
  if (!parsed || !YOUTUBE_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const rl = await rateLimit("youtube-preview", getClientIp(request), {
    limit: RESULT_LIMIT_PER_HOUR,
    windowMs: RATE_LIMIT_WINDOWS.HOUR_MS,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const key = `${parsed.toString()}|${fallbackQuery ?? ""}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) {
    return NextResponse.json({ video: cached.value }, { headers: { "Cache-Control": "public, max-age=600" } });
  }

  let video: YouTubeCard | null = null;
  try {
    video = await resolveYouTubeCard(parsed.toString(), fallbackQuery);
  } catch (err) {
    // Timeout o blocco da parte di YouTube: la UI degrada al link di testo,
    // quindi qui basta rispondere `video: null` senza loggare rumore di rete.
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    if (!isTimeout) {
      console.error("YouTube preview resolution failed:", err);
    }
  }

  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  cache.set(key, { value: video, expires: now + CACHE_TTL_MS });

  return NextResponse.json({ video }, { headers: { "Cache-Control": "public, max-age=600" } });
}
