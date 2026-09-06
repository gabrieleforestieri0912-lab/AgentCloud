"use client";

import { useState } from "react";
import Link from "next/link";
import { Languages, Bell, Shield, Palette, Database, Globe, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/constants";

export default function SettingsClient({ locale: initialLocale, isMock, email }: { locale: Locale; isMock: boolean; email: string }) {
  const { locale, setLocale } = useLanguage();
  const isIt = locale === "it";
  const [emailNotif, setEmailNotif] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        <button onClick={handleSave} className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100">
          {saved ? (isIt ? "Salvato!" : "Saved!") : isIt ? "Salva preferenze" : "Save preferences"}
        </button>
      </div>

      {/* Aspetto */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Palette size={16} className="text-pink-400" />
          {isIt ? "Aspetto" : "Appearance"}
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {isIt ? "Tema scuro ottimizzato per lavoro prolungato. Altri temi in arrivo." : "Dark theme optimized for long work sessions. More themes coming soon."}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-800 px-4 py-2 text-sm font-bold text-white">
          <span className="h-2 w-2 rounded-full bg-neutral-900 border border-white/20" />
          {isIt ? "Scuro (predefinito)" : "Dark (default)"}
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
    </div>
  );
}
