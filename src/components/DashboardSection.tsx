"use client";

import Link from "next/link";
import { useId } from "react";
import {
  Activity,
  Bot,
  Clock,
  Cloud,
  CreditCard,
  Headset,
  History,
  LayoutDashboard,
  Mail,
  PenLine,
  Plug,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

// Icons for the demo sidebar items — index-aligned with the localized list
// (Overview, Agents, Integrations, Runs, Billing).
const SIDEBAR_ICONS = [LayoutDashboard, Bot, Plug, History, CreditCard];

// Per-agent accent (icon chip tint) — index-aligned with the agent rows AND
// the recent-activity feed in the dictionaries (Shopify, Support, Lead,
// Copywriter, Email Manager), so a color identifies the same agent everywhere.
const ACCENTS = [
  { icon: ShoppingBag, chip: "bg-purple-500/15 text-purple-300" },
  { icon: Headset, chip: "bg-emerald-500/15 text-emerald-300" },
  { icon: UserPlus, chip: "bg-amber-500/15 text-amber-300" },
  { icon: PenLine, chip: "bg-violet-500/15 text-violet-300" },
  { icon: Mail, chip: "bg-sky-500/15 text-sky-300" },
];

// Decorative per-KPI sparklines (relative heights 1-10, last value = current).
const KPI_SPARKS = [
  [4, 5, 4, 6, 5, 7, 6, 8, 7, 9], // installed agents — steady climb
  [2, 3, 5, 4, 7, 6, 8, 7, 9, 10], // total runs — strong climb
  [7, 6, 8, 7, 9, 8, 9, 8, 10, 9], // avg success — high plateau
  [3, 4, 3, 6, 5, 8, 9, 8, 10, 9], // tokens — growing usage
];
// Trend deltas shown as chips on each KPI (one slightly negative reads real).
const KPI_TRENDS = [24.2, 8.6, -0.3, 17.9];

// Weekly runs shown in the chart (7 points, arbitrary demo scale).
const WEEKLY_RUNS = [64, 92, 78, 118, 96, 142, 128];

function TrendChip({ value, locale }: { value: number; locale: string }) {
  const negative = value < 0;
  const formatted = `${value > 0 ? "+" : ""}${value.toLocaleString(
    locale === "it" ? "it-IT" : "en-US",
    { maximumFractionDigits: 1 },
  )}%`;
  const Icon = negative ? TrendingDown : TrendingUp;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        negative
          ? "bg-rose-500/10 text-rose-400"
          : "bg-emerald-500/10 text-emerald-400"
      }`}
    >
      <Icon size={10} strokeWidth={2.5} />
      {formatted}
    </span>
  );
}

function RunsChart({
  title,
  weekLabel,
  runsLabel,
  days,
}: {
  title: string;
  weekLabel: string;
  runsLabel: string;
  days: string[];
}) {
  const rawId = useId();
  const gid = `runs-fill-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const W = 720;
  const H = 232;
  const PX = 14;
  const TOP = 26;
  const BOT = 168;
  const LABEL_Y = 216;
  const n = WEEKLY_RUNS.length;
  const X = (i: number) => PX + (i * (W - PX * 2)) / (n - 1);
  // Fixed demo ceiling so the curve keeps its shape across locales.
  const Y = (v: number) => BOT - (v / 150) * (BOT - TOP);
  const line = WEEKLY_RUNS.map(
    (v, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`,
  ).join(" ");
  const area = `${line} L${X(n - 1).toFixed(1)},${BOT} L${X(0).toFixed(1)},${BOT} Z`;
  const gridYs = [0, 1 / 3, 2 / 3, 1].map(
    (f) => TOP + (BOT - TOP) * f,
  );
  const last = WEEKLY_RUNS[n - 1];

  return (
    <div className="rounded-xl border border-white/5 bg-neutral-900/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-white">{title}</p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-neutral-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
            </span>
            {weekLabel}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-brand-400" />
          {runsLabel}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full h-auto"
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2ea3ff" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2ea3ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridYs.map((y, i) => (
          <line
            key={i}
            x1={PX}
            x2={W - PX}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path
          d={line}
          fill="none"
          stroke="#5cb8ff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Highlight ring on the current (last) point */}
        <circle cx={X(n - 1)} cy={Y(last)} r="7" fill="rgba(46,163,255,0.25)" />
        <circle cx={X(n - 1)} cy={Y(last)} r="3.5" fill="#2ea3ff" />
        {days.map((d, i) => (
          <text
            key={i}
            x={X(i)}
            y={LABEL_Y}
            textAnchor="middle"
            className="fill-neutral-500 text-[10px] font-semibold"
          >
            {d}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function DashboardSection() {
  const { dict, locale } = useLanguage();
  const ds = dict.dashboardSection;
  const dashboardAgents = ds.agents;
  const events = ds.events;
  const maxRuns = Math.max(
    ...dashboardAgents.map(([, , runs]) =>
      Number(String(runs).replace(/\D/g, "") || 0),
    ),
    1,
  );

  return (
    <section className="overflow-hidden py-24">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="mb-6 flex items-center justify-center gap-2">
            <Activity size={13} className="text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
              {ds.badge}
            </span>
          </div>

          <h2 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            {ds.title}
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-neutral-400">
            {ds.subtitle}
          </p>

          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-brand-500/20 transition-all duration-200 hover:bg-brand-400 hover:-translate-y-0.5"
          >
            <Sparkles size={16} />
            {ds.openDashboard}
          </Link>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-white/5 bg-neutral-900 p-4 shadow-2xl shadow-brand-500/10"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-white/5 px-2 pb-4">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-purple-500" />
            <span className="ml-3 text-xs font-semibold text-neutral-500">
              cloud.agentcloud.ai/dashboard
            </span>
          </div>

          <div className="grid gap-4 p-2 pt-5 lg:grid-cols-[220px_minmax(0,1fr)_300px] 3xl:grid-cols-[240px_minmax(0,1fr)_340px]">
            {/* ── Sidebar ── */}
            <aside className="hidden rounded-xl border border-white/5 bg-neutral-800 p-4 lg:flex lg:flex-col">
              <div className="mb-7 flex items-center gap-2 px-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Cloud size={14} />
                </div>
                <span className="text-sm font-bold text-white">AgentCloud</span>
              </div>
              <nav className="space-y-1">
                {ds.sidebar.map((item, idx) => {
                  const Icon = SIDEBAR_ICONS[idx] ?? LayoutDashboard;
                  const active = idx === 1;
                  return (
                    <div
                      key={item}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? "border border-brand-500/20 bg-brand-500/10 text-brand-300 shadow-sm"
                          : "text-neutral-400"
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      {item}
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-400" />
                      )}
                    </div>
                  );
                })}
              </nav>
            </aside>

            {/* ── Main column ── */}
            <div className="min-w-0 space-y-4">
              {/* KPI row */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {ds.stats.map(([value, label], idx) => {
                  const negative = KPI_TRENDS[idx] < 0;
                  const spark = KPI_SPARKS[idx] ?? KPI_SPARKS[0];
                  const max = Math.max(...spark);
                  return (
                    <div
                      key={label}
                      className="rounded-xl border border-white/5 bg-neutral-800/80 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                          {label}
                        </p>
                        <TrendChip value={KPI_TRENDS[idx]} locale={locale} />
                      </div>
                      <p className="mt-1.5 text-2xl font-bold tracking-tight text-white">
                        {value}
                      </p>
                      {/* Mini bar sparkline (decorative) */}
                      <div
                        className="mt-3 flex h-6 items-end gap-[3px]"
                        aria-hidden="true"
                      >
                        {spark.map((h, i) => (
                          <span
                            key={i}
                            className={`flex-1 rounded-[2px] ${
                              negative
                                ? i === spark.length - 1
                                  ? "bg-rose-400"
                                  : "bg-rose-400/30"
                                : i === spark.length - 1
                                  ? "bg-brand-400"
                                  : "bg-brand-400/30"
                            }`}
                            style={{ height: `${(h / max) * 100}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly runs chart */}
              <RunsChart
                title={ds.chartTitle}
                weekLabel={ds.chartWeek}
                runsLabel={ds.chartRuns}
                days={ds.chartDays}
              />

              {/* Agents table */}
              <div className="overflow-hidden rounded-xl border border-white/5">
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                  <p className="text-sm font-bold text-white">{ds.agentsHeading}</p>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    {dict.common.online}
                  </span>
                </div>

                {dashboardAgents.map((row, idx) => {
                  const [name, status, runs, success, lastRun] = row;
                  const accent = ACCENTS[idx % ACCENTS.length];
                  const Icon = accent.icon;
                  const active =
                    status === "Active" || status === "Attivo";
                  const runsNum = Number(String(runs).replace(/\D/g, "") || 0);
                  const successNum = Number(
                    String(success).replace(/[^\d.,]/g, "").replace(",", "."),
                  );
                  const successGood = successNum >= 98;
                  return (
                    <div
                      key={name}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/5 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.02] sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]"
                    >
                      {/* Avatar + name */}
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent.chip}`}
                      >
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0 flex-1 sm:flex-none">
                        <p className="truncate text-sm font-bold text-white">
                          {name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-neutral-500">
                          <Clock size={11} />
                          {lastRun}
                        </p>
                      </div>
                      {/* Status */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${
                          active
                            ? "bg-purple-500/15 text-purple-300"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            active ? "bg-purple-400" : "bg-neutral-500"
                          }`}
                        />
                        {status}
                      </span>
                      {/* Runs (with a micro usage bar) */}
                      <div className="order-last w-full sm:order-none sm:w-auto sm:min-w-[96px]">
                        <p className="text-sm font-semibold text-neutral-300 whitespace-nowrap">
                          {runs}
                        </p>
                        <div className="mt-1 hidden h-1 w-full overflow-hidden rounded-full bg-white/5 sm:block">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-brand-500 to-pink-500"
                            style={{ width: `${(runsNum / maxRuns) * 100}%` }}
                          />
                        </div>
                      </div>
                      {/* Success */}
                      <p
                        className={`text-sm font-bold whitespace-nowrap ${
                          successGood ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {success}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Recent activity feed ── */}
            <aside className="rounded-xl border border-white/5 bg-neutral-800 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Zap size={16} className="text-brand-400" />
                <p className="text-sm font-bold text-white">{ds.recentActivity}</p>
              </div>
              <div className="space-y-1">
                {events.map(([time, text], idx) => {
                  const accent = ACCENTS[idx % ACCENTS.length];
                  const Icon = accent.icon;
                  return (
                    <div
                      key={text}
                      className="group relative flex gap-3 rounded-lg p-2 transition-colors hover:bg-neutral-900/60"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${accent.chip}`}
                        >
                          <Icon size={14} />
                        </div>
                        {idx < events.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-white/5" />
                        )}
                      </div>
                      <div className="min-w-0 pb-2 group-last:pb-0">
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wide ${
                            accent.chip.split(" ")[1]
                          }`}
                        >
                          {time}
                        </p>
                        <p className="mt-0.5 text-[13px] font-medium leading-5 text-neutral-300">
                          {text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
