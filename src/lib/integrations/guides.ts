/**
 * Guide passo-passo per ogni integrazione disponibile.
 * Testi semplici, non tecnici, per utenti non sviluppatori.
 * I testi vivono nei dizionari i18n (integrationGuides) così la guida segue
 * la lingua dell'utente; qui resta solo la struttura.
 */

import type { Dictionary } from "@/lib/i18n/dictionaries";

export type GuideStep = {
  title: string;
  desc: string;
};

export type IntegrationGuide = {
  provider: string; // brand lower, es. "shopify" | "gmail" | "github" etc
  whatItDoes: string;
  steps: [GuideStep, GuideStep, GuideStep];
  needHelp?: string;
  time: string;
};

type GuideTexts = Dictionary["integrationGuides"][keyof Dictionary["integrationGuides"]];

const GUIDE_BRANDS = [
  "shopify",
  "github",
  "clickup",
  "asana",
  "gmail",
  "googlecalendar",
  "hubspot",
  "notion",
  "googlesheets",
  "slack",
] as const;

export function getGuideForBrand(brand: string, dict: Dictionary): IntegrationGuide | null {
  const key = brand.toLowerCase();
  if (!(GUIDE_BRANDS as readonly string[]).includes(key)) return null;
  const g = dict.integrationGuides[key as keyof Dictionary["integrationGuides"]] as GuideTexts;
  if (!g) return null;
  return {
    provider: key,
    whatItDoes: g.whatItDoes,
    time: g.time,
    steps: [
      { title: g.prepare, desc: g.prepareDesc },
      { title: g.connect, desc: g.connectDesc },
      { title: g.tryStep, desc: g.tryDesc },
    ],
    ...(g.needHelp ? { needHelp: g.needHelp } : {}),
  };
}
