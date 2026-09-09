/**
 * Client di Ricerca Web Tavily (con Fallback Chrome)
 *
 * Questo modulo implementa la ricerca online in tempo reale per gli agenti AI:
 * - Se TAVILY_API_KEY è configurata, interroga direttamente le REST API ufficiali di Tavily.
 * - Se TAVILY_API_KEY non è presente o se la chiamata a Tavily fallisce, interviene un fallback
 *   su Chrome headless (Puppeteer) che esegue ricerche reali su Google.
 * - Se Chrome non è disponibile, come ultimo resort usa DuckDuckGo.
 * - Protezione da prompt injection: tutti i risultati restituiti al modello sono racchiusi
 *   all'interno del tag <contesto_esterno fonte="web_search"> come dati passivi.
 */

/**
 * Singolo risultato di una ricerca web.
 */
export type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

/**
 * Struttura aggregata della risposta di ricerca restituita al chiamante.
 */
export type TavilySearchResponse = {
  query: string;
  results: TavilySearchResult[];
  answer?: string | null;
  provider: "tavily" | "duckduckgo";
};

/**
 * Parametri di configurazione per l'esecuzione della ricerca web.
 */
export type TavilySearchParams = {
  query: string;
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean;
};

/**
 * Verifica se la chiave API Tavily è configurata nell'ambiente corrente.
 */
export function isTavilyAvailable(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

/**
 * Retry helper con backoff esponenziale.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

/**
 * User-Agent robusto che imita un browser reale per evitare blocchi.
 */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Esegue una ricerca web tramite le API REST di Tavily.
 */
export async function searchWithTavily(
  params: TavilySearchParams,
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY non è configurata nell'ambiente.");
  }

  const payload = {
    api_key: apiKey,
    query: params.query,
    max_results: Math.min(Math.max(params.maxResults || 5, 1), 20),
    search_depth: params.searchDepth || "basic",
    include_answer: Boolean(params.includeAnswer),
  };

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Errore API Tavily (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as {
    query?: string;
    answer?: string;
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      score?: number;
    }>;
  };

  const results: TavilySearchResult[] = (data.results || []).map((r) => ({
    title: r.title || "Senza titolo",
    url: r.url || "",
    content: r.content || "",
    score: typeof r.score === "number" ? r.score : 1.0,
  }));

  return {
    query: data.query || params.query,
    results,
    answer: data.answer || null,
    provider: "tavily",
  };
}

/**
 * Estrae i risultati dal HTML di DuckDuckGo.
 * Supporta sia il formato classico che il formato lite.
 */
function parseDuckDuckGoHtml(html: string, query: string, maxResults: number): TavilySearchResult[] {
  const results: TavilySearchResult[] = [];

  // Pattern 1: Formato standard (result__a + result__snippet)
  const stdSnippets = html.match(
    /<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi,
  );

  if (stdSnippets) {
    for (const s of stdSnippets.slice(0, maxResults)) {
      const titleMatch = s.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = s.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      const linkMatch = s.match(/href="([^"]+)"/);
      results.push({
        title: titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "N/D",
        url: linkMatch ? linkMatch[1] : "N/D",
        content: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "N/D",
        score: 0.8,
      });
    }
    if (results.length > 0) return results;
  }

  // Pattern 2: Formato Lite/HTML semplificato (risultati in <li> o <div>)
  const litePattern = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  const seen = new Set<string>();
  while ((match = litePattern.exec(html)) !== null && results.length < maxResults) {
    const url = match[1];
    const title = match[2].trim();
    if (!seen.has(url) && title.length > 5 && !url.includes("duckduckgo.com")) {
      seen.add(url);
      results.push({ title, url, content: title, score: 0.7 });
    }
  }

  return results;
}

/**
 * Motore di ricerca alternativo (Fallback):
 * Interroga la versione HTML di DuckDuckGo con retry e parsing robusto.
 */
export async function searchWithDuckDuckGo(
  query: string,
  maxResults: number = 5,
): Promise<TavilySearchResponse> {
  const results = await withRetry(async () => {
    // Prova prima DuckDuckGo standard
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      },
    );

    if (!res.ok) {
      throw new Error(`DuckDuckGo HTTP ${res.status}`);
    }

    const html = await res.text();

    // Verifica se DuckDuckGo ha restituito una pagina di blocco/captcha
    if (html.includes("captcha") || html.includes("blocked") || html.length < 500) {
      throw new Error("DuckDuckGo: pagina di blocco o captcha rilevata");
    }

    return parseDuckDuckGoHtml(html, query, maxResults);
  }, 2, 1500);

  return {
    query,
    results,
    answer: null,
    provider: "duckduckgo",
  };
}

/**
 * Esegue la ricerca web dando priorità a Tavily → Chrome → DuckDuckGo.
 * Chrome è il fallback principale: esegue ricerche reali su Google tramite browser headless.
 */
export async function executeWebSearch(
  params: TavilySearchParams,
): Promise<TavilySearchResponse> {
  // 1. Tentativo con Tavily (se configurato)
  if (isTavilyAvailable()) {
    try {
      return await searchWithTavily(params);
    } catch (err) {
      console.warn("Ricerca Tavily fallita, attivazione fallback Chrome:", err);
    }
  }

  // 2. Tentativo con Chrome headless (ricerca reale su Google)
  try {
    const { searchWithChrome, isChromeAvailable } = await import("./chrome-search");
    if (isChromeAvailable()) {
      console.log("🔍 Ricerca via Chrome headless...");
      const chromeResult = await searchWithChrome(params.query, params.maxResults || 5);
      // Converti il formato Chrome in formato TavilySearchResponse
      return {
        query: chromeResult.query,
        results: chromeResult.results.map((r) => ({
          title: r.title,
          url: r.url,
          content: r.snippet,
          score: 1.0 - (r.position * 0.1),
        })),
        answer: null,
        provider: "tavily", // mantieni il tipo compatibile
      };
    }
  } catch (chromeErr) {
    console.warn("Chrome search fallito, attivazione fallback DuckDuckGo:", chromeErr);
  }

  // 3. Ultimo resort: DuckDuckGo (con retry)
  try {
    return await searchWithDuckDuckGo(params.query, params.maxResults || 5);
  } catch (ddgErr) {
    console.warn("DuckDuckGo fallback fallito:", ddgErr);
  }

  // 4. Fallback finale: restituisci un risultato che indica l'indisponibilità
  return {
    query: params.query,
    results: [
      {
        title: "Ricerca web momentaneamente non disponibile",
        url: "",
        content:
          "Il servizio di ricerca web è temporaneamente non disponibile. " +
          "Puoi comunque chiedermi informazioni basate sulle mie conoscenze. " +
          "Per ricerche in tempo reale, prova a riformulare la domanda tra qualche minuto.",
        score: 0,
      },
    ],
    answer: null,
    provider: "duckduckgo",
  };
}

/**
 * Formatta i risultati della ricerca in Markdown pulito per l'LLM.
 * Include la risposta rapida sintetizzata (se disponibile) e i singoli link.
 * Racchiude tutto nel tag di sicurezza <contesto_esterno> per prevenire prompt injection.
 */
export function formatWebSearchResults(
  response: TavilySearchResponse,
): string {
  if (response.results.length === 0) {
    return `<contesto_esterno fonte="web_search">\nNessun risultato trovato per la ricerca: ${response.query}\n</contesto_esterno>`;
  }

  const sections: string[] = [];

  if (response.answer) {
    sections.push(`### Quick Answer:\n${response.answer}`);
  }

  const formattedItems = response.results.map((r, i) => {
    const scoreStr = r.score !== undefined && r.score > 0 ? ` (Relevance: ${(r.score * 100).toFixed(0)}%)` : "";
    const urlLine = r.url ? `\nURL: ${r.url}` : "";
    return `[${i + 1}] ${r.title}${scoreStr}${urlLine}\nContent: ${r.content}`;
  });

  sections.push(formattedItems.join("\n\n"));
  return `<contesto_esterno fonte="web_search">\n${sections.join("\n\n")}\n</contesto_esterno>`;
}
