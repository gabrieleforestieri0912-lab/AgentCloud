"use client";

/**
 * Sezione "Competenze installate" della dashboard.
 *
 * Statistiche per competenza: stato (attiva/disattivata), ultimo uso, numero di
 * attivazioni e tasso di successo. Il toggle abilita/disabilita una
 * competenza senza toccare il resto della pagina (PATCH
 * `/api/agents/[id]/skills`).
 */

import { useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, Activity, CheckCircle2, Power } from "lucide-react";
import type { SkillsSummary } from "@/lib/skills/metrics";
import { RiskBadge } from "@/components/skills/SkillsCatalog";

/**
 * Sottoinsieme del dizionario usato dalla sezione dashboard.
 *
 * Dichiarato qui invece di importare il tipo completo: la sezione non deve
 * poter usare una chiave di `/skills` per errore (il compilatore gliele
 * renderebbe disponibili senza accorgersene).
 */
type DashboardSkillsDict = {
  dashboardTitle: string;
  dashboardUses: string;
  dashboardEmptyTitle: string;
  dashboardEmptyBody: string;
  lastUse: string;
  neverUsed: string;
  tokens: string;
  enable: string;
  disable: string;
  toggleError: string;
  ownerUser: string;
  on: string;
  browseSkills: string;
  riskLow: string;
  riskMedium: string;
  riskHigh: string;
};

export default function DashboardSkills({
  summary,
  dict,
}: {
  summary: SkillsSummary;
  dict: DashboardSkillsDict;
}) {
  const [items, setItems] = useState(summary.installed);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(installedId: string, agentSlug: string, enabled: boolean) {
    setBusy(installedId);
    setError(null);
    // Ottimistico: il toggle deve rispondere subito, il rollback c'è.
    setItems((prev) =>
      prev.map((s) => (s.installedId === installedId ? { ...s, enabled } : s)),
    );
    try {
      const res = await fetch(
        `/api/agents/${encodeURIComponent(agentSlug)}/skills?skill_id=${encodeURIComponent(installedId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill_id: installedId, enabled }),
        },
      );
      if (!res.ok) throw new Error("toggle failed");
    } catch {
      setItems((prev) =>
        prev.map((s) => (s.installedId === installedId ? { ...s, enabled: !enabled } : s)),
      );
      setError(dict.toggleError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      className="mb-8 rounded-lg border border-white/5 bg-neutral-900 shadow-sm"
      data-onboard="dashboard-skills"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-5">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <Sparkles size={18} className="text-brand-400" />
          {dict.dashboardTitle}
        </h2>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400">
            <Activity size={12} />
            {summary.totals.uses} {dict.dashboardUses}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400">
            <TrendingUp size={12} />
            {summary.totals.successRate}%
          </span>
          <Link
            href="/skills"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-400"
          >
            {dict.browseSkills}
          </Link>
        </div>
      </div>

      {error && (
        <p className="border-b border-white/5 bg-red-500/5 px-5 py-2 text-xs font-semibold text-red-300">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-base font-bold text-white">{dict.dashboardEmptyTitle}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
            {dict.dashboardEmptyBody}
          </p>
          <Link
            href="/skills"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
          >
            {dict.browseSkills}
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {items.map((skill) => (
            <div
              key={skill.installedId}
              className="grid gap-4 p-5 lg:grid-cols-[1fr_140px_120px_110px_90px] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-white">{skill.name}</p>
                  <RiskBadge risk={skill.risk} dict={dict} />
                  {skill.owner === "user" && (
                    <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      {dict.ownerUser}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                  {skill.description}
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  {dict.on} {skill.agentSlug}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  {skill.uses} {dict.dashboardUses.toLowerCase()}
                </p>
                {skill.lastUsedAt && (
                  <p className="text-xs text-neutral-500">
                    {dict.lastUse} {formatDate(skill.lastUsedAt)}
                  </p>
                )}
              </div>

              <div>
                {skill.uses > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-300">
                    <CheckCircle2 size={13} />
                    {Math.round((skill.successes / skill.uses) * 100)}%
                  </span>
                ) : (
                  <span className="text-xs text-neutral-600">{dict.neverUsed}</span>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-neutral-400">
                  {dict.tokens}
                </p>
                <p className="text-sm font-bold text-neutral-300">
                  {skill.tokens.toLocaleString("it-IT")}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => toggle(skill.installedId, skill.agentSlug, !skill.enabled)}
                  disabled={busy === skill.installedId}
                  aria-pressed={skill.enabled}
                  title={skill.enabled ? dict.disable : dict.enable}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                    skill.enabled
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      : "border-white/10 bg-neutral-800 text-neutral-500 hover:text-white"
                  }`}
                >
                  <Power size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Data breve in italiano (la dashboard è già localizzata dal dizionario). */
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(date);
}
