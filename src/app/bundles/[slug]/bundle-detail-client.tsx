"use client";

/**
 * Dettaglio bundle: elenco agenti, pricing mensile/trimestrale/annuale,
 * e CTA per attivazione.
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Clock, Tag, Shield, Zap } from "lucide-react";
import type { Bundle, BundlePeriod } from "@/lib/bundles";
import { formatPrice, formatMonthlyPrice, getBundleAgents } from "@/lib/bundles";
import AgentIcon from "@/components/AgentIcon";
import { useLanguage } from "@/components/LanguageProvider";
import AddBundleToCartButton from "@/components/AddBundleToCartButton";

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
              {/* Period toggle */}
              <div className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-neutral-800/60 p-1">
                {(["monthly", "quarterly", "yearly"] as BundlePeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-bold transition-all ${
                      period === p
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-700/50"
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

              {/* Price */}
              <div className="mb-6 text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold text-white">{formatPrice(monthlyPrice)}</span>
                  <span className="text-sm font-semibold text-neutral-500">{periodLabel}</span>
                </div>
                {savingsPercent > 0 && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-400">
                      <Tag size={12} />
                      -{savingsPercent}% {isIt ? "risparmio" : "off"}
                    </span>
                    {totalDisplay && (
                      <span className="text-sm font-semibold text-neutral-500">
                        {isIt ? "Totale" : "Total"}: {totalDisplay}
                      </span>
                    )}
                  </div>
                )}
                {period === "monthly" && (
                  <p className="mt-2 text-xs font-semibold text-neutral-500">
                    {isIt ? "Prezzo senza bundle" : "Price without bundle"}: {formatMonthlyPrice(pricing.monthly * agents.length)}
                  </p>
                )}
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
