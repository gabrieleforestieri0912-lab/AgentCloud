"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const LOCALES = [
  { code: "it", short: "IT", long: "Italiano" },
  { code: "en", short: "EN", long: "English" },
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

export default function LanguageToggle({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { locale, setLocale } = useLanguage();

  const segment = (active: boolean) =>
    `relative z-10 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
      active
        ? "bg-brand-500 text-white shadow-sm"
        : "text-neutral-400 hover:text-neutral-200"
    }`;

  const container = `relative flex items-center rounded-full border border-white/10 bg-neutral-900/60 p-0.5 backdrop-blur ${
    variant === "mobile" ? "w-full" : ""
  }`;

  return (
    <div className={container} role="group" aria-label="Language">
      <Globe size={14} className="ml-2 mr-1 shrink-0 text-brand-400" aria-hidden />
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLocale(l.code as LocaleCode)}
          aria-pressed={locale === l.code}
          aria-label={l.long}
          className={
            variant === "mobile"
              ? `flex-1 ${segment(locale === l.code)}`
              : segment(locale === l.code)
          }
        >
          {variant === "mobile" ? l.long : l.short}
        </button>
      ))}
    </div>
  );
}
