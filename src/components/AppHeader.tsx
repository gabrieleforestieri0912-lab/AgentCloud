"use client";

/**
 * Header dell'area applicativa (chat/dashboard/impostazioni).
 *
 * Mostra logo (che torna alla home), titolo di contesto (es. nome agente
 * attivo o email utente) e controlli condivisi: campanella notifiche e, in
 * chat, la rotella delle impostazioni rapide. La navigazione tra dashboard,
 * chat e home vive già nella sidebar, quindi l'header non duplica quei link.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { useTheme, type Theme } from "./ThemeProvider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/constants";
import { CHAT_TEXT_SIZES, type ChatTextSize } from "@/lib/chat-settings";
import NotificationBell from "./NotificationBell";

type QuickSettings = {
  /** Agenti che l'utente può usare (stesso elenco del selettore in chat). */
  agents: { slug: string; name: string }[];
  /** Slug dell'agente usato dalle nuove chat; vuoto = chat generica. */
  defaultAgentSlug: string;
  onDefaultAgentChange: (slug: string) => void;
  textSize: ChatTextSize;
  onTextSizeChange: (size: ChatTextSize) => void;
};

type AppHeaderProps = {
  variant: "dashboard" | "chat";
  title?: string;
  subtitle?: string;
  agentLabel?: string;
  /** Preferenze rapide mostrate dal pannello della rotella (variante chat). */
  quickSettings?: QuickSettings;
};

export default function AppHeader({
  variant,
  quickSettings,
}: AppHeaderProps) {
  const { dict, locale, setLocale } = useLanguage();
  const { theme, setTheme } = useTheme();
  const settingsLabel = dict.navbar.settings;

  // Impostazioni rapide della chat: la rotella apre un pannello con le
  // preferenze usate più spesso (lingua e tema) invece di portare subito alla
  // pagina impostazioni, che resta raggiungibile dal pannello stesso.
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!quickSettingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickSettingsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [quickSettingsOpen]);

  const themeOptions = [
    { value: "light" as Theme, label: dict.chat.settingsLight, icon: Sun },
    { value: "dark" as Theme, label: dict.chat.settingsDark, icon: Moon },
    { value: "system" as Theme, label: dict.chat.settingsSystem, icon: Monitor },
  ];

  const textSizeLabels: Record<ChatTextSize, string> = {
    sm: dict.chat.quickTextSizeSmall,
    md: dict.chat.quickTextSizeNormal,
    lg: dict.chat.quickTextSizeLarge,
  };

  return (
    // Header trasparente e sovrapposto: niente barra, niente logo, niente
    // titolo — solo i bottoni fluttuanti in alto a destra. Il contenitore non
    // intercetta i click (il contenuto scorre sotto) e il margine negativo
    // annulla l'altezza, così non ruba spazio verticale. I link a dashboard,
    // chat e home vivono già nella sidebar: non duplicarli qui.
    <header className="pointer-events-none sticky top-0 z-40 -mb-14 flex h-14 items-start justify-end px-4 pt-3 sm:px-6">
      <div className="pointer-events-auto flex items-center gap-2">
        {variant === "chat" && (
          <div className="relative" ref={quickRef}>
            <button
              type="button"
              onClick={() => setQuickSettingsOpen((v) => !v)}
              title={settingsLabel}
              aria-label={settingsLabel}
              aria-haspopup="dialog"
              aria-expanded={quickSettingsOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-neutral-900/80 text-neutral-400 backdrop-blur transition-colors hover:text-white"
            >
              <Settings size={17} strokeWidth={1.75} />
            </button>

              {quickSettingsOpen && (
                <>
                  {/* Chiude il pannello cliccando fuori. */}
                  <button
                    type="button"
                    aria-label={settingsLabel}
                    onClick={() => setQuickSettingsOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div
                    role="dialog"
                    aria-label={settingsLabel}
                    className="absolute right-0 top-10 z-50 max-h-[80dvh] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-neutral-900/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
                  >
                    {/* Lingua */}
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      {dict.chat.settingsLanguage}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {LOCALES.map((code) => {
                        const active = locale === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setLocale(code)}
                            aria-pressed={active}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                              active
                                ? "bg-brand-500 text-white"
                                : "border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {LOCALE_LABELS[code].short}
                            {active && <Check size={11} className="ml-1 inline" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tema */}
                    <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      {dict.chat.settingsAppearance}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {themeOptions.map(({ value, label, icon: Icon }) => {
                        const active = theme === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setTheme(value)}
                            aria-pressed={active}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-bold transition-colors ${
                              active
                                ? "border-brand-500 bg-brand-500/10 text-white"
                                : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <Icon size={15} />
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {quickSettings && (
                      <>
                        {/* Agente predefinito delle nuove chat */}
                        <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          {dict.chat.quickDefaultAgent}
                        </p>
                        <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                          <button
                            type="button"
                            onClick={() => quickSettings.onDefaultAgentChange("")}
                            aria-pressed={quickSettings.defaultAgentSlug === ""}
                            className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                              quickSettings.defaultAgentSlug === ""
                                ? "border-brand-500 bg-brand-500/10 text-white"
                                : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <span className="truncate">{dict.chat.quickDefaultAgentNone}</span>
                            {quickSettings.defaultAgentSlug === "" && <Check size={12} className="shrink-0" />}
                          </button>
                          {quickSettings.agents.map((agent) => {
                            const active = quickSettings.defaultAgentSlug === agent.slug;
                            return (
                              <button
                                key={agent.slug}
                                type="button"
                                onClick={() => quickSettings.onDefaultAgentChange(agent.slug)}
                                aria-pressed={active}
                                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                                  active
                                    ? "border-brand-500 bg-brand-500/10 text-white"
                                    : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <span className="truncate">{agent.name}</span>
                                {active && <Check size={12} className="shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Dimensione del testo della chat */}
                        <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          {dict.chat.quickTextSize}
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {CHAT_TEXT_SIZES.map((size) => {
                            const active = quickSettings.textSize === size;
                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => quickSettings.onTextSizeChange(size)}
                                aria-pressed={active}
                                className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition-colors ${
                                  active
                                    ? "border-brand-500 bg-brand-500/10 text-white"
                                    : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                {textSizeLabels[size]}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    <Link
                      href="/settings"
                      onClick={() => setQuickSettingsOpen(false)}
                      className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-neutral-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {dict.chat.settingsPageTitle}
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}

          {/* La campanella ha già il suo bottone: qui prende solo il guscio
              fluttuante, coerente con la rotella. */}
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-neutral-900/80 backdrop-blur">
            <NotificationBell />
          </span>
        </div>
    </header>
  );
}
