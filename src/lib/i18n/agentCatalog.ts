/**
 * Catalogo agenti: overlay di localizzazione (slug → campi di display).
 *
 * Il contenuto canonico degli agenti vive in `src/lib/agents.ts` in inglese
 * (lingua di default). I file `agentCatalog.{it,es,de,fr}.ts` forniscono la
 * versione localizzata dei campi mostrati nella UI, indicizzati per slug.
 * `localizeAgent()` in `src/lib/agents.ts` applica l'overlay in base alla
 * lingua attiva; per l'inglese i dati canonici vengono usati così come sono.
 *
 * Il badge dell'agente NON è parte dell'overlay: è una proprietà canonica
 * (`"Popular" | "New" | "Customizable" | "Fast setup"`) e viene mostrato
 * tradotto tramite `localizeBadge()`, così il colore resta coerente in ogni
 * lingua.
 */
import type { Agent } from "../agents";
import type { Locale } from "./constants";
import { AGENT_LOCALIZATIONS_IT } from "./agentCatalog.it";
import { AGENT_LOCALIZATIONS_ES } from "./agentCatalog.es";
import { AGENT_LOCALIZATIONS_DE } from "./agentCatalog.de";
import { AGENT_LOCALIZATIONS_FR } from "./agentCatalog.fr";

export type AgentLocalization = {
  name: string;
  shortName: string;
  category: string;
  industry: string;
  description: string;
  longDescription: string;
  tasks: string[];
  workflow: string[];
};

const AGENT_LOCALIZATIONS: Record<
  Exclude<Locale, "en">,
  Record<string, AgentLocalization>
> = {
  it: AGENT_LOCALIZATIONS_IT,
  es: AGENT_LOCALIZATIONS_ES,
  de: AGENT_LOCALIZATIONS_DE,
  fr: AGENT_LOCALIZATIONS_FR,
};

/** Agent catalog overlay for a slug, or null when the locale has no overlay. */
export function getAgentLocalization(
  slug: string,
  locale: Locale,
): AgentLocalization | null {
  if (locale === "en") return null;
  return AGENT_LOCALIZATIONS[locale][slug] ?? null;
}

/** Badge del marketplace localizzato (la chiave resta quella canonica). */
const AGENT_BADGE_LABELS: Record<Locale, Record<Agent["badge"], string>> = {
  it: {
    Popular: "Popolare",
    New: "Novità",
    Customizable: "Personalizzabile",
    "Fast setup": "Setup rapido",
  },
  en: {
    Popular: "Popular",
    New: "New",
    Customizable: "Customizable",
    "Fast setup": "Fast setup",
  },
  es: {
    Popular: "Popular",
    New: "Nuevo",
    Customizable: "Personalizable",
    "Fast setup": "Configuración rápida",
  },
  de: {
    Popular: "Beliebt",
    New: "Neu",
    Customizable: "Individuell",
    "Fast setup": "Schnelles Setup",
  },
  fr: {
    Popular: "Populaire",
    New: "Nouveau",
    Customizable: "Personnalisable",
    "Fast setup": "Configuration rapide",
  },
};

/** Localized display label for the canonical agent badge (idempotent). */
export function localizeBadge(badge: Agent["badge"], locale: Locale): string {
  return AGENT_BADGE_LABELS[locale][badge];
}

/** Localized display values for the agent `setupTime` field, per locale. */
const SETUP_TIME_LABELS: Record<
  Exclude<Locale, "en">,
  Record<string, string>
> = {
  it: {
    "Same day": "In giornata",
    "1 day": "1 giorno",
    "2 days": "2 giorni",
  },
  es: {
    "Same day": "Mismo día",
    "1 day": "1 día",
    "2 days": "2 días",
  },
  de: {
    "Same day": "Am selben Tag",
    "1 day": "1 Tag",
    "2 days": "2 Tage",
  },
  fr: {
    "Same day": "Le jour même",
    "1 day": "1 jour",
    "2 days": "2 jours",
  },
};

/** Translate a canonical setup time to the active locale (idempotent). */
export function localizeSetupTime(
  value: string,
  locale: Locale,
): string {
  if (locale === "en") return value;
  return SETUP_TIME_LABELS[locale][value] ?? value;
}

/** Localized display name for runtime/registry agents (name + description). */
export function getLocalizedAgentInfo(
  slug: string,
  locale: Locale,
  fallback: { name: string; description: string },
): { name: string; description: string } {
  const localized = getAgentLocalization(slug, locale);
  if (!localized) return fallback;
  return { name: localized.name, description: localized.description };
}