/**
 * Client di Ricerca Web Tavily (con Fallback DuckDuckGo)
 *
 * Questo modulo implementa la ricerca online in tempo reale per gli agenti AI:
 * - Se TAVILY_API_KEY è configurata, interroga direttamente le REST API ufficiali di Tavily.
 * - Supporta profondità di ricerca configurabile ("basic" per rapidità, "advanced" per approfondimenti),
 *   punteggio di rilevanza (score 0-1) ed estrazione della risposta sintetica (AI answer).
 * - Se TAVILY_API_KEY non è presente o se la chiamata a Tavily fallisce, interviene un fallback
 *   automatico e trasparente su DuckDuckGo, garantendo continuità di servizio in dev e test.
 * - Protezione da prompt injection: tutti i risultati restituiti al modello sono racchiusi
 *   all'interno del tag <contesto_esterno fonte="web_search"> come dati passivi.
 */

/**
 * Singolo risultato di una ricerca web.
 */
export type TavilySearchResult = {
  title: string;   // Titolo della pagina indicizzata
  url: string;     // URL completo della risorsa
  content: string; // Snippet o estratto testuale rilevante
  score?: number;  // Punteggio di pertinenza normalizzato (0.0 - 1.0)
};

/**
 * Struttura aggregata della risposta di ricerca restituita al chiamante.
 */
export type TavilySearchResponse = {
  query: string;                       // Query di ricerca originale
  results: TavilySearchResult[];       // Elenco dei risultati ordinati per pertinenza
  answer?: string | null;              // Risposta sintetica diretta generata da Tavily (se richiesta)
  provider: "tavily" | "duckduckgo";   // Motore effettivo che ha fornito i risultati
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
 * Esegue una ricerca web tramite le API REST di Tavily:
 * - Effettua una richiesta POST a https://api.tavily.com/search
 * - Limita il numero massimo di risultati in un range sicuro (1-20).
 * - Restituisce i risultati normalizzati con punteggio di pertinenza.
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
    headers: {
      "Content-Type": "application/json",
    },
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
 * Motore di ricerca alternativo (Fallback):
 * Interroga la versione HTML di DuckDuckGo ed estrae i risultati tramite parsing regex,
 * assicurando che l'agente non sia bloccato anche se non dispone di credenziali Tavily.
 */
export async function searchWithDuckDuckGo(
  query: string,
  maxResults: number = 5,
): Promise<TavilySearchResponse> {
  const res = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: { "User-Agent": "AgentCloud/1.0" },
    },
  );

  if (!res.ok) {
    throw new Error(`Errore DuckDuckGo (${res.status}): ${res.statusText}`);
  }

  const html = await res.text();
  const snippets = html.match(
    /<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi,
  );

  if (!snippets || snippets.length === 0) {
    return {
      query,
      results: [],
      answer: null,
      provider: "duckduckgo",
    };
  }

  const results: TavilySearchResult[] = snippets
    .slice(0, maxResults)
    .map((s: string) => {
      const titleMatch = s.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = s.match(
        /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/,
      );
      const linkMatch = s.match(/href="([^"]+)"/);
      return {
        title: titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "N/D",
        url: linkMatch ? linkMatch[1] : "N/D",
        content: snippetMatch
          ? snippetMatch[1].replace(/<[^>]+>/g, "").trim()
          : "N/D",
        score: 0.8,
      };
    });

  return {
    query,
    results,
    answer: null,
    provider: "duckduckgo",
  };
}

/**
 * Esegue la ricerca web dando priorità a Tavily e degradando silenziosamente su DuckDuckGo:
 * - Se TAVILY_API_KEY è presente, tenta la chiamata Tavily.
 * - In caso di errore o assenza della chiave, invoca il fallback DuckDuckGo.
 */
export async function executeWebSearch(
  params: TavilySearchParams,
): Promise<TavilySearchResponse> {
  if (isTavilyAvailable()) {
    try {
      return await searchWithTavily(params);
    } catch (err) {
      console.warn("Ricerca Tavily fallita, attivazione fallback DuckDuckGo:", err);
    }
  }

  return await searchWithDuckDuckGo(params.query, params.maxResults || 5);
}

/**
 * Formatta i risultati della ricerca in Markdown pulito per l'LLM:
 * - Include la risposta rapida sintetizzata (se disponibile).
 * - Elenca i singoli link con punteggio di pertinenza percentuale.
 * - Racchiude tutto nel tag di sicurezza <contesto_esterno> per prevenire prompt injection.
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
    const scoreStr = r.score !== undefined ? ` (Relevance: ${(r.score * 100).toFixed(0)}%)` : "";
    return [
      `[${i + 1}] ${r.title}${scoreStr}`,
      `URL: ${r.url}`,
      `Content: ${r.content}`,
    ].join("\n");
  });

  sections.push(formattedItems.join("\n\n"));
  return `<contesto_esterno fonte="web_search">\n${sections.join("\n\n")}\n</contesto_esterno>`;
}
