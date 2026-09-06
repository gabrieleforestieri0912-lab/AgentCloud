"use client";

import { useState, useRef, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/constants";

export default function LanguageToggle({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const active = LOCALE_LABELS[locale];
  const isNonDefault = locale !== "en";

  const base = `flex items-center justify-center gap-2 rounded-full border text-xs font-bold uppercase tracking-wide transition-colors ${
    isNonDefault
      ? "border-brand-500/60 bg-brand-500/15 text-brand-300 hover:bg-brand-500/25"
      : "border-white/10 bg-neutral-900/60 text-neutral-300 hover:border-white/25 hover:text-white"
  }`;

  const size = variant === "mobile" ? "w-full py-3" : "h-9 px-3.5";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Language: ${active.long} — choose language`}
        title={active.long}
        className={`${base} ${size}`}
      >
        <Languages size={16} aria-hidden />
        <span>{active.short}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-36 rounded-xl border border-white/10 bg-neutral-900 p-1 shadow-xl">
          {LOCALES.map((code) => {
            const label = LOCALE_LABELS[code as Locale];
            const isActive = locale === code;
            return (
              <button
                key={code}
                onClick={() => {
                  setLocale(code as Locale);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-brand-500 text-white"
                    : "text-neutral-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>
                  {label.short} — {label.long}
                </span>
                {isActive && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
