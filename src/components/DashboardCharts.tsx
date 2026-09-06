"use client";

/**
 * Grafici del dashboard: barre verticali con l'andamento delle esecuzioni
 * giornaliere e riepilogo numerico (esecuzioni, token, stato). I grafici sono
 * costruiti in CSS puro (altezze in %) dai dati — nessuna libreria chart — e
 * i valori vengono formattati in modo compatto (k/M) per non allargare le
 * card.
 */
import { useMemo } from "react";
import { BarChart3, Wallet, TrendingUp } from "lucide-react";

type DailyPoint = {
  label: string;
  date: string;
  runs: number;
  tokens: number;
};

type DashboardChartsProps = {
  daily: DailyPoint[];
  totalTokens: number;
  totalRuns: number;
  estimatedCostCents: number;
  overageCents: number;
  locale: string;
};

function formatCurrency(cents: number, locale: string) {
  return (cents / 100).toLocaleString(locale === "it" ? "it-IT" : "en-US", {
    style: "currency",
    currency: "EUR",
  });
}

export default function DashboardCharts({
  daily,
  totalTokens,
  totalRuns,
  estimatedCostCents,
  overageCents,
  locale,
}: DashboardChartsProps) {
  const maxRuns = useMemo(() => Math.max(1, ...daily.map((d) => d.runs)), [daily]);
  const maxTokens = useMemo(() => Math.max(1, ...daily.map((d) => d.tokens)), [daily]);
  const isIt = locale === "it";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Runs chart */}
      <div className="rounded-lg border border-white/5 bg-neutral-900 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <BarChart3 size={16} className="text-brand-400" />
            {isIt ? "Esecuzioni · ultimi 7 giorni" : "Runs · last 7 days"}
          </h3>
          <span className="text-xs font-semibold text-neutral-500">
            {isIt ? `${totalRuns} totali` : `${totalRuns} total`}
          </span>
        </div>

        {daily.every((d) => d.runs === 0) ? (
          <p className="py-10 text-center text-sm text-neutral-500">
            {isIt ? "Nessuna esecuzione negli ultimi 7 giorni." : "No runs in the last 7 days."}
          </p>
        ) : (
          <div className="flex items-end gap-1.5 sm:gap-2">
            {daily.map((d) => {
              const h = Math.max(6, (d.runs / maxRuns) * 96);
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[11px] font-bold text-neutral-400">{d.runs}</span>
                  <div
                    className="w-full rounded-t-md bg-brand-500 transition-all hover:bg-brand-400"
                    style={{ height: `${h}px` }}
                    title={`${d.label}: ${d.runs} runs`}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Mini token sparkline under runs */}
        <div className="mt-6 border-t border-white/5 pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <TrendingUp size={12} />
            {isIt ? "Token al giorno" : "Tokens per day"}
          </p>
          <div className="flex items-end gap-1">
            {daily.map((d) => {
              const h = Math.max(2, (d.tokens / maxTokens) * 28);
              return (
                <div
                  key={d.date}
                  className="flex-1 rounded-sm bg-purple-500/60"
                  style={{ height: `${h}px` }}
                  title={`${d.label}: ${d.tokens} tokens`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Cost chart */}
      <div className="rounded-lg border border-white/5 bg-neutral-900 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Wallet size={16} className="text-emerald-400" />
            {isIt ? "Costi stimati" : "Estimated costs"}
          </h3>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
            {formatCurrency(estimatedCostCents, locale)}/mese
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {isIt ? "Incluso nel piano" : "Included"}
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {formatCurrency(Math.max(0, estimatedCostCents - overageCents), locale)}
            </p>
            <p className="text-xs text-neutral-500">
              {totalTokens.toLocaleString(locale === "it" ? "it-IT" : "en-US")} token
            </p>
          </div>
          <div
            className={`rounded-lg p-3 ${overageCents > 0 ? "bg-red-500/10 border border-red-500/20" : "bg-white/5"}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {isIt ? "Overage" : "Overage"}
            </p>
            <p className={`mt-1 text-lg font-bold ${overageCents > 0 ? "text-red-300" : "text-white"}`}>
              {formatCurrency(overageCents, locale)}
            </p>
            <p className="text-xs text-neutral-500">
              {overageCents > 0
                ? isIt
                  ? "Oltre l'allowance"
                  : "Beyond allowance"
                : isIt
                  ? "Nessun extra"
                  : "No extra"}
            </p>
          </div>
        </div>

        {/* Visual cost bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-neutral-500">
            <span>{isIt ? "Utilizzo vs. costo" : "Usage vs cost"}</span>
            <span>
              {totalTokens.toLocaleString(locale === "it" ? "it-IT" : "en-US")} tok
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500"
              style={{
                width: `${Math.min(100, (totalTokens / Math.max(1, totalTokens + 5000)) * 100 + 20)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            {isIt
              ? "I costi vengono calcolati sui token reali consumati. Se superi l'allowance del piano, l'extra viene fatturato automaticamente a consumo."
              : "Costs are based on actual tokens used. Exceeding your plan allowance is billed automatically on overage."}
          </p>
        </div>
      </div>
    </div>
  );
}
