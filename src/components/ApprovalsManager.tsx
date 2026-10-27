"use client";

/**
 * Schermata approvazioni + livelli di autonomia (Fase 4) — dashboard/approvals.
 *
 * Ogni azione proposta si vede IN CHIARO (tool + payload mascherato di
 * segreti — non ne contiene: sono mai nel DB), con tre decisioni:
 * approva · rifiuta · modifica e approva. La modifica azzera il contatore
 * D12. Nella fascia sotto, lo stato di autonomia per agente: il sistema
 * PROPONE la promozione dopo 10 approvazioni senza modifiche, ma chi
 * conferma è sempre l'utente (bottone dedicato).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Pencil, ShieldCheck, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import type { AutonomyLevel } from "@/types/agents-db";
export type ApprovalView = {
  id: string;
  run_id: string;
  agent_slug: string;
  stato: "pending" | "approved" | "rejected" | "edited";
  azione: { tool: string; input: Record<string, unknown>; label?: string };
  created_at: string;
};

export type AutonomyView = {
  id: string;
  agent_slug: string;
  azione: string | null;
  livello: AutonomyLevel;
  approvazioni_consecutive_ok: number;
  promozioneSuggerita: boolean;
};

const LEVELS: AutonomyLevel[] = ["L0", "L1", "L2", "L3"];

function levelLabel(level: AutonomyLevel, t: Record<string, string>): string {
  return t[level.toLowerCase()] ?? level;
}

export default function ApprovalsManager({
  pending,
  decided,
  autonomy,
  promotionThreshold,
}: {
  pending: ApprovalView[];
  decided: ApprovalView[];
  autonomy: AutonomyView[];
  promotionThreshold: number;
}) {
  const { dict } = useLanguage();
  const t = dict.agentApprovals;
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // L'edit resta attivo solo se l'approvazione è ancora nella lista (una
  // decisione e router.refresh() la rimuovono da `pending`): derivato, con
  // niente effetti-che-resettano.
  const activeEditing = pending.some((p) => p.id === editing) ? editing : null;

  const decide = async (
    id: string,
    decision: "approved" | "rejected" | "edited",
    action?: { input: unknown },
  ) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/agents/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, ...(action ? { action } : {}) }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error === "not_found" ? t.decisionApproved : t.errorGeneric);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const setLevel = async (
    slug: string,
    action: string | null,
    level: AutonomyLevel,
  ) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/agents/autonomy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSlug: slug, action: action ?? "", livello: level }),
      });
      if (!response.ok) {
        setError(t.errorGeneric);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const grouped = autonomy.reduce<Record<string, AutonomyView[]>>((map, row) => {
    (map[row.agent_slug] ??= []).push(row);
    return map;
  }, {});

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
      <header className="pt-10 pb-8 sm:pt-14">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <ShieldCheck size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{t.title}</h1>
            <p className="mt-1 max-w-xl text-sm text-neutral-400">{t.subtitle}</p>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-12 text-center">
            <Check size={26} className="mx-auto text-emerald-500/70" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-neutral-300">{t.empty}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">{t.emptyHint}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.id} className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                      {p.agent_slug}
                    </p>
                    <h2 className="mt-0.5 text-base font-semibold text-white">
                      {t.proposeTool}: <span className="font-mono text-brand-300">{p.azione.tool}</span>
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decide(p.id, "approved")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      <Check size={14} /> {t.approve}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decide(p.id, "rejected")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                    >
                      <X size={14} /> {t.reject}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEditing(activeEditing === p.id ? null : p.id);
                        setEditValue(JSON.stringify(p.azione.input ?? {}, null, 2));
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-40 ${
                        activeEditing === p.id
                          ? "border-brand-400/60 bg-brand-500/15 text-brand-300"
                          : "border-white/[0.1] text-neutral-300 hover:bg-white/[0.06]"
                      }`}
                    >
                      <Pencil size={14} /> {t.editApprove}
                    </button>
                  </div>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-white/[0.04] p-3 text-xs text-neutral-300" aria-label={t.payload}>
                  {JSON.stringify(p.azione.input ?? {}, null, 2)}
                </pre>
                {activeEditing === p.id && (
                  <div className="mt-3">
                    <textarea
                      rows={6}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full resize-y rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 font-mono text-xs text-white focus:border-brand-400/60 focus:outline-none"
                      aria-label={t.modificarLabel}
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          try {
                            const input = JSON.parse(editValue) as unknown;
                            decide(p.id, "edited", { input });
                          } catch {
                            setError(t.errorGeneric);
                          }
                        }}
                        className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-40"
                      >
                        {t.approveModified}
                      </button>
                      <p className="text-xs text-neutral-400">{t.disableDecided}</p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-400 hover:text-neutral-200">
            {t.decisionApproved} ({decided.length})
          </summary>
          <ul className="mt-3 space-y-1.5">
            {decided.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm text-neutral-400">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    d.stato === "approved"
                      ? "bg-emerald-500"
                      : d.stato === "edited"
                        ? "bg-brand-500"
                        : "bg-red-500"
                  }`}
                  aria-hidden
                />
                <span className="font-semibold text-neutral-300">{d.agent_slug}</span>
                <span aria-hidden>·</span>
                <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs">{d.azione.tool}</code>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-bold tracking-tight text-white">{t.autonomyTitle}</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">{t.autonomySubtitle}</p>
        {Object.entries(grouped).length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">{t.empty}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {Object.entries(grouped).map(([slug, rows]) => (
              <li key={slug} className="rounded-2xl border border-white/[0.08] bg-neutral-900/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{slug}</h3>
                  {(rows.some((r) => r.promozioneSuggerita) ||
                    rows.some(
                      (r) =>
                        r.approvazioni_consecutive_ok >= promotionThreshold &&
                        !r.promozioneSuggerita,
                    )) && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-400/30 bg-brand-500/10 px-3 py-2">
                      <Sparkles size={14} className="text-brand-300" />
                      <p className="text-xs text-neutral-300">{t.promotionSuggested}</p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setLevel(slug, null, "L2")}
                        className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-400 disabled:opacity-40"
                      >
                        {t.promoteActionButton}
                      </button>
                    </div>
                  )}
                </div>
                <ul className="mt-3 space-y-2">
                  {(rows.find((r) => r.azione === null) ? [rows.find((r) => r.azione === null)!] : []).map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-neutral-500">{t.default}:</span>
                      <span className="text-xs text-neutral-300">{levelLabel(row.livello, t)}</span>
                      <span className="text-xs text-neutral-500">
                        ·{" "}{row.approvazioni_consecutive_ok} {t.consecutive}
                      </span>
                      <span className="ml-auto flex gap-1">
                        {LEVELS.map((level) => (
                          <button
                            key={level}
                            type="button"
                            disabled={busy || row.livello === level}
                            onClick={() => setLevel(slug, null, level)}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold transition-all ${
                              row.livello === level
                                ? "border-brand-400/60 bg-brand-500/15 text-brand-300"
                                : "border-white/[0.1] text-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </span>
                    </div>
                  ))}
                  {rows.filter((r) => r.azione !== null).map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-neutral-500">{t.perAction}:</span>
                      <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-brand-300">{row.azione}</code>
                      <span className="text-xs text-neutral-300">{levelLabel(row.livello, t)}</span>
                      <span className="ml-auto flex gap-1">
                        {LEVELS.map((level) => (
                          <button
                            key={level}
                            type="button"
                            disabled={busy || row.livello === level}
                            onClick={() => setLevel(slug, row.azione, level)}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold transition-all ${
                              row.livello === level
                                ? "border-brand-400/60 bg-brand-500/15 text-brand-300"
                                : "border-white/[0.1] text-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </span>
                    </div>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
