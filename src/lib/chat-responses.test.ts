import { describe, expect, it } from "vitest";
import {
  CHAT_RESPONSES,
  CHAT_RESPONSES_IT,
  getLocalChatResponse,
} from "./chat-responses";

describe("getLocalChatResponse", () => {
  it("returns the greeting for a hello message (case-insensitive)", () => {
    expect(getLocalChatResponse("Hello!", "en")).toBe(CHAT_RESPONSES.greeting);
    expect(getLocalChatResponse("CIAO", "en")).toBe(CHAT_RESPONSES.greeting);
  });

  it("routes email messages", () => {
    expect(getLocalChatResponse("Can you automate my inbox?", "en")).toBe(
      CHAT_RESPONSES.email,
    );
    expect(getLocalChatResponse("I need email draft replies", "en")).toBe(
      CHAT_RESPONSES.email,
    );
  });

  it("routes support messages", () => {
    expect(getLocalChatResponse("I want a support ticket bot", "en")).toBe(
      CHAT_RESPONSES.support,
    );
  });

  it("routes lead and sales messages", () => {
    expect(getLocalChatResponse("Help me with lead generation", "en")).toBe(
      CHAT_RESPONSES.leads,
    );
  });

  it("routes finance messages", () => {
    expect(
      getLocalChatResponse("Automate my invoice and payment workflow", "en"),
    ).toBe(CHAT_RESPONSES.finance);
    expect(getLocalChatResponse("I need an expense report", "en")).toBe(
      CHAT_RESPONSES.finance,
    );
  });

  it("routes social media messages", () => {
    expect(
      getLocalChatResponse("Manage my instagram and linkedin posts", "en"),
    ).toBe(CHAT_RESPONSES.social);
  });

  it("routes campaign messages", () => {
    expect(getLocalChatResponse("Launch a marketing campaign", "en")).toBe(
      CHAT_RESPONSES.campaigns,
    );
  });

  it("routes data messages", () => {
    expect(getLocalChatResponse("Generate a report from this csv", "en")).toBe(
      CHAT_RESPONSES.data,
    );
  });

  it("routes scheduling messages", () => {
    expect(getLocalChatResponse("Book a meeting on my calendar", "en")).toBe(
      CHAT_RESPONSES.scheduling,
    );
  });

  it("falls back to the default response for unknown input", () => {
    expect(getLocalChatResponse("zzz zzz zzz", "en")).toBe(
      CHAT_RESPONSES.default,
    );
    expect(getLocalChatResponse("", "en")).toBe(CHAT_RESPONSES.default);
  });

  it("is deterministic for the same input", () => {
    const input = "I need support help";
    expect(getLocalChatResponse(input, "en")).toBe(
      getLocalChatResponse(input, "en"),
    );
  });

  // ─── Italian responses (platform default) ──────────────────────────────

  it("defaults to Italian when no locale is passed", () => {
    expect(getLocalChatResponse("ciao")).toBe(CHAT_RESPONSES_IT.greeting);
  });

  it("returns Italian responses for Italian messages", () => {
    expect(getLocalChatResponse("Automatizza la mia casella email", "it")).toBe(
      CHAT_RESPONSES_IT.email,
    );
    expect(getLocalChatResponse("Ho bisogno di assistenza clienti", "it")).toBe(
      CHAT_RESPONSES_IT.support,
    );
    expect(getLocalChatResponse("Voglio più lead per le vendite", "it")).toBe(
      CHAT_RESPONSES_IT.leads,
    );
    expect(
      getLocalChatResponse("Gestisci le fatture e i pagamenti", "it"),
    ).toBe(CHAT_RESPONSES_IT.finance);
    expect(
      getLocalChatResponse("Programma i post su instagram", "it"),
    ).toBe(CHAT_RESPONSES_IT.social);
    expect(getLocalChatResponse("Lancia una campagna marketing", "it")).toBe(
      CHAT_RESPONSES_IT.campaigns,
    );
    expect(
      getLocalChatResponse("Genera un report dai dati csv", "it"),
    ).toBe(CHAT_RESPONSES_IT.data);
    expect(
      getLocalChatResponse("Prenota una riunione sul calendario", "it"),
    ).toBe(CHAT_RESPONSES_IT.scheduling);
  });

  it("returns the Italian default for unknown Italian input", () => {
    expect(getLocalChatResponse("zzz zzz zzz", "it")).toBe(
      CHAT_RESPONSES_IT.default,
    );
  });

  it("keeps the Italian and English tables aligned on the same keys", () => {
    expect(Object.keys(CHAT_RESPONSES_IT).sort()).toEqual(
      Object.keys(CHAT_RESPONSES).sort(),
    );
  });
});
