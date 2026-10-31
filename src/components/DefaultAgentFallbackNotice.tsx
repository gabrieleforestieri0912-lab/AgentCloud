"use client";

/**
 * Avviso discreto quando l'agente predefinito salvato non è più disponibile
 * (rimosso dal catalogo o disattivato). Non è un errore: la chat funziona
 * comunque — si invita solo a rifare la scelta, una volta per sessione.
 */

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { getOnboardingCopy } from "@/lib/i18n/onboarding";

/** "Non riproporre più" in questa sessione (chiave di storage). */
const NOTICE_DISMISSED_KEY = "agentcloud_default_agent_notice_session";

export default function DefaultAgentFallbackNotice({
  agentName,
  onDismiss,
}: {
  agentName: string;
  onDismiss: () => void;
}) {
  const { locale } = useLanguage();
  const copy = getOnboardingCopy(locale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Solo dopo il mount (niente storage nel render/SSR).
    setMounted(true);
  }, []);

  if (!mounted) return null;
  try {
    if (sessionStorage.getItem(NOTICE_DISMISSED_KEY)) return null;
  } catch {
    // Storage non disponibile: mostra comunque una volta sola per questo mount.
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-40 flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-xl border border-amber-500/20 bg-neutral-900/95 px-4 py-2.5 text-xs text-amber-100 shadow-xl backdrop-blur"
      style={{ marginBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      <Info size={13} aria-hidden className="shrink-0 text-amber-400" />
      <span className="leading-relaxed">{copy.defaultAgentPicker.fallbackNotice(agentName)}</span>
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.setItem(NOTICE_DISMISSED_KEY, "1");
          } catch {}
          onDismiss();
        }}
        className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 font-bold text-neutral-200 hover:bg-white/5"
      >
        {copy.defaultAgentPicker.dismiss}
        <X size={11} aria-hidden />
      </button>
    </div>
  );
}
