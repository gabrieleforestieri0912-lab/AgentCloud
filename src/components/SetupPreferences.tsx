"use client";

/**
 * Sezione "Chat" di /account: agente predefinito per le nuove chat, tono e
 * lingua delle risposte, rifare l'onboarding.
 *
 * Il selettore dell'agente è lo STESO componente dell'onboarding:
 * AgentDefaultPicker. La persistenza qui è immediata al cambio (una scelta
 * per volta, senza pulsante "Salva" da ricordarsi) e segue i due canali già
 * esistenti della piattaforma:
 *   - `saveDefaultAgent` → localStorage + user_preferences (canale che
 *     ChatInterface legge davvero alle nuove conversazioni);
 *   - PATCH /api/user/setup → profiles.onboarding (copia per l'export GDPR
 *     e per eventuali usi futuri, es. personalizzazione dei prompt).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquare, RotateCcw, Languages } from "lucide-react";
import AgentDefaultPicker, { type PickerAgent } from "./AgentDefaultPicker";
import { saveDefaultAgent } from "@/lib/chat-settings";
import { TONES } from "@/lib/onboarding/constants";
import { getOnboardingCopy } from "@/lib/i18n/onboarding";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  initialDefaultAgent: string;
  initialTone: string;
  initialLanguage: string;
  agents: PickerAgent[];
};

export default function SetupPreferences({
  initialDefaultAgent,
  initialTone,
  initialLanguage,
  agents,
}: Props) {
  const router = useRouter();
  const { locale } = useLanguage();
  const copy = getOnboardingCopy(locale);
  const [defaultAgent, setDefaultAgent] = useState<string>(initialDefaultAgent);
  const [tone, setTone] = useState<string>(initialTone);
  const [language, setLanguage] = useState<string>(initialLanguage);
  const [feedback, setFeedback] = useState<string | null>(null);

  /** PATCH silenzioso: un solo campo per volta, errori non urlati. */
  async function patch(extra: Record<string, unknown>): Promise<void> {
    try {
      const res = await fetch("/api/user/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch: extra }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      // Non urliamo: il localStorage regge il default; il DB si rifà al
      // prossimo salvataggio di qualunque altra preferenza.
    }
  }

  function handleAgentChange(slug: string) {
    setDefaultAgent(slug);
    saveDefaultAgent(slug);
    void patch({ defaultAgentSlug: slug });
    setFeedback(slug === "" ? copy.defaultAgentPicker.savedNone : copy.defaultAgentPicker.saved);
    setTimeout(() => setFeedback(null), 2200);
  }

  function handleTone(value: string) {
    setTone(value);
    void patch({ tone: value || undefined });
  }

  function handleLanguage(value: string) {
    setLanguage(value);
    void patch({ language: value || undefined });
  }

  async function handleRedo() {
    if (!confirm(copy.settings.chat.redoConfirm)) return;
    try {
      const res = await fetch("/api/user/setup", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      router.push("/onboarding?again=1");
    } catch {
      setFeedback(copy.nav.saveError);
      setTimeout(() => setFeedback(null), 2400);
    }
  }

  return (
    <div
      id="chat"
      className="scroll-mt-24 rounded-2xl border border-white/5 bg-neutral-900 p-6"
    >
      <h3 className="flex items-center gap-2 text-lg font-bold text-white">
        <MessageSquare size={16} className="text-sky-400" />
        {copy.settings.chat.title}
      </h3>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {/* Agente predefinito */}
        <div>
          <p className="text-sm font-bold text-white">{copy.defaultAgentPicker.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">{copy.defaultAgentPicker.help}</p>
          <div className="mt-3">
            <AgentDefaultPicker
              mode="settings"
              agents={agents}
              value={defaultAgent}
              onChange={handleAgentChange}
            />
          </div>
        </div>

        {/* Tono + lingua + rifai onboarding */}
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-neutral-300">{copy.settings.chat.tone}</span>
            <select
              value={tone}
              onChange={(e) => handleTone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-500/50"
            >
              <option value="">—</option>
              {TONES.map((t) => (
                <option key={t} value={t}>{copy.screen6.tones[t].label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-300">
              <Languages size={13} className="text-neutral-500" />
              {copy.settings.chat.language}
            </span>
            <select
              value={language}
              onChange={(e) => handleLanguage(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-500/50"
            >
              <option value="">—</option>
              {["it", "en", "es", "de", "fr"].map((l) => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm font-bold text-amber-200">{copy.settings.chat.redo}</p>
            <p className="mt-1 text-xs text-amber-100/70">{copy.settings.chat.redoHint}</p>
            <button
              type="button"
              onClick={handleRedo}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/10"
            >
              <RotateCcw size={12} /> {copy.settings.chat.redo}
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-300" role="status">
          <Check size={14} /> {feedback}
        </p>
      )}
    </div>
  );
}
