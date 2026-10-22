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
import BrandLogo from "./BrandLogo";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import { AGENTS, formatAgentPriceRange } from "@/lib/agents";

// Icone allineate per indice con `dict.howItWorks.steps`.
const STEP_ICONS = [Bot, PlugZap, MessageSquare, LayoutDashboard];

// Numeri di passo: parte grafica, non contenuto tradotto.
const STEP_NUMBERS = ["01", "02", "03", "04"];

export default function HowItWorksSection() {
  const { dict, locale } = useLanguage();
  const hw = dict.howItWorks;
  // Il primo passo cita quante categorie ha il catalogo: si conta qui.
  const categories = new Set(AGENTS.map((a) => a.category)).size;

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
            // Il primo passo cita numero di agenti, categorie e fascia di
            // prezzo: arrivano dal catalogo, così non invecchiano nel testo.
            const desc =
              idx === 0
                ? t(s.desc, {
                    count: AGENTS.length,
                    cats: categories,
                    price: formatAgentPriceRange(locale),
                  })
                : s.desc;
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
                <p className="mt-1.5 text-xs font-semibold leading-5 text-neutral-400">{desc}</p>
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
            {/* I tre passi dell'esempio hanno la STESSA anatomia: etichetta
                sopra, riquadro dentro con icona + testo, stessa altezza.
                Prima ogni scheda aveva un impianto diverso (una riga con
                logo, un chip verde, un chip arancione) e non si allineavano. */}
            <div className="flex flex-col rounded-xl border border-white/5 bg-neutral-950 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{hw.demoStep1}</p>
              <div className="mt-2 flex min-h-14 flex-1 items-center gap-2 rounded-lg border border-white/5 bg-neutral-900 p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
                  <BrandLogo slug="shopify" size={20} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{hw.demoAgentName}</p>
                  <p className="truncate text-xs text-neutral-500">{hw.demoAgentPrice} • {hw.demoAgentReady}</p>
                </div>
                <Check size={12} className="ml-auto shrink-0 text-emerald-400" />
              </div>
            </div>
            <div className="flex flex-col rounded-xl border border-white/5 bg-neutral-950 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{hw.demoStep2}</p>
              <div className="mt-2 flex min-h-14 flex-1 items-center gap-2 rounded-lg border border-white/5 bg-neutral-900 p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <PlugZap size={15} />
                </span>
                <p className="min-w-0 text-xs font-bold text-white">{hw.demoConnected}</p>
              </div>
            </div>
            <div className="flex flex-col rounded-xl border border-white/5 bg-neutral-950 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{hw.demoStep3}</p>
              <div className="mt-2 flex min-h-14 flex-1 items-center gap-2 rounded-lg border border-white/5 bg-neutral-900 p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300">
                  <MessageSquare size={15} />
                </span>
                <p className="min-w-0 text-xs font-bold text-white">{hw.demoResult}</p>
              </div>
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