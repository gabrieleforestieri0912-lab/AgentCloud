"use client";

import Link from "next/link";
import { Activity, CheckCircle2, Cloud, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

export default function DashboardSection() {
  const { dict } = useLanguage();
  const dashboardAgents = dict.dashboardSection.agents;
  const events = dict.dashboardSection.events;
  return (
    <section className="overflow-hidden py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
              {dict.dashboardSection.badge}
            </span>
          </div>

          <h2 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            {dict.dashboardSection.title}
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-neutral-400">
            {dict.dashboardSection.subtitle}
          </p>

          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-brand-500/20 transition-all duration-200 hover:bg-brand-400 hover:-translate-y-0.5"
          >
            <Sparkles size={16} />
            {dict.dashboardSection.openDashboard}
          </Link>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-white/5 bg-neutral-900 p-4 shadow-2xl shadow-brand-500/10"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2 border-b border-white/5 px-2 pb-4">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-purple-500" />
            <span className="ml-3 text-xs font-semibold text-neutral-500">
              cloud.agentcloud.ai/dashboard
            </span>
          </div>

          <div className="grid gap-4 p-2 pt-5 lg:grid-cols-[220px_1fr_300px]">
            <aside className="hidden rounded-xl border border-white/5 bg-neutral-800 p-4 lg:block">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Cloud size={14} />
                </div>
                <span className="text-sm font-bold text-white">AgentCloud</span>
              </div>
              {dict.dashboardSection.sidebar.map((item, idx) => (
                <div
                  key={item}
                  className={`mb-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                    idx === 1
                      ? "bg-neutral-900 text-brand-400 shadow-sm"
                      : "text-neutral-400"
                  }`}
                >
                  {item}
                </div>
              ))}
            </aside>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {dict.dashboardSection.stats.map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/5 bg-neutral-800 p-4"
                  >
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs font-semibold text-neutral-400">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-white/5">
                {dashboardAgents.map(([name, status, runs, success]) => (
                  <div
                    key={name}
                    className="grid gap-3 border-b border-white/5 p-4 last:border-b-0 sm:grid-cols-[1fr_90px_100px_80px] sm:items-center"
                  >
                    <p className="font-bold text-white">{name}</p>
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                        status === "Active" || status === "Attivo"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {status}
                    </span>
                    <p className="text-sm font-semibold text-neutral-400">
                      {runs}
                    </p>
                    <p className="text-sm font-bold text-white">{success}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-xl border border-white/5 bg-neutral-800 p-4">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-purple-400" />
                <p className="text-sm font-bold text-white">{dict.dashboardSection.recentActivity}</p>
              </div>
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event}
                    className="rounded-lg bg-neutral-900 p-3 text-sm font-semibold leading-6 text-neutral-300 shadow-sm"
                  >
                    {event}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
