/**
 * Politica di lingua delle risposte degli agenti.
 *
 * Regola: l'agente risponde nella lingua dell'ultimo messaggio dell'utente e,
 * quando quel messaggio non ne indica una (una parola sola, un nome proprio, un
 * numero, un'emoji), in quella della piattaforma.
 *
 * Perché la lingua la decide il codice e non il modello: i system prompt degli
 * agenti (`registry.ts`) sono in inglese ma contengono esempi, etichette ed
 * elenchi in italiano, e i risultati dei tool sono in italiano (vedi
 * `tools.ts`). Lasciata al modello, la scelta seguiva quel materiale: con la
 * piattaforma in tedesco e un messaggio in inglese la risposta arrivava in
 * italiano. Qui la lingua viene rilevata dal messaggio e scritta in chiaro nel
 * prompt, così la direttiva è un ordine esplicito — e verificabile con un test.
 *
 * La lingua della piattaforma è quella risolta dal cookie `agentcloud_locale`
 * (`getLocale()`), quindi segue il selettore di lingua dell'interfaccia.
 */
import type { Locale } from "@/lib/i18n/constants";
import { LOCALES } from "@/lib/i18n/constants";

/**
 * Parole funzione e lessico frequente per lingua. Servono solo a capire in che
 * lingua è scritto il messaggio: restano fuori i termini condivisi da più
 * lingue quando non aiutano a distinguerle ("la", "un").
 */
const STOPWORDS: Record<Locale, string[]> = {
  it: [
    "il", "lo", "gli", "della", "delle", "degli", "nella", "nello", "alla",
    "che", "chi", "cui", "per", "non", "sono", "posso", "puoi", "vorrei",
    "voglio", "come", "cosa", "perché", "mio", "mia", "miei", "tuo", "tua",
    "tuoi", "grazie", "ciao", "salve", "più", "questo", "questa", "anche",
    "sempre", "devo", "devi", "fare", "fatto", "ordini", "prodotti", "clienti",
    "vendite", "negozio", "aiutarmi", "aiutarti", "spiegami", "dimmi", "senza",
    "dopo", "prima", "molto", "tutto", "niente", "adesso", "quindi", "invece",
  ],
  en: [
    "the", "and", "you", "your", "yours", "with", "for", "this", "that",
    "are", "can", "could", "would", "should", "what", "how", "why", "when",
    "need", "want", "please", "thanks", "thank", "hello", "help", "my",
    "have", "has", "does", "about", "from", "into", "over", "give", "show",
    "tell", "make", "set", "which", "there", "order", "orders", "store",
  ],
  es: [
    "el", "los", "las", "que", "para", "por", "puedes", "puedo", "necesito",
    "quiero", "gracias", "hola", "cómo", "qué", "está", "están", "tengo",
    "mis", "tus", "porque", "más", "muy", "conmigo", "ayúdame", "dime",
    "hacer", "hecho", "pedidos", "productos", "clientes", "ventas", "tienda",
    "también", "siempre", "debo", "debes", "después", "antes", "mucho",
    "todo", "nada", "ahora", "entonces", "cuando", "dónde", "quién",
  ],
  de: [
    "der", "die", "das", "und", "ich", "nicht", "für", "mit", "ein", "eine",
    "einen", "du", "sie", "wir", "ist", "sind", "kann", "kannst", "könnte",
    "wie", "was", "auf", "von", "dass", "wenn", "haben", "habe", "hast",
    "möchte", "will", "bitte", "danke", "hilfe", "helfen", "meine", "mein",
    "dein", "deine", "auch", "immer", "muss", "musst", "machen", "gemacht",
    "bestellungen", "produkte", "kunden", "umsatz", "bestellung", "nach", "vor",
    "sehr", "alles", "nichts", "jetzt", "dann", "wann", "wo", "wer",
  ],
  fr: [
    "les", "des", "une", "est", "sont", "que", "qui", "quoi", "vous", "nous",
    "pour", "avec", "dans", "comment", "merci", "bonjour", "salut", "besoin",
    "peux", "pouvez", "veux", "voudrais", "mon", "ma", "mes", "votre", "vos",
    "aussi", "toujours", "dois", "devez", "faire", "fait", "commandes",
    "produits", "clients", "ventes", "boutique", "après", "avant", "beaucoup",
    "tout", "rien", "maintenant", "donc", "quand", "où", "commande",
  ],
};

/** Segni che appartengono a una sola delle lingue supportate. */
const SCRIPTS: { locale: Locale; pattern: RegExp; weight: number }[] = [
  { locale: "es", pattern: /[ñ¿¡]/i, weight: 3 },
  { locale: "de", pattern: /ß/, weight: 3 },
  { locale: "fr", pattern: /[çœ]/, weight: 2 },
  { locale: "de", pattern: /[äöü]/i, weight: 1 },
  { locale: "fr", pattern: /[àèêëîïôûù]/, weight: 1 },
  { locale: "it", pattern: /[àèéìòù]/, weight: 1 },
];

const INDEX: Record<Locale, Set<string>> = Object.fromEntries(
  LOCALES.map((locale) => [locale, new Set(STOPWORDS[locale])]),
) as Record<Locale, Set<string>>;

/** Sotto questo punteggio il messaggio non è abbastanza per decidere. */
const MIN_SCORE = 2;

/**
 * Lingua del testo, oppure `null` quando il testo non la indica (una parola
 * sola, un nome proprio, un numero) o quando due lingue sono in parità.
 */
export function detectLanguage(text: string): Locale | null {
  if (!text) return null;
  const lowered = text.toLowerCase();
  const tokens = lowered.split(/[^a-zà-ÿ']+/i).filter((token) => token.length > 1);

  const scores = Object.fromEntries(
    LOCALES.map((locale) => [locale, 0]),
  ) as Record<Locale, number>;

  for (const token of tokens) {
    for (const locale of LOCALES) {
      if (INDEX[locale].has(token)) scores[locale] += 1;
    }
  }
  for (const { locale, pattern, weight } of SCRIPTS) {
    if (pattern.test(text)) scores[locale] += weight;
  }

  const ranked = [...LOCALES].sort((a, b) => scores[b] - scores[a]);
  const [best, second] = ranked;
  if (scores[best] < MIN_SCORE || scores[best] === scores[second]) return null;
  return best;
}

/**
 * Ultimo messaggio dell'utente con contenuto testuale. I messaggi possono
 * contenere blocchi tool (array), che non indicano la lingua della
 * conversazione: vengono saltati.
 */
export function lastUserText(
  messages: readonly { role: string; content: unknown }[],
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "user") continue;
    if (typeof message.content === "string") return message.content;
    if (Array.isArray(message.content)) {
      const arr = message.content as { type?: string; text?: string }[];
      const text = arr.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
      if (text) return text;
    }
  }
  return undefined;
}

/**
 * Lingua della risposta: quella dell'ultimo messaggio dell'utente, con la
 * lingua della piattaforma come default quando il messaggio non la indica.
 */
export function replyLanguage(
  platformLocale: Locale,
  lastUserMessage?: string,
): Locale {
  if (!lastUserMessage) return platformLocale;
  return detectLanguage(lastUserMessage) ?? platformLocale;
}

/**
 * Direttiva aggiunta in coda al system prompt, scritta nella lingua della
 * risposta: chiudere il prompt nella lingua attesa rinforza l'ordine.
 */
const DIRECTIVES: Record<Locale, string> = {
  it:
    "Lingua: rispondi in italiano. È la lingua dell'ultimo messaggio " +
    "dell'utente o, quando quel messaggio non ne indica una, la lingua della " +
    "piattaforma. Non mescolare le lingue nella stessa risposta: esempi e " +
    "risultati degli strumenti possono essere in un'altra lingua, la tua " +
    "risposta resta in italiano.",
  en:
    "Language: answer in English. That is the language of the user's latest " +
    "message, or — when that message does not indicate one — the platform " +
    "language. Never mix languages in the same answer: examples and tool " +
    "results may be in another language, your answer stays in English.",
  es:
    "Idioma: responde en español. Es el idioma del último mensaje del usuario " +
    "o, si ese mensaje no indica ninguno, el idioma de la plataforma. No " +
    "mezcles idiomas en la misma respuesta: los ejemplos y los resultados de " +
    "las herramientas pueden estar en otro idioma, tu respuesta sigue en español.",
  de:
    "Sprache: Antworte auf Deutsch. Das ist die Sprache der letzten Nachricht " +
    "des Nutzers oder, wenn diese Nachricht keine erkennen lässt, die Sprache " +
    "der Plattform. Mische niemals mehrere Sprachen in einer Antwort: Beispiele " +
    "und Tool-Ergebnisse können in einer anderen Sprache sein, deine Antwort " +
    "bleibt auf Deutsch.",
  fr:
    "Langue : répondez en français. C'est la langue du dernier message de " +
    "l'utilisateur ou, si ce message n'en indique aucune, celle de la " +
    "plateforme. Ne mélangez jamais plusieurs langues dans la même réponse : " +
    "les exemples et les résultats des outils peuvent être dans une autre " +
    "langue, votre réponse reste en français.",
};

/** Istruzione di lingua per la lingua della risposta. */
export function languageDirective(locale: Locale): string {
  return DIRECTIVES[locale];
}

/** Accoda la direttiva di lingua al system prompt di un agente. */
export function withLanguageDirective(
  systemPrompt: string,
  replyLocale: Locale,
): string {
  return `${systemPrompt.trimEnd()}\n\n${languageDirective(replyLocale)}`;
}
