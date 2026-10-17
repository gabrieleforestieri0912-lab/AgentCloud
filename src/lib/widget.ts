/**
 * Modulo di configurazione e generazione codice per il Widget Chat di AgentCloud.
 *
 * Questo modulo offre strumenti pronti all'uso per le Piccole e Medie Imprese (PMI)
 * e per la dashboard di AgentCloud per:
 * 1. Validare e sanitizzare le impostazioni del widget (colori, posizioni, messaggi).
 * 2. Generare lo snippet di codice HTML / JavaScript per l'integrazione universale su
 *    siti web tradizionali (WordPress, Shopify, Webflow, e-commerce proprietari).
 * 3. Generare il frammento di codice JSX/TSX per l'integrazione diretta in progetti
 *    Next.js e React.
 */

import { sanitizeHtml } from "@/lib/security";

/**
 * Opzioni di configurazione del widget per un agente e tenant specifico.
 */
export interface WidgetConfig {
  /** Slug identificativo univoco dell'agente (es. "quote-agent", "support-agent") */
  slug: string;
  /** Identificativo del tenant per l'isolamento multi-tenant dei dati e credenziali */
  tenantId?: string;
  /** Titolo visualizzato nell'intestazione del widget */
  title?: string;
  /** Sottotitolo o stato visualizzato sotto il titolo (es. "Risponde in pochi secondi") */
  subtitle?: string;
  /** Colore primario del pulsante e del tema in formato esadecimale (es. "#038bfe") */
  primaryColor?: string;
  /** Posizione del widget sullo schermo del visitatore */
  position?: "bottom-right" | "bottom-left";
  /** Messaggio iniziale di saluto mostrato all'apertura */
  initialMessage?: string;
  /** Testo segnaposto all'interno della casella di digitazione */
  placeholder?: string;
  /** Lingua dell'interfaccia utente */
  lang?: "it" | "en";
  /** Modalità di apertura del widget: popup separato o finestra modale interna */
  mode?: "embed" | "popup";
  /** Chiave API opzionale per l'autenticazione del tenant */
  apiKey?: string;
}

/**
 * Risultato della procedura di validazione e sanitizzazione delle opzioni del widget.
 */
export interface WidgetValidationResult {
  /** Indica se la configurazione rispetta tutti i vincoli essenziali */
  valid: boolean;
  /** Lista degli eventuali errori di validazione riscontrati */
  errors: string[];
  /** Configurazione sanitizzata con fallback sicuri applicati */
  sanitized: WidgetConfig;
}

/** Regex per validare colori esadecimali sicuri (3, 6 o 8 cifre) */
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Valida e normalizza la configurazione di un widget fornita da un utente o tenant.
 *
 * Applica controlli sui parametri, rimuove caratteri potenzialmente malevoli
 * tramite `sanitizeHtml` e assegna valori di default sensati per parametri mancanti.
 *
 * @param config Configurazione parziale fornita dal cliente
 * @returns Risultato della validazione con configurazione normalizzata
 */
export function validateWidgetConfig(config: Partial<WidgetConfig>): WidgetValidationResult {
  const errors: string[] = [];

  // Validazione obbligatorietà dello slug dell'agente
  const rawSlug = (config.slug || "").trim().toLowerCase();
  if (!rawSlug) {
    errors.push("Lo slug dell'agente è obbligatorio.");
  } else if (!/^[a-z0-9-_]+$/.test(rawSlug)) {
    errors.push("Lo slug contiene caratteri non validi (sono consentiti solo lettere minuscole, numeri, trattini).");
  }

  // Sanitizzazione tenantId
  const sanitizedTenantId = config.tenantId ? config.tenantId.trim() : "default";

  // Validazione del colore primario (fallback su blu AgentCloud #038bfe)
  let sanitizedColor = "#038bfe";
  if (config.primaryColor) {
    const trimmedColor = config.primaryColor.trim();
    if (HEX_COLOR_REGEX.test(trimmedColor)) {
      sanitizedColor = trimmedColor;
    } else {
      errors.push("Il colore primario deve essere un codice esadecimale valido (es. #038bfe).");
    }
  }

  // Validazione della posizione
  let sanitizedPosition: "bottom-right" | "bottom-left" = "bottom-right";
  if (config.position === "bottom-left" || config.position === "bottom-right") {
    sanitizedPosition = config.position;
  } else if (config.position !== undefined) {
    errors.push("La posizione deve essere 'bottom-right' oppure 'bottom-left'.");
  }

  // Validazione della modalità
  let sanitizedMode: "embed" | "popup" = "embed";
  if (config.mode === "popup" || config.mode === "embed") {
    sanitizedMode = config.mode;
  }

  // Validazione della lingua
  const sanitizedLang: "it" | "en" = config.lang === "en" ? "en" : "it";

  // Sanitizzazione dei testi liberi contro injection XSS
  const sanitizedTitle = config.title ? sanitizeHtml(config.title.trim()) : undefined;
  const sanitizedSubtitle = config.subtitle ? sanitizeHtml(config.subtitle.trim()) : undefined;
  const sanitizedInitialMessage = config.initialMessage
    ? sanitizeHtml(config.initialMessage.trim())
    : undefined;
  const sanitizedPlaceholder = config.placeholder
    ? sanitizeHtml(config.placeholder.trim())
    : undefined;
  const sanitizedApiKey = config.apiKey ? config.apiKey.trim() : undefined;

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      slug: rawSlug,
      tenantId: sanitizedTenantId,
      title: sanitizedTitle,
      subtitle: sanitizedSubtitle,
      primaryColor: sanitizedColor,
      position: sanitizedPosition,
      initialMessage: sanitizedInitialMessage,
      placeholder: sanitizedPlaceholder,
      lang: sanitizedLang,
      mode: sanitizedMode,
      apiKey: sanitizedApiKey,
    },
  };
}

