import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  languageDirective,
  lastUserText,
  replyLanguage,
  withLanguageDirective,
} from "./language";

describe("detectLanguage", () => {
  it("rileva l'italiano da stopwords e caratteri", () => {
    expect(detectLanguage("Ciao, vorrei sapere come gestire i miei ordini")).toBe("it");
  });

  it("rileva l'inglese", () => {
    expect(detectLanguage("Please show me all orders from this week")).toBe("en");
  });

  it("rileva lo spagnolo", () => {
    expect(detectLanguage("Hola, necesito ayuda con mis productos y pedidos")).toBe("es");
  });

  it("rileva il tedesco", () => {
    expect(detectLanguage("Guten Tag, ich möchte meine Bestellungen und Produkte sehen")).toBe("de");
  });

  it("rileva il francese", () => {
    expect(detectLanguage("Bonjour, où sont mes commandes pour cette semaine ?")).toBe("fr");
  });

  it("restituisce null per testi troppo brevi o ambigui", () => {
    expect(detectLanguage("")).toBeNull();
    expect(detectLanguage("OK")).toBeNull();
    expect(detectLanguage("12345")).toBeNull();
    expect(detectLanguage("👍")).toBeNull();
  });
});

describe("lastUserText", () => {
  it("trova l'ultimo messaggio testuale dell'utente", () => {
    const messages = [
      { role: "user", content: "Primo messaggio" },
      { role: "assistant", content: "Risposta" },
      { role: "user", content: "Secondo messaggio" },
    ];
    expect(lastUserText(messages)).toBe("Secondo messaggio");
  });

  it("ignora messaggi assistant o non stringa", () => {
    const messages = [
      { role: "user", content: "Solo messaggio valido" },
      { role: "user", content: [{ type: "tool_use" }] },
      { role: "assistant", content: "Ultima risposta" },
    ];
    expect(lastUserText(messages)).toBe("Solo messaggio valido");
  });

  it("restituisce undefined se non ci sono messaggi utente validi", () => {
    expect(lastUserText([])).toBeUndefined();
    expect(lastUserText([{ role: "assistant", content: "Ciao" }])).toBeUndefined();
  });
});

describe("replyLanguage", () => {
  it("usa la lingua del messaggio utente quando rilevata", () => {
    expect(replyLanguage("it", "Please help me with my store orders")).toBe("en");
    expect(replyLanguage("en", "Vorrei impostare gli sconti per i clienti")).toBe("it");
  });

  it("ripiega sulla lingua della piattaforma se il messaggio non indica la lingua", () => {
    expect(replyLanguage("de", "Shopify")).toBe("de");
    expect(replyLanguage("fr", "100")).toBe("fr");
    expect(replyLanguage("es", undefined)).toBe("es");
  });
});

describe("languageDirective & withLanguageDirective", () => {
  it("genera la direttiva appropriata per ogni lingua", () => {
    expect(languageDirective("it")).toContain("Lingua: rispondi in italiano");
    expect(languageDirective("en")).toContain("Language: answer in English");
    expect(languageDirective("es")).toContain("Idioma: responde en español");
    expect(languageDirective("de")).toContain("Sprache: Antworte auf Deutsch");
    expect(languageDirective("fr")).toContain("Langue : répondez en français");
  });

  it("accoda la direttiva al prompt", () => {
    const prompt = withLanguageDirective("You are an agent.", "it");
    expect(prompt).toContain("You are an agent.\n\nLingua: rispondi in italiano");
  });
});
