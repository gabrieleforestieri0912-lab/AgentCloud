"use client";

/**
 * Invito a rifare il setup in dashboard, per chi NON ha mai concluso
 * l'onboarding (utenti pre-esistenti e chi l'ha interrotto a metà) o l'ha
 * saltato. Dal server arriva solo il flag "mostra": nessun dato personale.
 * La chiusura vale per la sessione: insiste poco e gentile.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { getOnboardingCopy } from "@/lib/i18n/onboarding";

const REMINDER_SEEN_KEY = "agentcloud_setup_reminder_session";

export default function SetupReminder({ show }: { show: boolean }) {
  const { locale } = useLanguage();
  const copy = getOnboardingCopy(locale);
  const [mounted, setMounted] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setSeen(sessionStorage.getItem(REMINDER_SEEN_KEY) === "1");
    } catch {
      // Storage non disponibile: resta visibile finché non lo chiudi qui.
    }
  }, []);

  function dismiss() {
    try {
      sessionStorage.setItem(REMINDER_SEEN_KEY, "1");
    } catch {
      // Solo per questo mount.
    }
    setSeen(true);
  }

  if (!mounted || !show || seen) return null;

  return (
    <div
      role="status"
      className="mx-auto mt-6 flex max-w-7xl flex-col gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Sparkles size={16} aria-hidden className="mt-0.5 text-brand-400" />
        <div>
          <p className="text-sm font-bold text-white">{copy.settings.reminderBanner.title}</p>
          <p className="text-xs text-neutral-400">{copy.settings.reminderBanner.body}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-center">
        <Link
          href="/onboarding?again=1"
          className="rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-400"
        >
          {copy.settings.reminderBanner.cta}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={copy.settings.reminderBanner.dismiss}
          className="rounded-full border border-white/10 p-2 text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
