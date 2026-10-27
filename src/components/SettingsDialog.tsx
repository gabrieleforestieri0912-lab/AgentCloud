"use client";

/**
 * Impostazioni in-modal, accessibili direttamente dalla chat.
 *
 * Inspirazione Claude.ai: pannello a due colonne (sezioni a sinistra,
 * contenuto a destra) dentro una modale, così l'utente non abbandona la
 * pagina della chat per cambiare tema, lingua o notifiche.
 *
 * Le preferenze sono applicate e salvate subito (localStorage / cookie / API
 * per le preferenze notifiche per categoria): niente bottone "Salva", in una
 * modale il modello giusto è l'auto-commit.
 *
 * Non renderizzata su pagina astratta: usa esso stesso il portale su
 * `document.body` come AccountMenu/KeyboardShortcutsDialog.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  Check,
  Database,
  Download,
  Languages,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
  X,
} from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { useTheme, type Theme } from "./ThemeProvider";
import { t } from "@/lib/i18n/dictionaries";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/constants";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@/lib/notification-rules";

type TabId = "appearance" | "language" | "notifications" | "privacy";

export default function SettingsDialog({
  email,
  onClose,
}: {
  email: string;
  onClose: () => void;
}) {
  const { dict, locale, setLocale } = useLanguage();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>("appearance");
  const [emailNotif, setEmailNotif] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean> | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Escape chiude la modale prima di qualsiasi altro handler.
  useEffect(() => {
    panelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  // Toggle email/aggiornamenti: letti dal localStorage (stessa chiave della
  // pagina impostazioni estesa) e ri-salvati a ogni cambiamento.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("agentcloud_settings");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          emailNotif?: boolean;
          productUpdates?: boolean;
        };
        if (typeof parsed.emailNotif === "boolean") {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setEmailNotif(parsed.emailNotif);
        }
        if (typeof parsed.productUpdates === "boolean") {
          setProductUpdates(parsed.productUpdates);
        }
      }
    } catch {}
    // Preferenze per categoria: una riga = categoria attiva.
    queueMicrotask(() => {
      fetch("/api/notifications/preferences", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as unknown) : null))
        .then((d: unknown) => {
          const prefs = (d as { preferences?: { category: string; enabled: boolean }[] })
            ?.preferences;
          if (!prefs) return;
          const map: Record<string, boolean> = {};
          for (const p of prefs) map[p.category] = p.enabled !== false;
          setNotifPrefs(map);
        })
        .catch(() => {});
    });
  }, []);

  function persistLocalToggles(next: { emailNotif: boolean; productUpdates: boolean }) {
    try {
      localStorage.setItem("agentcloud_settings", JSON.stringify(next));
    } catch {}
  }

  function toggleEmailNotif() {
    setEmailNotif((v) => {
      const next = { emailNotif: !v, productUpdates };
      persistLocalToggles(next);
      return next.emailNotif;
    });
  }

  function toggleProductUpdates() {
    setProductUpdates((v) => {
      const next = { emailNotif, productUpdates: !v };
      persistLocalToggles(next);
      return next.productUpdates;
    });
  }

  async function toggleNotifCategory(category: NotificationCategory, enabled: boolean) {
    setNotifPrefs((prev) => ({ ...(prev ?? {}), [category]: enabled }));
    try {
      await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, enabled }),
      });
    } catch {
      // best-effort: lo stato locale resta, il server si riallinea al reload
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportFeedback(null);
    try {
      const res = await fetch("/api/account/export", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as Record<string, unknown>);
        const msg = typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const data = (await res.json()) as Record<string, unknown>;
      // Snapshot del browser nell'export (GDPR: preferenze locali incluse).
      try {
        const localPrefsRaw = localStorage.getItem("agentcloud_settings");
        if (localPrefsRaw) {
          data.local_preferences = JSON.parse(localPrefsRaw) as unknown;
        }
        const browserSnapshot: Record<string, string> = {};
        for (const key of ["agentcloud_settings", "agentcloud_theme", "theme", "locale"]) {
          const v = localStorage.getItem(key);
          if (v) browserSnapshot[key] = v;
        }
        if (Object.keys(browserSnapshot).length > 0) {
          data.browser_storage_snapshot = browserSnapshot;
        }
        data.export_client_meta = {
          locale,
          theme: resolvedTheme,
          exported_by: email,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        };
      } catch {}
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      const safeEmail = email
        ? email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "_")
        : "utente";
      a.download = `agentcloud-export-${safeEmail}-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setExportFeedback(dict.chat.settingsExportSuccess);
      setTimeout(() => setExportFeedback(null), 3200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "unauthorized") {
        setExportFeedback(dict.chat.settingsExportUnauthorized);
      } else {
        setExportFeedback(t(dict.chat.settingsExportError, { msg }));
      }
      setTimeout(() => setExportFeedback(null), 4500);
    } finally {
      setExporting(false);
    }
  }

  const tabs: { id: TabId; label: string; icon: typeof Palette }[] = [
    { id: "appearance", label: dict.chat.settingsAppearance, icon: Palette },
    { id: "language", label: dict.chat.settingsLanguage, icon: Languages },
    { id: "notifications", label: dict.chat.settingsNotifications, icon: Bell },
    { id: "privacy", label: dict.chat.settingsPrivacy, icon: Shield },
  ];

  const toggleBase =
    "relative h-6 w-11 shrink-0 rounded-full transition-colors bg-neutral-700 data-[on=true]:bg-brand-500";
  const toggleKnob =
    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={dict.chat.close}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={dict.accountPage.settingsTitle}
        tabIndex={-1}
        className="relative flex h-[70vh] max-h-[560px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/70 outline-none"
      >
        {/* Header */}
        <div className="flex items-center border-b border-white/[0.08] px-5 py-4">
          <h2 className="min-w-0 flex-1 text-base font-bold text-white">
            {dict.accountPage.settingsTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.chat.close}
            className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Colonna sezioni */}
          <nav
            aria-label={dict.accountPage.settingsTitle}
            className="w-44 shrink-0 space-y-0.5 overflow-y-auto border-r border-white/[0.06] p-2 max-sm:w-36"
          >
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => setTab(id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold transition-colors ${
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icon size={15} className="shrink-0 text-neutral-400" aria-hidden />
                  <span className="min-w-0 truncate">{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Contenuto della sezione */}
          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            {tab === "appearance" && (
              <section>
                <p className="text-sm text-neutral-400">{dict.chat.settingsAppearanceDesc}</p>
                <div className="mt-4 grid gap-2">
                  {(
                    [
                      { value: "light" as Theme, label: dict.chat.settingsLight, icon: Sun, desc: dict.chat.settingsLightDesc },
                      { value: "dark" as Theme, label: dict.chat.settingsDark, icon: Moon, desc: dict.chat.settingsDarkDesc },
                      { value: "system" as Theme, label: dict.chat.settingsSystem, icon: Monitor, desc: t(dict.chat.settingsSystemDesc, { theme: resolvedTheme === "light" ? dict.chat.themeLight : dict.chat.themeDark }) },
                    ]
                  ).map(({ value, label, icon: Icon, desc }) => {
                    const active = theme === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        aria-pressed={active}
                        className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                          active
                            ? "border-brand-500 bg-brand-500/10"
                            : "border-white/5 bg-neutral-800 hover:bg-neutral-700/60"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            active ? "bg-brand-500 text-white" : "bg-white/5 text-neutral-400"
                          }`}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-bold ${active ? "text-white" : "text-neutral-200"}`}>
                            {label}
                          </span>
                          <span className="block text-xs text-neutral-500">{desc}</span>
                        </span>
                        {active && <Check size={15} className="shrink-0 text-brand-300" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === "language" && (
              <section>
                <p className="text-sm text-neutral-400">{dict.chat.settingsLanguageDesc}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {LOCALES.map((code) => {
                    const active = locale === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setLocale(code)}
                        aria-pressed={active}
                        className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm font-bold transition-colors ${
                          active
                            ? "border-brand-500 bg-brand-500/10 text-white"
                            : "border-white/5 bg-neutral-800 text-neutral-300 hover:bg-neutral-700/60"
                        }`}
                      >
                        <span className="min-w-0 truncate">
                          {LOCALE_LABELS[code].short} — {LOCALE_LABELS[code].long}
                        </span>
                        {active && <Check size={14} className="shrink-0 text-brand-300" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === "notifications" && (
              <section className="space-y-3">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-neutral-800 p-3.5">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">{dict.chat.settingsEmailNotif}</span>
                    <span className="block text-xs text-neutral-500">{dict.chat.settingsEmailNotifDesc}</span>
                  </span>
                  <button
                    type="button"
                    onClick={toggleEmailNotif}
                    aria-pressed={emailNotif}
                    data-on={emailNotif}
                    className={toggleBase}
                  >
                    <span className={`${toggleKnob} ${emailNotif ? "left-5" : "left-0.5"}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-neutral-800 p-3.5">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">{dict.chat.settingsProductUpdates}</span>
                    <span className="block text-xs text-neutral-500">{dict.chat.settingsProductUpdatesDesc}</span>
                  </span>
                  <button
                    type="button"
                    onClick={toggleProductUpdates}
                    aria-pressed={productUpdates}
                    data-on={productUpdates}
                    className={toggleBase}
                  >
                    <span className={`${toggleKnob} ${productUpdates ? "left-5" : "left-0.5"}`} />
                  </button>
                </label>

                {/* Notifiche per categoria agente: persistite via API */}
                {notifPrefs !== null && (
                  <div className="rounded-xl border border-white/5 bg-neutral-800 p-3.5">
                    <p className="text-sm font-bold text-white">{dict.notifications.prefsTitle}</p>
                    <p className="text-xs text-neutral-500">{dict.notifications.prefsDesc}</p>
                    <div className="mt-2 space-y-0.5">
                      {NOTIFICATION_CATEGORIES.map((cat) => {
                        const enabled = notifPrefs[cat] !== false;
                        return (
                          <div key={cat} className="flex items-center justify-between gap-2 py-1.5">
                            <span className="min-w-0 truncate text-xs font-bold text-neutral-300">
                              {dict.notifications.cats[cat] ?? cat}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleNotifCategory(cat, !enabled)}
                              aria-pressed={enabled}
                              data-on={enabled}
                              className={toggleBase}
                            >
                              <span className={`${toggleKnob} ${enabled ? "left-5" : "left-0.5"}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {tab === "privacy" && (
              <section className="space-y-3">
                <div className="rounded-xl border border-white/5 bg-neutral-800">
                  <p className="p-3.5 pb-2 text-sm font-bold text-white">{dict.chat.settingsPrivacy}</p>
                  <p className="px-3.5 pb-3 text-xs text-neutral-500">{dict.chat.settingsPrivacyDesc}</p>
                  <div className="flex flex-wrap gap-2 px-3.5 pb-3.5">
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                    >
                      Privacy
                    </a>
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                    >
                      {dict.chat.settingsTerms}
                    </a>
                    <a
                      href="/account"
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                    >
                      Account
                    </a>
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-neutral-800">
                  <p className="p-3.5 pb-2 text-sm font-bold text-white">{dict.chat.settingsData}</p>
                  <p className="px-3.5 pb-3 text-xs text-neutral-500">{dict.chat.settingsDataExportDesc}</p>
                  <div className="flex flex-wrap items-center gap-2 px-3.5 pb-3.5">
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={exporting}
                      aria-busy={exporting}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      {exporting ? dict.chat.settingsExporting : dict.chat.settingsExportData}
                    </button>
                    {exportFeedback && (
                      <span
                        role="status"
                        aria-live="polite"
                        className={`min-w-0 text-xs font-semibold ${
                          exportFeedback.includes("Errore") ||
                          exportFeedback.includes("failed") ||
                          exportFeedback.includes("Devi") ||
                          exportFeedback.includes("must")
                            ? "text-red-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {exportFeedback}
                      </span>
                    )}
                  </div>
                  <p className="flex items-center gap-1.5 px-3.5 pb-3.5 text-[11px] text-neutral-500">
                    <Database size={11} />
                    {dict.chat.settingsExportFormat}
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
