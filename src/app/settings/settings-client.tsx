"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Languages, Bell, Shield, Palette, Database, Globe, Check, Sun, Moon, Monitor, Save, Download, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/constants";
import { useTheme, type Theme } from "@/components/ThemeProvider";

// Client delle impostazioni: preferenze locali di lingua, notifiche e dati.
// Le preferenze (toggle ecc.) sono per ora simulabili lato client — nessuna
// scrittura su DB, da qui il pulsante "Salva" fittizio.
export default function SettingsClient({ isMock, email }: { isMock: boolean; email: string }) {
  const { dict, locale, setLocale } = useLanguage();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isIt = locale === "it";
  const [emailNotif, setEmailNotif] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Carica preferenze notifiche dal localStorage (persistenza reale)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("agentcloud_settings");
      if (raw) {
        const parsed = JSON.parse(raw) as { emailNotif?: boolean; productUpdates?: boolean };
        if (typeof parsed.emailNotif === "boolean") setEmailNotif(parsed.emailNotif);
        if (typeof parsed.productUpdates === "boolean") setProductUpdates(parsed.productUpdates);
      }
    } catch {}
  }, []);

  function handleSave() {
    setSaving(true);
    try {
      localStorage.setItem("agentcloud_settings", JSON.stringify({ emailNotif, productUpdates }));
    } catch {}
    // lingua e tema sono già persistiti via cookie/localStorage dai loro toggle,
    // ma il bottone unico conferma tutte le modifiche insieme
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  async function handleExport() {
    setExporting(true);
    setExportFeedback(null);
    try {
      const res = await fetch("/api/account/export", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as Record<string, unknown>));
        const msg = typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const data = (await res.json()) as Record<string, unknown>;
      // Arricchisce l'export con lo snapshot del browser (GDPR: include preferenze locali)
      try {
        const localPrefsRaw = localStorage.getItem("agentcloud_settings");
        if (localPrefsRaw) {
          try {
            data.local_preferences = JSON.parse(localPrefsRaw) as unknown;
          } catch {
            data.local_preferences_raw = localPrefsRaw;
          }
        }
        const browserSnapshot: Record<string, string> = {};
        for (const key of ["agentcloud_settings", "agentcloud_theme", "theme", "locale"]) {
          const v = localStorage.getItem(key);
          if (v) browserSnapshot[key] = v;
        }
        // cookie lingua salvato dal LanguageProvider (via document.cookie) — già incluso
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
      const safeEmail = email ? email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "_") : "utente";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">{dict.chat.settingsPageTitle}</h1>
        <p className="mt-2 text-neutral-400">
          {t(dict.chat.settingsPageDesc, { email })}
          {isMock && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">Mock admin</span>}
        </p>
      </div>

      {/* Lingua */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Languages size={16} className="text-brand-400" />
          {dict.chat.settingsLanguage}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {dict.chat.settingsLanguageDesc}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LOCALES.map((code) => {
            const label = LOCALE_LABELS[code];
            const active = locale === code;
            return (
              <button
                key={code}
                onClick={() => setLocale(code)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${active ? "bg-brand-500 text-white" : "border border-white/10 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"}`}
              >
                {label.short} — {label.long} {active && <Check size={12} className="ml-1 inline" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifiche */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Bell size={16} className="text-purple-400" />
          {dict.chat.settingsNotifications}
        </h2>
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between rounded-xl border border-white/5 bg-neutral-800 p-4">
            <div>
              <p className="text-sm font-bold text-white">{dict.chat.settingsEmailNotif}</p>
              <p className="text-xs text-neutral-500">{dict.chat.settingsEmailNotifDesc}</p>
            </div>
            <button
              onClick={() => setEmailNotif((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${emailNotif ? "bg-brand-500" : "bg-neutral-700"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${emailNotif ? "left-5" : "left-0.5"}`} />
            </button>
          </label>
          <label className="flex items-center justify-between rounded-xl border border-white/5 bg-neutral-800 p-4">
            <div>
              <p className="text-sm font-bold text-white">{dict.chat.settingsProductUpdates}</p>
              <p className="text-xs text-neutral-500">{dict.chat.settingsProductUpdatesDesc}</p>
            </div>
            <button
              onClick={() => setProductUpdates((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${productUpdates ? "bg-brand-500" : "bg-neutral-700"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${productUpdates ? "left-5" : "left-0.5"}`} />
            </button>
          </label>
        </div>
      </div>

      {/* Aspetto */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Palette size={16} className="text-pink-400" />
          {dict.chat.settingsAppearance}
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {dict.chat.settingsAppearanceDesc}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(
            [
              { value: "light" as Theme, label: dict.chat.settingsLight, icon: Sun, desc: dict.chat.settingsLightDesc },
              { value: "dark" as Theme, label: dict.chat.settingsDark, icon: Moon, desc: dict.chat.settingsDarkDesc },
              { value: "system" as Theme, label: dict.chat.settingsSystem, icon: Monitor, desc: t(dict.chat.settingsSystemDesc, { theme: resolvedTheme === "light" ? (locale === "it" ? "chiaro" : "light") : locale === "it" ? "scuro" : "dark" }) },
            ] as const
          ).map(({ value, label, icon: Icon, desc }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${active ? "border-brand-500 bg-brand-500/10" : "border-white/5 bg-neutral-800 hover:bg-neutral-700/60"}`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-brand-500 text-white" : "bg-white/5 text-neutral-400"}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-bold ${active ? "text-white" : "text-neutral-200"}`}>{label} {active && <Check size={12} className="ml-1 inline text-brand-400" />}</span>
                  <span className="block text-xs text-neutral-500">{desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy e dati */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Shield size={16} className="text-emerald-400" />
          {dict.chat.settingsPrivacy}
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {dict.chat.settingsPrivacyDesc}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/privacy" className="rounded-xl border border-white/5 bg-neutral-800 p-4 text-sm font-bold text-white hover:bg-neutral-700">
            Privacy
          </Link>
          <Link href="/terms" className="rounded-xl border border-white/5 bg-neutral-800 p-4 text-sm font-bold text-white hover:bg-neutral-700">
            {dict.chat.settingsTerms}
          </Link>
          <Link href="/account" className="rounded-xl border border-white/5 bg-neutral-800 p-4 text-sm font-bold text-white hover:bg-neutral-700">
            Account
          </Link>
        </div>
      </div>

      {/* Dati */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Database size={16} className="text-sky-400" />
          {dict.chat.settingsData}
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {dict.chat.settingsDataDesc}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {dict.chat.settingsDataExportDesc}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-busy={exporting}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? (dict.chat.settingsExporting) : dict.chat.settingsExportData}
          </button>
          <Link href="/contact" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100">
            {dict.chat.settingsContactSupport}
          </Link>
          {exportFeedback && (
            <span
              role="status"
              aria-live="polite"
              className={`text-sm font-semibold ${exportFeedback.includes("Errore") || exportFeedback.includes("failed") || exportFeedback.includes("Devi") || exportFeedback.includes("must") ? "text-red-400" : "text-emerald-400"}`}
            >
              {exportFeedback}
            </span>
          )}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
          <Globe size={12} />
          {dict.chat.settingsExportFormat}
        </p>
      </div>

      {/* Bottone unico sticky */}
      <div className="sticky bottom-4 z-20 mt-2 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-900/95 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="hidden text-sm font-semibold text-neutral-400 sm:block">
          {dict.chat.settingsAllChangesSaved}
        </p>
        <span className="sm:hidden text-sm font-semibold text-neutral-500">{dict.chat.settingsReadyToSave}</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400 disabled:opacity-60"
        >
          <Save size={16} />
          {saved ? (dict.chat.settingsSaved) : saving ? "..." : dict.chat.settingsSaveChanges}
        </button>
      </div>
    </div>
  );
}
