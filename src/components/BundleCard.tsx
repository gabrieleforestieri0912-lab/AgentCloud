"use client";

/**
 * Card di un bundle nel marketplace.
 *
 * Stessa anatomia di AgentCard, cosi' le due griglie si leggono uguali:
 * intestazione con icona e badge, descrizione breve + lunga, box "Cosa
 * ottieni" con gli agenti inclusi, footer separato da un bordo con prezzo e
 * CTA. Sopra questo stanno solo i pezzi specifici del bundle: toggle dei
 * periodi e risparmio animato.
 *
 * Il toggle usa framer-motion: pillola scorrono, prezzi fade/slide, badge
 * risparmio scale-in.
 */
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles, Clock, Tag, Zap } from "lucide-react";
import type { Bundle, BundlePeriod } from "@/lib/bundles";
import type { Agent } from "@/lib/agents";
import { formatPrice, formatMonthlyPrice, getBundleAgents } from "@/lib/bundles";
import AgentIcon from "./AgentIcon";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import AddBundleToCartButton from "./AddBundleToCartButton";
import AnimatedSavingsCounter from "./AnimatedSavingsCounter";

type BundleCardProps = {
  bundle: Bundle;
};

const PERIODS: BundlePeriod[] = ["monthly", "quarterly", "yearly"];

export default function BundleCard({ bundle }: BundleCardProps) {
  const { dict } = useLanguage();
  const [period, setPeriod] = useState<BundlePeriod>("monthly");
  const agents = getBundleAgents(bundle);

  const pricing = bundle.pricing;
  const monthlyPrice =
    period === "monthly" ? pricing.monthly
      : period === "quarterly" ? pricing.quarterly
        : pricing.yearly;

  const totalDisplay =
    period === "quarterly" ? formatPrice(pricing.quarterlyTotal)
      : period === "yearly" ? formatPrice(pricing.yearlyTotal)
        : null;

  const periodLabel =
    period === "monthly" ? dict.bundleDetail.pricePerMonth
      : period === "quarterly" ? dict.bundleDetail.pricePerMonthQuarterly
        : dict.bundleDetail.pricePerMonthYearly;

  const savingsPercent =
    period === "quarterly" ? pricing.savingsQuarterly
      : period === "yearly" ? pricing.savingsYearly
        : 0;

  // Risparmio mensile in centesimi
  const monthlyTotal = pricing.monthly; // prezzo/mese senza sconto
  const discountedMonthly =
    period === "monthly" ? monthlyTotal
      : period === "quarterly" ? pricing.quarterly
        : pricing.yearly;
  const savingsCents = monthlyTotal - discountedMonthly;

  const badgeColors: Record<string, string> = {
    "Best value": "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    "Most popular": "bg-amber-500/15 text-amber-300 border-amber-500/20",
    "Save more": "bg-purple-500/15 text-purple-300 border-purple-500/20",
    "Starter": "bg-brand-500/10 text-brand-300 border-brand-500/20",
  };

  const periodIndex = PERIODS.indexOf(period);

  return (
    <article className="group relative flex flex-col rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-brand-500/30 hover:shadow-2xl hover:shadow-brand-500/10 focus-within:border-brand-500/30 focus-within:shadow-2xl focus-within:shadow-brand-500/10 motion-reduce:transform-none motion-reduce:transition-none">
      {/* Gradiente d'accento in alto */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${bundle.accent} opacity-[0.03] transition-opacity duration-300 group-hover:opacity-[0.07] group-focus-within:opacity-[0.07]`}
      />

      {/* Intestazione: icona + conteggio + badge */}
      <div className="relative mb-4 flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${bundle.accent} shadow-lg transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none`}
        >
          <AgentIcon icon={bundle.icon as Agent["icon"]} size={24} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex max-w-[150px] shrink-0 items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider text-neutral-400">
              {t(dict.agentsPage.agentsCount, { count: agents.length })}
            </span>
            <motion.span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider ${badgeColors[bundle.badge] || badgeColors["Starter"]}`}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Sparkles size={11} />
              {bundle.badge}
            </motion.span>
          </div>
          <h3 className="truncate text-[17px] font-bold leading-tight text-white">{bundle.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
            <Clock size={12} className="text-neutral-600" />
            {dict.bundleDetail.setupFast}
          </p>
        </div>
      </div>

      {/* Descrizione persuasiva */}
      <p className="relative line-clamp-2 text-sm font-bold leading-6 text-white">{bundle.description}</p>
      <p className="relative mt-2 line-clamp-2 text-xs leading-5 text-neutral-400">
        {bundle.longDescription.slice(0, 110)}...
      </p>

      {/* ── Period toggle with sliding indicator ── */}
      <div className="relative mb-5 mt-5 flex gap-1 rounded-xl border border-white/10 bg-neutral-800/60 p-1">
        {/* Sliding pill background */}
        <motion.div
          className="absolute bottom-1 top-1 rounded-lg bg-brand-500 shadow-lg shadow-brand-500/20"
          layout
          layoutId={`pill-${bundle.slug}`}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            width: `calc((100% - 8px) / 3)`,
            left: `calc(${periodIndex} * (100% - 8px) / 3 + 4px)`,
          }}
        />

        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
            className={`relative z-10 flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors duration-200 ${
              period === p ? "text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            {p === "monthly"
              ? dict.bundleDetail.monthly
              : p === "quarterly"
                ? dict.bundleDetail.quarterlyShort
                : dict.bundleDetail.yearly}
          </button>
        ))}
      </div>

      {/* ── Animated price — altezza auto per evitare sovrapposizione risparmio ── */}
      <div className="relative mb-5 min-h-[100px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={period}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative"
          >
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white">{formatPrice(monthlyPrice)}</span>
              <span className="text-sm font-semibold text-neutral-500">{periodLabel}</span>
            </div>

            {/* Savings badge — animated */}
            <AnimatePresence>
              {savingsPercent > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -8 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
                  className="mt-2 flex items-center gap-2"
                >
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                    <Tag size={10} />
                    -{savingsPercent}%
                  </span>
                  {totalDisplay && (
                    <span className="text-xs font-semibold text-neutral-500">
                      {dict.bundleDetail.total}: {totalDisplay}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Animated savings counter in euros */}
            <AnimatedSavingsCounter savingsCents={savingsCents} percent={savingsPercent} />

            {/* Monthly hint */}
            <AnimatePresence>
              {period === "monthly" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 text-xs font-semibold text-neutral-500"
                >
                  {dict.bundleDetail.priceWithoutBundle}: {formatMonthlyPrice(pricing.monthly)}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Benefici: agenti inclusi */}
      <div className="relative mb-5 flex-1 rounded-xl border border-white/5 bg-neutral-800/40 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          <Zap size={11} className="text-brand-400" />
          {dict.bundleDetail.includedAgents}
        </p>
        <div className="space-y-2">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.slug}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="flex items-center gap-2.5 text-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                <AgentIcon icon={agent.icon} brand={agent.brand} size={12} className="text-emerald-400" />
              </span>
              <span className="truncate font-semibold text-neutral-200">{agent.name}</span>
              <CheckCircle2 size={12} className="ml-auto shrink-0 text-emerald-400" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Piè di card: CTA */}
      <div className="relative border-t border-white/5 pt-5">
        <div className="grid grid-cols-2 gap-2">
          <AddBundleToCartButton bundleSlug={bundle.slug} period={period} className="w-full justify-center py-2.5 text-sm" />
          <Link
            href={`/bundles/${bundle.slug}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-neutral-800 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:border-white/20"
          >
            {dict.common.view}
          </Link>
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-neutral-500">
          {dict.bundleDetail.noCommitmentDesc}
        </p>
      </div>
    </article>
  );
}