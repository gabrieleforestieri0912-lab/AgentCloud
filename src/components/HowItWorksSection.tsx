"use client";
/**
 * Come funziona — 4 passi per il cliente: scegli → collega → delega → gestisci.
 * Visual: stepper + esempio concreto (agente, collegamento, chat).
 * Solo transform/opacity, no layout anim.
 *
 * I testi vengono dal dizionario i18n della lingua attiva: il contenuto della
 * sezione (titolo, descrizioni dei passi, esempio) fa parte della traduzione,
 * quindi non è scritto a schivo nel componente.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, PlugZap, MessageSquare, LayoutDashboard, ArrowRight, Check } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

// Icone allineate per indice con `dict.howItWorks.steps`.
const STEP_ICONS = [Bot, PlugZap, MessageSquare, LayoutDashboard];

// Numeri di passo: parte grafica, non contenuto tradotto.
const STEP_NUMBERS = ["01", "02", "03", "04"];

export default function HowItWorksSection() {
  const { dict } = useLanguage();
  const hw = dict.howItWorks;

  return (
    <section id="come-funziona" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl 3xl:max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-400">{hw.badge}</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {hw.titleA}{" "}
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">{hw.titleB}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-neutral-400">
            {hw.subtitle}
          </p>
        </motion.div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hw.steps.map((s, idx) => {
            const Icon = STEP_ICONS[idx] ?? Bot;
            return (
              <motion.div
                key={s.title}
                className="relative rounded-2xl border border-white/5 bg-neutral-900 p-5"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-widest text-brand-400">{STEP_NUMBERS[idx]}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-brand-300">
                    <Icon size={14} />
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold text-white">{s.title}</p>
                <p className="mt-1.5 text-xs font-semibold leading-5 text-neutral-400">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Visual — esempio concreto: dal prodotto al carrello */}
        <motion.div
          className="mx-auto mt-8 max-w-5xl rounded-2xl border border-white/5 bg-neutral-900 p-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold text-neutral-400">{hw.demoTitle}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-neutral-950 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{hw.demoStep1}</p>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/5 bg-neutral-900 p-2.5">
                <span className="h-8 w-8 rounded-lg bg-green-500/20" />
                <div>
                  <p className="text-xs font-bold text-white">{hw.demoAgentName}</p>
                  <p className="text-xs text-neutral-500">{hw.demoAgentPrice} • {hw.demoAgentReady}</p>
                </div>
                <Check size={12} className="ml-auto text-emerald-400" />
              </div>
            </div>
            <div className="rounded-xl border border-white/5 bg-neutral-950 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{hw.demoStep2}</p>
              <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-300">
                <Check size={12} className="mr-1 inline-block -translate-y-px" />
                {hw.demoConnected}
              </div>
            </div>
            <div className="rounded-xl border border-white/5 bg-neutral-950 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{hw.demoStep3}</p>
              <div className="mt-2 rounded-lg bg-brand-500 p-2.5 text-xs font-bold text-white">{hw.demoResult}</div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 text-center">
          <Link href="/agents" className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white hover:bg-brand-400">
            {hw.cta} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}