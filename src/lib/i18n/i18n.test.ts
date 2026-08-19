import { describe, it, expect } from "vitest";
import { isLocale, LOCALES, DEFAULT_LOCALE } from "./locale";
import { getDictionary, t, en, type Dictionary } from "./dictionaries";
import {
  apiErrorMessageForLocale,
  type ApiErrorKey,
} from "./api-errors";
import { AGENT_LOCALIZATIONS_IT, getAgentLocalization } from "./agentCatalog";
import { AGENTS, localizeAgent } from "@/lib/agents";

describe("locale", () => {
  it("defaults to Italian", () => {
    expect(DEFAULT_LOCALE).toBe("it");
  });

  it("exposes exactly the supported locales", () => {
    expect(LOCALES).toEqual(["it", "en"]);
  });

  it("validates locale values", () => {
    expect(isLocale("it")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});

describe("dictionaries", () => {
  it("the English dictionary mirrors the Italian shape exactly", () => {
    // Structural comparison: same keys, same nested key paths, same array
    // lengths. Values may differ.
    function shape(value: unknown): unknown {
      if (Array.isArray(value)) {
        return value.map(shape);
      }
      if (value !== null && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(value as Record<string, unknown>).sort()) {
          out[key] = shape((value as Record<string, unknown>)[key]);
        }
        return out;
      }
      return typeof value;
    }
    expect(shape(en)).toEqual(shape(getDictionary("it")));
  });

  it("returns the Italian dictionary by default", () => {
    expect(getDictionary("it").common.comingSoon).toBe("Prossimamente");
  });

  it("returns the English dictionary when requested", () => {
    expect(getDictionary("en").common.comingSoon).toBe("Coming soon");
  });

  it("the dictionary is typed and complete for both locales", () => {
    const itDict = getDictionary("it");
    const enDict: Dictionary = getDictionary("en");
    expect(Object.keys(itDict)).toEqual(Object.keys(enDict));
  });

  it("interpolates template placeholders", () => {
    expect(t("Ciao {name}", { name: "Mario" })).toBe("Ciao Mario");
    expect(t("Welcome back, {name}", { name: "Ada" })).toBe(
      "Welcome back, Ada",
    );
    expect(t("{count} agents", { count: 3 })).toBe("3 agents");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(t("Hi {missing}", {})).toBe("Hi {missing}");
  });
});

describe("API error messages", () => {
  it("returns the Italian message by default locale", () => {
    expect(
      apiErrorMessageForLocale("it", "limitExceeded", { limit: "10.000" }),
    ).toBe(
      "Hai esaurito l'allowance mensile di 10.000 token per questo agente. Aggiorna il tuo piano per continuare.",
    );
  });

  it("returns the English message for the en locale", () => {
    expect(apiErrorMessageForLocale("en", "notSubscribed")).toBe(
      "You don't have an active subscription for this agent. Subscribe to start using it.",
    );
  });

  it("interpolates the status into the inactive subscription message", () => {
    expect(
      apiErrorMessageForLocale("it", "subscriptionInactive", {
        status: "canceled",
      }),
    ).toContain("canceled");
  });

  it("every apiErrors key is defined and fully interpolable in both locales", () => {
    const itKeys = Object.keys(getDictionary("it").apiErrors);
    const enDict = getDictionary("en");
    const sample: Record<string, string> = {
      status: "inactive",
      cap: "200.000",
      multiplier: "2",
      limit: "100.000",
    };
    for (const key of itKeys) {
      const typed = key as ApiErrorKey;
      expect(typeof enDict.apiErrors[typed]).toBe("string");
      const itMsg = apiErrorMessageForLocale("it", typed, sample);
      const enMsg = apiErrorMessageForLocale("en", typed, sample);
      expect(itMsg).not.toMatch(/\{\w+\}/);
      expect(enMsg).not.toMatch(/\{\w+\}/);
      expect(itMsg.length).toBeGreaterThan(0);
      expect(enMsg.length).toBeGreaterThan(0);
    }
  });
});

describe("agent catalog localization", () => {
  it("localizes an Italian entry for a known agent", () => {
    const agent = AGENTS.find((a) => a.slug === "executive-assistant")!;
    const localized = localizeAgent(agent, "it");
    expect(localized.name).toBe("Assistente Esecutivo");
    expect(localized.description).not.toBe(agent.description);
    expect(localized.tasks.length).toBe(agent.tasks.length);
  });

  it("keeps English data unchanged for the en locale", () => {
    const agent = AGENTS.find((a) => a.slug === "executive-assistant")!;
    const localized = localizeAgent(agent, "en");
    expect(localized).toBe(agent);
  });

  it("returns the agent untouched when no overlay exists", () => {
    // Slugs without an Italian overlay fall back to the canonical data.
    const slugs = AGENTS.map((a) => a.slug);
    for (const slug of slugs) {
      const localized = getAgentLocalization(slug, "it");
      if (!localized) {
        const agent = AGENTS.find((a) => a.slug === slug)!;
        expect(localizeAgent(agent, "it")).toBe(agent);
      }
    }
  });

  it("every catalog agent has a complete Italian overlay", () => {
    const slugs = AGENTS.map((a) => a.slug);
    const missing = slugs.filter((slug) => !AGENT_LOCALIZATIONS_IT[slug]);
    expect(missing).toEqual([]);
  });
});
