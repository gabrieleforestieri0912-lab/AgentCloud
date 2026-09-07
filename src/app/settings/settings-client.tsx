"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Languages, Bell, Shield, Palette, Database, Globe, Check, Sun, Moon, Monitor, Save } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/constants";
import { useTheme, type Theme } from "@/components/ThemeProvider";

// Client delle impostazioni: preferenze locali di lingua, notifiche e dati.
// Le preferenze (toggle ecc.) sono per ora simulabili lato client — nessuna
// scrittura su DB, da qui il pulsante "Salva" fittizio.
export default function SettingsClient({ isMock, email }: { isMock: boolean; email: string }) {
  const { locale, setLocale } = useLanguage();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isIt = locale === "it";
  const [emailNotif, setEmailNotif] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">{isIt ? "Impostazioni" : "Settings"}</h1>
        <p className="mt-2 text-neutral-400">
          {isIt ? `Gestisci preferenze per ${email}` : `Manage preferences for ${email}`}
          {isMock && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">Mock admin</span>}
        </p>
      </div>

      {/* Lingua */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Languages size={16} className="text-brand-400" />
          {isIt ? "Lingua" : "Language"}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {isIt ? "Scegli la lingua della piattaforma (rilevata automaticamente dal paese)." : "Choose platform language (auto-detected from country)."}
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
        <div className="mt-4">
          <LanguageToggle />
        </div>
      </div>

      {/* Notifiche */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Bell size={16} className="text-purple-400" />
          {isIt ? "Notifiche" : "Notifications"}
        </h2>
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between rounded-xl border border-white/5 bg-neutral-800 p-4">
            <div>
              <p className="text-sm font-bold text-white">{isIt ? "Email notifiche" : "Email notifications"}</p>
              <p className="text-xs text-neutral-500">{isIt ? "Ricevi aggiornamenti su agenti e fatturazione." : "Receive updates on agents and billing."}</p>
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
              <p className="text-sm font-bold text-white">{isIt ? "Aggiornamenti prodotto" : "Product updates"}</p>
              <p className="text-xs text-neutral-500">{isIt ? "Novità su agenti e integrazioni." : "News on agents and integrations."}</p>
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
          {isIt ? "Aspetto" : "Appearance"}
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {isIt ? "Scegli il tema dell'interfaccia. Sistema segue le preferenze del dispositivo." : "Choose the interface theme. System follows your device preference."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(
            [
              { value: "light" as Theme, label: isIt ? "Chiaro" : "Light", icon: Sun, desc: isIt ? "Sfondo chiaro" : "Light background" },
              { value: "dark" as Theme, label: isIt ? "Scuro" : "Dark", icon: Moon, desc: isIt ? "Sfondo scuro" : "Dark background" },
              { value: "system" as Theme, label: isIt ? "Sistema" : "System", icon: Monitor, desc: `${isIt ? "Attuale" : "Current"}: ${resolvedTheme === "light" ? (isIt ? "chiaro" : "light") : isIt ? "scuro" : "dark"}` },
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
          {isIt ? "Privacy e dati" : "Privacy & data"}
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {isIt ? "Gestisci i tuoi dati e consulta le policy." : "Manage your data and view policies."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/privacy" className="rounded-xl border border-white/5 bg-neutral-800 p-4 text-sm font-bold text-white hover:bg-neutral-700">
            Privacy
          </Link>
          <Link href="/terms" className="rounded-xl border border-white/5 bg-neutral-800 p-4 text-sm font-bold text-white hover:bg-neutral-700">
            {isIt ? "Termini" : "Terms"}
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
          {isIt ? "Dati" : "Data"}
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {isIt ? "Esporta o richiedi la cancellazione dei tuoi dati (GDPR)." : "Export or request deletion of your data (GDPR)."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={() => alert(isIt ? "Esportazione richiesta (simulata)." : "Export requested (simulated).")} className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
            <Globe size={14} className="mr-2 inline" />
            {isIt ? "Esporta dati" : "Export data"}
          </button>
          <Link href="/contact" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100">
            {isIt ? "Contatta supporto" : "Contact support"}
          </Link>
        </div>
      </div>

      {/* Bottone unico sticky */}
      <div className="sticky bottom-4 z-20 mt-2 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-900/95 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur">
        <p className="hidden text-sm font-semibold text-neutral-400 sm:block">
          {isIt ? "Tutte le modifiche verranno salvate insieme." : "All changes will be saved together."}
        </p>
        <span className="sm:hidden text-sm font-semibold text-neutral-500">{isIt ? "Pronto a salvare" : "Ready to save"}</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400 disabled:opacity-60"
        >
          <Save size={16} />
          {saved ? (isIt ? "Salvato!" : "Saved!") : saving ? "..." : isIt ? "Salva modifiche" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
