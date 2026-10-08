"use client";

import { CheckCircle2, Circle, Clock3, AlertCircle, Plug, Unplug, Loader2, ArrowRight, Sparkles } from "lucide-react";
import BrandLogo from "./BrandLogo";
import Link from "next/link";
import { getGuideForBrand, type IntegrationGuide } from "@/lib/integrations/guides";
import { useLanguage } from "./LanguageProvider";
import type { TenantInputField } from "@/lib/integrations/catalog";

type Props = {
  brand: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
  pending?: boolean;
  error?: boolean;
  workspace?: string | null;
  updatedAt?: string | null;
  busy?: boolean;
  onConnectHref?: string;
  onDisconnect?: () => void;
  variant?: "card" | "compact";
  /**
   * Campi che l'utente deve inserire prima di autorizzare (WooCommerce: URL dello
   * store + WordPress User ID). Quando presenti il CTA diventa un form GET verso
   * la route authorize invece di un link: nessuno stato client, nessun segreto
   * esposto al browser oltre i dati che l'utente sta scrivendo.
   */
  tenantFields?: readonly TenantInputField[];
  /**
   * Quante competenze del catalonto usano questa integrazione.
   *
   * Perché serve: la pagina integrazioni risponde a "a cosa mi serve questa
   * app?". Il conteggio viene dal catalogo Competenze (l'unica fonte), non da
   * una query: sono dati pubblici e statici come il resto del catalogo.
   */
  skillsCount?: number;
};

export default function IntegrationSteps({
  brand,
  name,
  category,
  description,
  connected,
  pending,
  error,
  workspace,
  onConnectHref,
  onDisconnect,
  busy,
  tenantFields,
  skillsCount,
}: Props) {
  const guide: IntegrationGuide | null = getGuideForBrand(brand);
  const dict = useLanguage();
  const ig = dict.dict.integrationsGrid;

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900 p-5 flex flex-col hover:border-white/15 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/5">
            <BrandLogo slug={brand} size={22} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{name}</h3>
            <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-neutral-500">
              <span>{category} · {guide?.time ?? "2 min"}</span>
              {/* Requisito di Fase 4: rendere visibile che il collegamento è
                  gratuito. Solo su quanto connette, non su "Prossimamente":
                  lì non si collega niente e il badge sarebbe fuorviante. */}
              {!connected && !pending && !error && (
                <span
                  title={ig.freeBadgeTitle}
                  className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300"
                >
                  {ig.freeBadge}
                </span>
              )}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
            connected
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
              : error
                ? "bg-red-500/10 text-red-300 border-red-500/20"
                : pending
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                  : "bg-white/5 text-neutral-400 border-white/5"
          }`}
        >
          {connected ? <CheckCircle2 size={12} /> : error ? <AlertCircle size={12} /> : pending ? <Clock3 size={12} /> : <Plug size={12} />}
          {connected ? "Connesso" : error ? "Errore" : pending ? "In attesa" : "Non connesso"}
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-neutral-300">{guide?.whatItDoes ?? description}</p>

      {/* Usata da N competenze: collega questa card al catalogo Competenze,
          così l'utente vede subito il valore dell'integrazione. */}
      {skillsCount !== undefined && skillsCount > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
          <Sparkles size={11} className="shrink-0 text-brand-400" />
          {`Usata da ${skillsCount} ${skillsCount === 1 ? "competenza" : "competenze"}`}
          <Link
            href={`/skills?integration=${brand}`}
            className="font-bold text-brand-400 underline-offset-2 hover:underline"
          >
            scopri
          </Link>
        </p>
      )}

      {/* 3 passi */}
      {guide ? (
        <ol className="mt-4 space-y-2.5">
          {guide.steps.map((s, i) => {
            const stepNum = i + 1;
            const isDone = connected && stepNum <= 2 ? true : connected && stepNum === 3 ? true : stepNum === 1 ? true : stepNum === 2 ? false : connected;
            const isActive = !connected && stepNum === 2;
            return (
              <li key={stepNum} className={`flex gap-3 rounded-xl border px-3 py-3 ${isActive ? "border-brand-500/30 bg-brand-500/5" : "border-white/5 bg-white/[0.02]"}`}>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold border ${
                    connected || isDone
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : isActive
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-neutral-800 text-neutral-400 border-white/10"
                  }`}
                >
                  {connected || isDone ? <CheckCircle2 size={12} /> : stepNum}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                    Passo {stepNum} · {s.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-5 text-neutral-200">{s.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-3 text-sm leading-6 text-neutral-400">{description}</p>
      )}

      {guide?.needHelp && !connected && (
        <p className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs leading-5 text-amber-200">
          Suggerimento: {guide.needHelp}
        </p>
      )}

      {workspace && (
        <p className="mt-3 truncate text-xs text-neutral-500">
          <span className="font-semibold text-neutral-400">Account:</span> {workspace}
        </p>
      )}

      {/* CTA */}
      <div className="mt-4">
        {connected ? (
          onDisconnect ? (
            <button
              onClick={onDisconnect}
              disabled={busy}
              aria-label={`Disconnetti ${name}`}
              aria-busy={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 focus-visible:outline-none"
            >
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Unplug size={14} aria-hidden="true" />}
              Disconnetti
            </button>
          ) : (
            <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300">
              <CheckCircle2 size={14} /> Collegato — pronto all’uso
            </span>
          )
        ) : tenantFields && onConnectHref?.startsWith("/api/") ? (
          /* GET verso la route authorize: la validazione dei dati avviene server
             side e i valori finiscono nello state firmato, non nel browser. */
          <form action={onConnectHref} method="get" className="space-y-3">
            {tenantFields.map((f) => (
              <div key={f.key} className="text-left">
                <label
                  htmlFor={`${brand}-${f.key}`}
                  className="block text-xs font-bold uppercase tracking-widest text-neutral-400"
                >
                  {f.label}
                </label>
                <input
                  id={`${brand}-${f.key}`}
                  name={f.key}
                  type={f.validateAsUrl ? "url" : "text"}
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={f.placeholder}
                  aria-describedby={f.hint ? `${brand}-${f.key}-hint` : undefined}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
                {f.hint && (
                  <p id={`${brand}-${f.key}-hint`} className="mt-1 text-[11px] leading-4 text-neutral-500">
                    {f.hint}
                  </p>
                )}
              </div>
            ))}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-400 shadow-lg shadow-brand-500/20 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 focus-visible:outline-none"
            >
              <Plug size={14} aria-hidden="true" /> Collega in {guide?.time ?? "2 minuti"} <ArrowRight size={14} aria-hidden="true" />
            </button>
          </form>
        ) : onConnectHref ? (
          onConnectHref.startsWith("/api/") ? (
            <a
              href={onConnectHref}
              aria-label={`Collega ${name}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-400 shadow-lg shadow-brand-500/20 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 focus-visible:outline-none"
            >
              <Plug size={14} aria-hidden="true" /> Collega in {guide?.time ?? "2 minuti"} <ArrowRight size={14} aria-hidden="true" />
            </a>
          ) : (
            <Link
              href={onConnectHref}
              aria-label={`Collega ${name}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-400 shadow-lg shadow-brand-500/20 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 focus-visible:outline-none"
            >
              <Plug size={14} aria-hidden="true" /> Collega in {guide?.time ?? "2 minuti"} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )
        ) : (
          <Link
            href="/contact"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 focus-visible:outline-none"
          >
            Richiedi accesso
          </Link>
        )}
      </div>
      {connected && <p className="mt-2 text-center text-xs font-medium text-emerald-300/80">Passo 3 completato — prova l’agente ora.</p>}
    </div>
  );
}
