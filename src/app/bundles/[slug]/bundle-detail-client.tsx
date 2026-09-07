"use client";

/**
 * Dettaglio bundle: elenco agenti, pricing mensile/trimestrale/annuale,
 * e CTA per attivazione.
 */
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Sparkles, Clock, Tag, Shield } from "lucide-react";
import type { Bundle, BundlePeriod } from "@/lib/bundles";
import { formatPrice, formatMonthlyPrice, getBundleAgents } from "@/lib/bundles";
import AgentIcon from "@/components/AgentIcon";
import { useLanguage } from "@/components/LanguageProvider";
import AddBundleToCartButton from "@/components/AddBundleToCartButton";
import AnimatedSavingsCounter from "@/components/AnimatedSavingsCounter";

const PERIODS: BundlePeriod[] = ["monthly", "quarterly", "yearly"];

type Props = { bundle: Bundle };

export default function BundleDetailClient({ bundle }: Props) {
  const { locale } = useLanguage();
  const isIt = locale === "it";
  const [period, setPeriod] = useState<BundlePeriod>("yearly");
  const agents = getBundleAgents(bundle);
  const pricing = bundle.pricing;

  const monthlyPrice =
    period === "monthly"
      ? pricing.monthly
      : period === "quarterly"
        ? pricing.quarterly
        : pricing.yearly;

  const totalDisplay =
    period === "quarterly"
      ? formatPrice(pricing.quarterlyTotal)
      : period === "yearly"
        ? formatPrice(pricing.yearlyTotal)
        : null;

  const periodLabel =
    period === "monthly"
      ? isIt ? "/mese" : "/month"
      : period === "quarterly"
        ? isIt ? "/mese (fatt. trimestrale)" : "/mo (billed quarterly)"
        : isIt ? "/mese (fatt. annuale)" : "/mo (billed annually)";

  const savingsPercent =
    period === "quarterly"
      ? pricing.savingsQuarterly
      : period === "yearly"
        ? pricing.savingsYearly
        : 0;

  const monthlyTotal = pricing.monthly;
  const discountedMonthly =
    period === "monthly" ? monthlyTotal
      : period === "quarterly" ? pricing.quarterly
        : pricing.yearly;
  const savingsCents = monthlyTotal - discountedMonthly;

  return (
    <section className="dark-gradient-subtle px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href="/bundles"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm font-bold text-neutral-400 backdrop-blur transition-colors hover:border-white/20 hover:text-white"
        >
          <ArrowLeft size={14} />
          {isIt ? "Tutti i bundle" : "All bundles"}
        </Link>

        {/* Header */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
            <Sparkles size={12} />
            {bundle.badge}
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {bundle.name}
          </h1>
          <p className="mt-4 text-lg leading-8 text-neutral-400 max-w-2xl">
            {bundle.longDescription}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: agents list */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-xl font-bold text-white">
              {isIt ? "Agenti inclusi" : "Included agents"}
            </h2>
            <div className="space-y-3">
              {agents.map((agent) => (
                <Link
                  key={agent.slug}
                  href={`/agents/${agent.slug}`}
                  className="flex items-center gap-4 rounded-xl border border-white/5 bg-neutral-900 p-4 transition-all hover:border-brand-500/30 hover:bg-neutral-900/60 group"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg transition-transform group-hover:scale-105 ${agent.accent}`}>
                    <AgentIcon icon={agent.icon} brand={agent.brand} size={20} className="text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                    <p className="text-xs text-neutral-400 line-clamp-1">{agent.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-neutral-300">{formatMonthlyPrice(agent.priceCents)}</p>
                    <p className="text-[10px] text-neutral-500">{isIt ? "singolo" : "standalone"}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Features */}
            <div className="mt-6 rounded-xl border border-white/5 bg-neutral-900 p-5">
              <h3 className="mb-3 text-sm font-bold text-white">
                {isIt ? "Cosa include ogni bundle" : "Every bundle includes"}
              </h3>
              <div className="space-y-2.5">
                {[
                  isIt ? "Setup rapido (stesso giorno o 1 giorno)" : "Quick setup (same day or 1 day)",
                  isIt ? "Integrazioni native con i tuoi strumenti" : "Native integrations with your tools",
                  isIt ? "Supporto prioritario via chat" : "Priority support via chat",
                  isIt ? "Aggiornamenti automatici degli agenti" : "Automatic agent updates",
                  isIt ? "Nessun vincolo, cancella quando vuoi" : "No commitment, cancel anytime",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <Check size={10} className="text-emerald-400" />
                    </span>
                    <span className="text-sm font-semibold text-neutral-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: pricing card */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 rounded-2xl border border-white/5 bg-neutral-900 p-6 shadow-xl shadow-black/20">
              {/* Period toggle with sliding indicator */}
              <div className="relative mb-6 flex gap-1 rounded-xl border border-white/10 bg-neutral-800/60 p-1">
                <motion.div
                  className="absolute top-1 bottom-1 rounded-lg bg-brand-500 shadow-lg shadow-brand-500/20"
                  layout
                  layoutId="detail-pill"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    width: `calc((100% - 8px) / 3)`,
                    left: `calc(${PERIODS.indexOf(period)} * (100% - 8px) / 3 + 4px)`,
                  }}
                />
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`relative z-10 flex-1 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors duration-200 ${
                      period === p ? "text-white" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {p === "monthly"
                      ? isIt ? "Mensile" : "Monthly"
                      : p === "quarterly"
                        ? isIt ? "Trim." : "Qtr."
                        : isIt ? "Annuale" : "Yearly"}
                  </button>
                ))}
              </div>

              {/* Animated price */}
              <div className="relative mb-6 text-center h-[80px]">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={period}
                    initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    className="absolute inset-0 flex flex-col items-center"
                  >
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-extrabold text-white">{formatPrice(monthlyPrice)}</span>
                      <span className="text-sm font-semibold text-neutral-500">{periodLabel}</span>
                    </div>
                    <AnimatePresence>
                      {savingsPercent > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
                          className="mt-3 flex items-center justify-center gap-2"
                        >
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-400">
                            <Tag size={12} />
                            -{savingsPercent}% {isIt ? "risparmio" : "off"}
                          </span>
                          {totalDisplay && (
                            <span className="text-sm font-semibold text-neutral-500">
                              {isIt ? "Totale" : "Total"}: {totalDisplay}
                            </span>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Animated savings counter */}
                    <div className="mt-2">
                      <AnimatedSavingsCounter savingsCents={savingsCents} percent={savingsPercent} locale={locale} />
                    </div>
                    <AnimatePresence>
                      {period === "monthly" && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="mt-2 text-xs font-semibold text-neutral-500"
                        >
                          {isIt ? "Prezzo senza bundle" : "Price without bundle"}: {formatMonthlyPrice(pricing.monthly * agents.length)}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* CTA */}
              <AddBundleToCartButton bundleSlug={bundle.slug} period={period} className="w-full justify-center py-3.5 text-base" />

              {/* Trust signals */}
              <div className="mt-5 space-y-2">
                {[
                  { icon: Clock, text: isIt ? "Setup in 24h" : "Setup in 24h" },
                  { icon: Shield, text: isIt ? "Cancelli quando vuoi" : "Cancel anytime" },
                  { icon: Sparkles, text: isIt ? "Aggiornamenti gratuiti" : "Free updates" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                    <Icon size={12} className="text-neutral-600" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
