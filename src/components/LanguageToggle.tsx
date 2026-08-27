"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const LABELS: Record<string, { current: string; other: string }> = {
  it: { current: "IT", other: "EN" },
  en: { current: "EN", other: "IT" },
};

export default function LanguageToggle({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { locale, setLocale } = useLanguage();
  const label = LABELS[locale] ?? LABELS.en;

  const onClick = () => setLocale(locale === "it" ? "en" : "it");

  if (variant === "mobile") {
    return (
      <button
        onClick={onClick}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-neutral-300 transition-colors hover:bg-white/5"
      >
        <Globe size={16} className="text-brand-400" />
        {locale === "it" ? "Italiano" : "English"}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
      aria-label="Switch language"
    >
      <Globe size={14} className="text-brand-400" />
      {label.current}
      <span className="text-neutral-600">/</span>
      <span className="text-neutral-500">{label.other}</span>
    </button>
  );
}
