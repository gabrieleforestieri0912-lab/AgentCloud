"use client";

import { CheckCircle2, Circle, Clock3, AlertCircle, Plug, Unplug, Loader2, ArrowRight } from "lucide-react";
import BrandLogo from "./BrandLogo";
import Link from "next/link";
import { getGuideForBrand, type IntegrationGuide } from "@/lib/integrations/guides";

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
}: Props) {
  const guide: IntegrationGuide | null = getGuideForBrand(brand);

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
            <p className="text-xs font-semibold text-neutral-500">{category} · {guide?.time ?? "2 min"}</p>
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
              Disconnetti
            </button>
          ) : (
            <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300">
              <CheckCircle2 size={14} /> Collegato — pronto all’uso
            </span>
          )
        ) : onConnectHref ? (
          onConnectHref.startsWith("/api/") ? (
            <a
              href={onConnectHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-400 shadow-lg shadow-brand-500/20"
            >
              <Plug size={14} /> Collega in {guide?.time ?? "2 minuti"} <ArrowRight size={14} />
            </a>
          ) : (
            <Link
              href={onConnectHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-400 shadow-lg shadow-brand-500/20"
            >
              <Plug size={14} /> Collega in {guide?.time ?? "2 minuti"} <ArrowRight size={14} />
            </Link>
          )
        ) : (
          <Link
            href="/contact"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
          >
            Richiedi accesso
          </Link>
        )}
      </div>
      {connected && <p className="mt-2 text-center text-xs font-medium text-emerald-300/80">Passo 3 completato — prova l’agente ora.</p>}
    </div>
  );
}
