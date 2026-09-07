/**
 * Modulo di sicurezza — AgentCloud
 *
 * Funzioni pure (zero dipendenze esterne) per:
 *  1. Sanitizzare input testuali rimuovendo HTML/script pericolosi
 *  2. Rilevare tentativi di prompt injection prima che raggiungano l'LLM
 *  3. Costruire il Content-Security-Policy per le pagine embed
 *
 * Tutte le funzioni falliscono in modo sicuro: in caso di errore
 * restituiscono il dato originale o { detected: false } senza lanciare.
 *
 * Server-only: non importare da componenti client.
 */

// ---------------------------------------------------------------------------
// Costanti di sicurezza — usate anche in tools.ts e nei test
// ---------------------------------------------------------------------------

export const SECURITY_CONSTANTS = {
  /** Lunghezza massima di un singolo campo testuale fornito dall'utente */
  MAX_TEXT_LENGTH: 10_000,

  /** Lunghezza massima dell'input JSON totale di un tool call */
  MAX_INPUT_JSON_LENGTH: 50_000,

  /**
   * Pattern euristici per il rilevamento di prompt injection.
   * I pattern sono case-insensitive e coprono le varianti più comuni
   * in italiano e inglese.
   */
  INJECTION_PATTERNS: [
    // Comandi di ignorare istruzioni precedenti (EN)
    /ignore\s+(all\s+)?previous\s+instructions?/i,
    /disregard\s+(all\s+)?previous\s+instructions?/i,
    /forget\s+(all\s+)?previous\s+instructions?/i,

    // Comandi di ignorare istruzioni precedenti (IT)
    /ignora\s+(tutte\s+)?(le\s+)?istruzioni\s+precedenti/i,
    /dimentica\s+(tutte\s+)?(le\s+)?istruzioni/i,
    /non\s+seguire\s+(più\s+)?le\s+(tue\s+)?istruzioni/i,

    // Comandi di cambio ruolo (EN)
    /you\s+are\s+now\s+(a|an)\s+\w+/i,
    /act\s+as\s+(a|an|if\s+you\s+(are|were))\s/i,
    /pretend\s+(you\s+are|to\s+be)\s/i,
    /roleplay\s+as\s/i,
    /from\s+now\s+on\s+you\s+(are|will)/i,
    /your\s+new\s+role\s+is/i,
    /your\s+new\s+instructions?\s+(are|is)/i,

    // Comandi di cambio ruolo (IT)
    /sei\s+ora\s+un[ao]?\s+\w+/i,
    /da\s+(ora|adesso)\s+(in\s+poi\s+)?sei\s/i,
    /comportati\s+(come|da)\s/i,
    /fai\s+finta\s+di\s+(essere|fare)/i,
    /il\s+tuo\s+nuovo\s+ruolo\s+è/i,
    /le\s+tue\s+nuove\s+istruzioni\s+sono/i,

    // Tentativi di accedere al system prompt
    /repeat\s+(your\s+)?(system\s+)?prompt/i,
    /show\s+(me\s+)?your\s+(system\s+)?prompt/i,
    /print\s+(your\s+)?(system\s+)?prompt/i,
    /what\s+(are|is)\s+your\s+(system\s+)?prompt/i,
    /mostra(mi)?\s+il\s+(tuo\s+)?system\s+prompt/i,
    /ripeti\s+il\s+(tuo\s+)?system\s+prompt/i,

    // Comandi di escape dal contesto
    /\]\]\s*\{/i,          // tentativo di uscire da blocchi JSON
    /<\|im_end\|>/i,       // token speciali di alcuni modelli
    /<\|endoftext\|>/i,
    /\[INST\]/i,           // token Llama/Mistral
    /\[\/INST\]/i,
    /<<SYS>>/i,
    /<\|system\|>/i,

    // Jailbreak noti
    /DAN\s+(mode|test|prompt)/i,
    /jailbreak/i,
    /do\s+anything\s+now/i,
    /developer\s+mode/i,
    /god\s+mode/i,
  ] as RegExp[],
} as const;

// ---------------------------------------------------------------------------
// sanitizeHtml — rimuove markup potenzialmente pericoloso
// ---------------------------------------------------------------------------

/**
 * Rimuove tag HTML e attributi event-handler da una stringa.
 *
 * Non usa un parser DOM completo per mantenere zero dipendenze:
 * rimuove i casi più pericolosi (script, iframe, on* attributes)
 * e converte le entity HTML di base per sicurezza extra.
 *
 * @param text - Testo grezzo da sanitizzare
 * @returns Testo con markup pericoloso rimosso
 */
export function sanitizeHtml(text: string): string {
  if (!text || typeof text !== "string") return "";

  try {
    let result = text;

    // 1. Rimuove blocchi <script>...</script> (anche multilinea)
    result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

    // 2. Rimuove blocchi <iframe>...</iframe>
    result = result.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");

    // 3. Rimuove blocchi <style>...</style>
    result = result.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

    // 4. Rimuove attributi event-handler inline (onload, onclick, onmouseover, ecc.)
    result = result.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
    result = result.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "");

    // 5. Rimuove il protocollo javascript: dagli href/src
    result = result.replace(/javascript\s*:/gi, "");

    // 6. Rimuove tag HTML rimanenti (mantiene il testo interno)
    result = result.replace(/<[^>]+>/g, "");

    // 7. Decodifica le entity HTML più comuni per evitare bypass tramite encoding
    result = result
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;/gi, "'")
      .replace(/&#x2F;/gi, "/");

    // 8. Rimuove caratteri di controllo non stampabili (eccetto newline/tab)
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    return result;
  } catch {
    // In caso di errore inatteso, restituisce la stringa originale
    return text;
  }
}

// ---------------------------------------------------------------------------
// detectPromptInjection — rilevamento euristico
// ---------------------------------------------------------------------------

export type InjectionDetectionResult = {
  /** true se è stato rilevato un probabile tentativo di injection */
  detected: boolean;
  /** Descrizione del pattern rilevato (utile per il log audit) */
  reason?: string;
};

/**
 * Analizza un testo (tipicamente l'input JSON serializzato di un tool call)
 * e rileva pattern euristici di prompt injection.
 *
 * Fallisce in modo sicuro: qualsiasi eccezione interna restituisce
 * { detected: false } per non bloccare il flusso normale.
 *
 * @param text - Testo da analizzare (di solito JSON.stringify(toolInput))
 * @returns Risultato del rilevamento con flag e motivo opzionale
 */
export function detectPromptInjection(text: string): InjectionDetectionResult {
  if (!text || typeof text !== "string") return { detected: false };

  try {
    // Controlla il limite di lunghezza: input eccessivamente lunghi
    // sono sospetti di per sé (potrebbero nascondere payload offuscati)
    if (text.length > SECURITY_CONSTANTS.MAX_INPUT_JSON_LENGTH) {
      return {
        detected: true,
        reason: `input_too_long: ${text.length} chars (max ${SECURITY_CONSTANTS.MAX_INPUT_JSON_LENGTH})`,
      };
    }

    // Verifica ogni pattern euristico
    for (const pattern of SECURITY_CONSTANTS.INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          detected: true,
          reason: `pattern_match: ${pattern.source}`,
        };
      }
    }

    return { detected: false };
  } catch {
    // Non bloccare mai il flusso in caso di errore nella detection
    return { detected: false };
  }
}

// ---------------------------------------------------------------------------
// buildContentSecurityPolicy — CSP per le pagine embed/iframe
// ---------------------------------------------------------------------------

/**
 * Costruisce la stringa dell'header Content-Security-Policy
 * per le pagine agente caricate all'interno dell'iframe embed.
 *
 * Permette:
 *  - script/style solo dalla stessa origin (e da CDN Stripe se necessario)
 *  - frame-ancestors: any (le pagine cliente devono poter embeddare l'iframe)
 *  - connessioni API solo verso la stessa origin
 *
 * @returns Stringa pronta per l'header HTTP `Content-Security-Policy`
 */
export function buildContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",    // unsafe-inline necessario per il widget JS inline
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors *",                    // il widget deve poter essere embeddato ovunque
    "form-action 'self'",
    "base-uri 'self'",
  ];

  return directives.join("; ");
}

// ---------------------------------------------------------------------------
// corsOriginCheck — verifica whitelist origins per il widget embed
// ---------------------------------------------------------------------------

/**
 * Verifica se un'origin richiedente è nella whitelist configurata.
 *
 * La whitelist viene letta dall'env var `EMBED_ALLOWED_ORIGINS`
 * (es: "https://cliente.it,https://partner.com").
 *
 * Se la variabile non è configurata, restituisce `*` (comportamento
 * aperto, compatibile con il widget pubblico).
 *
 * @param requestOrigin - Header `Origin` della richiesta HTTP
 * @returns L'origin da usare nel header `Access-Control-Allow-Origin`
 */
export function corsOriginForEmbed(requestOrigin: string | null): string {
  // Distingue tra env non impostata (undefined) e impostata ma vuota (""):
  // - undefined → widget pubblico, nessuna restrizione ("*")
  // - "" → whitelist esplicitamente vuota, blocca tutto ("null")
  const rawValue = process.env.EMBED_ALLOWED_ORIGINS;
  if (rawValue === undefined) return "*";

  const allowedRaw = rawValue.trim();

  // Parsa la lista di origins ammesse
  const allowed = allowedRaw
    .split(",")
    .map((o) => o.trim().toLowerCase())
    .filter(Boolean);

  // Se la whitelist è esplicitamente vuota (es. ""), nega tutto
  if (allowed.length === 0) return "null";

  // Normalizza l'origin richiedente
  const origin = (requestOrigin || "").trim().toLowerCase();

  // Verifica membership nella whitelist (confronto esatto)
  if (origin && allowed.includes(origin)) {
    return requestOrigin!; // restituisce nella forma originale (case preservata)
  }

  // Origin non autorizzata: risponde con null (no CORS)
  return "null";
}
