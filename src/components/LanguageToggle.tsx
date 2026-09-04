"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const LOCALES = {
  en: { code: "en", short: "EN", long: "English" },
  it: { code: "it", short: "IT", long: "Italiano" },
} as const;

export default function LanguageToggle({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { locale, setLocale } = useLanguage();

  const next: "en" | "it" = locale === "en" ? "it" : "en";
  const active = LOCALES[locale];
  const isItalian = locale === "it";

  // English is the default → neutral look. Italian is the "changed" state →
  // highlighted with the brand color, so the color flips on click.
  const base = `flex items-center justify-center gap-2 rounded-full border text-xs font-bold uppercase tracking-wide transition-colors ${
    isItalian
      ? "border-brand-500/60 bg-brand-500/15 text-brand-300 hover:bg-brand-500/25"
      : "border-white/10 bg-neutral-900/60 text-neutral-300 hover:border-white/25 hover:text-white"
  }`;

  const size = variant === "mobile" ? "w-full py-3" : "h-9 px-3.5";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={`Switch language to ${LOCALES[next].long} (current: ${active.long})`}
      title={`${active.long} — click for ${LOCALES[next].long}`}
      className={`${base} ${size}`}
    >
      <Languages size={16} aria-hidden />
      <span>{active.short}</span>
    </button>
  );
}