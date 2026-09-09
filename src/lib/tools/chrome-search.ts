/**
 * Chrome Web Search — Ricerca web reale tramite Chrome/Puppeteer.
 *
 * Invece di usare API di terze parti (Tavily, DuckDuckGo), questo modulo
 * apre un'istanza Chrome headless, esegue una ricerca su Google e strappa
 * i risultati direttamente dalla pagina HTML.
 *
 * Vantaggi:
 * - Ricerca reale su Google (stessi risultati che vede un utente)
 * - Nessuna API key necessaria
 * - Funziona ovunque dove c'è Chrome installato
 *
 * svantaggi:
 * - Più lento delle API (~2-5s vs ~200ms)
 * - Google potrebbe bloccare richieste automatiche (rate limit)
 * - Richiede Chrome installato sul server
 */

import puppeteer, { type Browser } from "puppeteer-core";

/**
 * Percorso Chrome su diversi sistemi operativi.
 */
const CHROME_PATHS: Record<string, string[]> = {
  win32: [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Users/*/AppData/Local/Google/Chrome/Application/chrome.exe",
  ],
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ],
};

/**
 * Trova il percorso di Chrome sul sistema corrente.
 */
function findChromePath(): string | null {
  const paths = CHROME_PATHS[process.platform] ?? CHROME_PATHS.linux;

  for (const p of paths) {
    // Gestisce i wildcard (es. C:/Users/*/...)
    if (p.includes("*")) {
      try {
        const fs = require("fs");
        const glob = p.replace("*", "*");
        const baseDir = p.split("*")[0];
        if (fs.existsSync(baseDir)) {
          const dirs = fs.readdirSync(baseDir);
          for (const dir of dirs) {
            const fullPath = p.replace("*", dir);
            if (fs.existsSync(fullPath)) return fullPath;
          }
        }
      } catch {
        // ignora
      }
    } else {
      try {
        const fs = require("fs");
        if (fs.existsSync(p)) return p;
      } catch {
        // ignora
      }
    }
  }

  return null;
}

/**
 * Browser singleton per riutilizzare l'istanza Chrome.
 */
let browserInstance: Browser | null = null;
let lastActivity = Date.now();
const BROWSER_IDLE_TIMEOUT = 60_000; // 1 minuto

/**
 * Ottieni o crea un'istanza Chrome singleton.
 */
async function getBrowser(): Promise<Browser> {
  // Chiudi il browser se è rimasto inattivo troppo a lungo
  if (browserInstance && Date.now() - lastActivity > BROWSER_IDLE_TIMEOUT) {
    try {
      await browserInstance.close();
    } catch {
      // ignora
    }
    browserInstance = null;
  }

  if (browserInstance && browserInstance.connected) {
    lastActivity = Date.now();
    return browserInstance;
  }

  const chromePath = findChromePath();
  if (!chromePath) {
    throw new Error(
      "Chrome non trovato sul sistema. Installa Google Chrome o imposta CHROME_PATH.",
    );
  }

  browserInstance = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || chromePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  });

  lastActivity = Date.now();
  return browserInstance;
}

export type ChromeSearchResult = {
  title: string;
  url: string;
  snippet: string;
  position: number;
};

export type ChromeSearchResponse = {
  query: string;
  results: ChromeSearchResult[];
  answer?: string | null;
  provider: "chrome";
};

/**
 * Esegue una ricerca su Google usando Chrome headless.
 *
 * @param query - La query di ricerca
 * @param maxResults - Numero massimo di risultati (default 5)
 * @returns Risultati della ricerca formattati
 */
export async function searchWithChrome(
  query: string,
  maxResults: number = 5,
): Promise<ChromeSearchResponse> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Imposta User-Agent realistico
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    );

    // Imposta viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Vai su Google
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults + 2}&hl=it`;
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });

    // Aspetta che i risultati siano caricati
    await page.waitForSelector("#search", { timeout: 10_000 }).catch(() => {
    // Se non trova #search, prova con .g
    });

    // Estrai i risultati
    const results = await page.evaluate((max: number) => {
      const items: Array<{
        title: string;
        url: string;
        snippet: string;
        position: number;
      }> = [];

      // Selettori per i risultati Google (più varianti per resilienza)
      const selectors = [
        "#search .g",
        "#search .tF2Cxc",
        ".MjjYud",
        "[data-hveid] > div",
      ];

      let resultElements: Element[] = [];
      for (const sel of selectors) {
        resultElements = Array.from(document.querySelectorAll(sel));
        if (resultElements.length > 0) break;
      }

      let position = 0;
      for (const el of resultElements) {
        if (position >= max) break;

        // Trova il link
        const linkEl = el.querySelector("a[href^='http']");
        if (!linkEl) continue;

        const url = (linkEl as HTMLAnchorElement).href;
        if (url.includes("google.com/search") || url.includes("google.it/search")) {
          continue; // Salta link interni Google
        }

        // Trova il titolo
        const titleEl =
          el.querySelector("h3") ||
          el.querySelector("[role='heading']") ||
          linkEl;
        const title = titleEl?.textContent?.trim() || "Senza titolo";

        // Trova lo snippet
        const snippetEl =
          el.querySelector(".VwiC3b") ||
          el.querySelector("[data-sncf]") ||
          el.querySelector(".IsZvec") ||
          el.querySelector("span:not(h3 span):not(a span)");
        const snippet = snippetEl?.textContent?.trim() || "";

        if (title && url) {
          items.push({
            title,
            url,
            snippet: snippet.substring(0, 300),
            position: ++position,
          });
        }
      }

      return items;
    }, maxResults);

    return {
      query,
      results,
      answer: null,
      provider: "chrome",
    };
  } finally {
    await page.close();
  }
}

/**
 * Chiudi il browser Chrome (da chiamare allo shutdown del server).
 */
export async function closeChromeBrowser(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {
      // ignora
    }
    browserInstance = null;
  }
}

/**
 * Verifica se Chrome è disponibile sul sistema.
 */
export function isChromeAvailable(): boolean {
  return findChromePath() !== null;
}
