"use client";

/**
 * Header dell'area applicativa (chat/dashboard/impostazioni).
 *
 * Mostra logo, titolo di contesto (es. nome agente attivo o email utente) e
 * controlli condivisi: passaggio dashboard/chat e campanella notifiche.
 * La variante cambia i link di ritorno (back to home/area).
 * Nella variante "chat" l'header è trasparente (nessuno sfondo/bordo) e
 * espone la rotella delle impostazioni in alto a destra.
 */
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LayoutDashboard, MessageSquare, Monitor, Moon, Settings, Sun } from "lucide-react";
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
  title,
  subtitle,
  agentLabel,
  quickSettings,
}: AppHeaderProps) {
  const { dict, locale, setLocale } = useLanguage();
  const { theme, setTheme } = useTheme();
  const homeLabel = dict.appHeader.backHome;
  const dashboardLabel = dict.appHeader.dashboard;
  const chatLabel = dict.appHeader.chat;
  const settingsLabel = dict.navbar.settings;
  // In chat l'header è sovrapposto al contenuto: niente sfondo né bordo, così
  // resta trasparente sul fondo della pagina.
  const transparent = variant === "chat";

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

  const defaultTitle =
    variant === "dashboard"
      ? dashboardLabel
      : (agentLabel ?? chatLabel);

  const displayTitle = title ?? defaultTitle;

  return (
    <header
      className={`sticky top-0 z-40 ${
        transparent ? "bg-transparent" : "border-b border-white/5 bg-neutral-950/90 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 3xl:max-w-[1720px]">
        {/* Sinistra */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="relative h-7 w-7 overflow-hidden rounded-lg">
              <Image src="/agentcloud.png" alt="AgentCloud" fill className="object-cover" sizes="28px" />
            </span>
            <span className="hidden text-sm font-bold tracking-tight text-white sm:inline">
              AgentCloud
            </span>
          </Link>
          <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-white">{displayTitle}</h1>
            {subtitle && (
              <p className="hidden truncate text-xs text-neutral-500 sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Destra */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Passaggio dashboard/chat. In chat il link alla chat è inutile (ci
              si trova già): resta solo quello alla dashboard. */}
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                variant === "dashboard"
                  ? "bg-white text-neutral-900"
                  : "border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutDashboard size={14} />
              {dashboardLabel}
            </Link>
            {variant !== "chat" && (
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <MessageSquare size={14} />
                {chatLabel}
              </Link>
            )}
          </nav>

          <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />

          {variant === "dashboard" && (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">{homeLabel}</span>
              <span className="sm:hidden">{homeLabel}</span>
            </Link>
          )}

          {variant === "chat" && (
            <div className="relative" ref={quickRef}>
              <button
                type="button"
                onClick={() => setQuickSettingsOpen((v) => !v)}
                title={settingsLabel}
                aria-label={settingsLabel}
                aria-haspopup="dialog"
                aria-expanded={quickSettingsOpen}
                className="flex h-11 w-11 lg:h-8 lg:w-8 items-center justify-center text-neutral-400 transition-colors hover:text-white"
              >
                <Settings size={18} strokeWidth={1.75} />
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

          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
