"use client";

/**
 * Sezione dashboard principale: agenti installati, utilizzo del mese,
 * notifiche e stato abbonamento. Raccoglie i dati reali di Supabase/Stripe
 * passati dalla pagina e li presenta in card; qui la sezione home che un
 * tempo era demo/mock è stata ripulita dai dati finti.
 */
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  Bot,
  Clock,
  CreditCard,
  Headset,
  History,
  LayoutDashboard,
  Mail,
  PenLine,
  Plug,
  ShoppingBag,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

// Icone per le voci della sidebar demo — allineate per indice con la lista
// localizzata (Overview, Agents, Integrations, Runs, Billing).
const SIDEBAR_ICONS = [LayoutDashboard, Bot, Plug, History, CreditCard];

// Accento per agente (tinta del chip icona) — allineato per indice sia con le
// righe degli agenti sia con il feed attività recente nei dizionari (Shopify,
// Support, Lead, Copywriter, Email Manager): un colore identifica sempre lo
// stesso agente ovunque.
const ACCENTS = [
  { icon: ShoppingBag, chip: "bg-purple-500/15 text-purple-300" },
  { icon: Headset, chip: "bg-emerald-500/15 text-emerald-300" },
  { icon: UserPlus, chip: "bg-amber-500/15 text-amber-300" },
  { icon: PenLine, chip: "bg-violet-500/15 text-violet-300" },
  { icon: Mail, chip: "bg-sky-500/15 text-sky-300" },
];

// Array vuoti — niente dati finti: la dashboard mostra i dati reali quando è
// connessa.

function RunsChart({
  title,
  weekLabel,
  runsLabel,
}: {
  title: string;
  weekLabel: string;
  runsLabel: string;
}) {
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

      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-white/10">
        <p className="text-sm text-neutral-500">
          Connect your agents to see real data
        </p>
      </div>
    </div>
  );
}

export default function DashboardSection() {
  const { dict } = useLanguage();
  const ds = dict.dashboardSection;
  const dashboardAgents = ds.agents;
  const events = ds.events;
  const maxRuns = dashboardAgents.length > 0
    ? Math.max(
        ...dashboardAgents.map(([, , runs]) =>
          Number(String(runs).replace(/\D/g, "") || 0),
        ),
        1,
      )
    : 1;

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
          </div>              <h2 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            {ds.title}
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-neutral-400 sm:text-lg">
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
          className="mx-auto w-fit max-w-full overflow-x-auto rounded-2xl border border-white/5 bg-neutral-900 p-4 shadow-2xl shadow-brand-500/10"
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
            <span className="ml-3 max-w-[45vw] truncate text-xs font-semibold text-neutral-500">
              agentcloud.agency/dashboard
            </span>
          </div>

          <div className="grid gap-4 p-2 pt-5 lg:grid-cols-[220px_minmax(0,1fr)_300px] 3xl:grid-cols-[240px_minmax(0,1fr)_340px]">
            {/* ── Sidebar ── */}
            <aside className="hidden rounded-xl border border-white/5 bg-neutral-800 p-4 lg:flex lg:flex-col">
              <div className="mb-7 flex items-center gap-2 px-1">
                <div className="relative h-7 w-7 overflow-hidden rounded-lg">
                  <Image
                    src="/agentcloud.png"
                    alt="AgentCloud"
                    fill
                    className="object-cover"
                    sizes="28px"
                  />
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
              {ds.stats.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {ds.stats.map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/5 bg-neutral-800/80 p-4"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                        {label}
                      </p>
                      <p className="mt-1.5 text-2xl font-bold tracking-tight text-white">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {["Installed agents", "Total runs", "Avg success", "Tokens"].map((label) => (
                    <div
                      key={label}
                      className="rounded-xl border border-dashed border-white/10 bg-neutral-800/40 p-4"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-600">
                        {label}
                      </p>
                      <p className="mt-1.5 text-2xl font-bold tracking-tight text-neutral-700">
                        —
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Weekly runs chart */}
              <RunsChart
                title={ds.chartTitle}
                weekLabel={ds.chartWeek}
                runsLabel={ds.chartRuns}
              />

              {/* Agents table */}
              <div className="overflow-hidden rounded-xl border border-white/5">
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                  <p className="text-sm font-bold text-white">{ds.agentsHeading}</p>
                  {dashboardAgents.length > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      {dict.common.online}
                    </span>
                  )}
                </div>

                {dashboardAgents.length > 0 ? (
                  dashboardAgents.map((row, idx) => {
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
                        {/* Esecuzioni (con mini barra di utilizzo) */}
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
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bot size={32} className="mb-3 text-neutral-700" />
                    <p className="text-sm font-semibold text-neutral-500">
                      No agents installed yet
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      Install agents from the marketplace to see them here
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Recent activity feed ── */}
            <aside className="rounded-xl border border-white/5 bg-neutral-800 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Zap size={16} className="text-brand-400" />
                <p className="text-sm font-bold text-white">{ds.recentActivity}</p>
              </div>
              {events.length > 0 ? (
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
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <History size={24} className="mb-2 text-neutral-700" />
                  <p className="text-sm text-neutral-500">
                    No recent activity
                  </p>
                </div>
              )}
            </aside>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
