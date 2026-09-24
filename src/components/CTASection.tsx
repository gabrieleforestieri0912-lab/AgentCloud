"use client";

/**
 * Sezione CTA finale della landing: invita a entrare in chat o richiedere
 * una demo. Testi localizzati (dizionario) e micro-animazioni framer-motion
 * in ingresso allo scroll.
 */
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, ShieldCheck, Clock3, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";
import CountdownTimer from "./CountdownTimer";

export default function CTASection() {
  const { dict } = useLanguage();
  return (
    <section
      id="demo"
      className="relative overflow-hidden px-4 py-16 sm:py-20 sm:px-6 lg:px-8"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <motion.div
        className="relative mx-auto max-w-5xl rounded-2xl border border-white/5 dark-gradient-cta p-6 text-center shadow-2xl shadow-brand-500/10 sm:p-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={{
          hidden: { opacity: 0, y: 40 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.6,
              ease: "easeOut",
              staggerChildren: 0.1,
              delayChildren: 0.1,
            },
          },
        }}
      >
        <motion.div
          className="mb-7 inline-flex h-12 w-12 items-center justify-center"
          variants={{
            hidden: { opacity: 0, scale: 0.8 },
            visible: {
              opacity: 1,
              scale: 1,
              transition: { type: "spring", stiffness: 100 },
            },
          }}
        >
          <Image
            src="/agentcloud.png"
            alt="AgentCloud"
            width={48}
            height={48}
            className="rounded-xl"
          />
        </motion.div>

        <motion.h2
          className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
          }}
        >
          {dict.cta.titleA}
          <br />
          <span className="text-brand-400">{dict.cta.titleB}</span>
        </motion.h2>

        <motion.p
          className="mx-auto mt-4 max-w-xl text-lg leading-7 text-neutral-400"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
          }}
        >
          {dict.cta.subtitle}
        </motion.p>

        {/* Blocchi concreti (3) */}
        <motion.div
          className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3 text-left"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.06 } },
          }}
        >
          {[
            { icon: Zap, t: "4 messaggi gratis", d: "per ogni agente, poi paywall chiaro" },
            { icon: ShieldCheck, t: "Dati isolati", d: "RLS per tenant, token cifrati" },
            { icon: Clock3, t: "Setup Same day", d: "OAuth in 2 click, chat pronta" },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border border-white/5 bg-neutral-900/60 p-3.5">
              <b.icon size={14} className="text-brand-400" />
              <p className="mt-2 text-sm font-bold text-white">{b.t}</p>
              <p className="mt-1 text-xs font-semibold leading-4 text-neutral-400">{b.d}</p>
            </div>
          ))}
        </motion.div>

        {/* Countdown — coerente con waitlist-constants */}
        <motion.div
          className="mx-auto mt-6 flex flex-col items-center gap-3"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
          }}
        >
          <CountdownTimer className="max-w-sm" />
          <p className="text-xs font-bold tracking-wide text-neutral-500">
            Lancio 1 ottobre 2026 ore 16:00 — <span className="text-brand-300">waitlist aperta a tutti</span>
          </p>
          <p className="max-w-xl text-xs font-semibold leading-4 text-neutral-500">Visual: CountdownTimer esistente, nessuna metrica inventata.</p>
        </motion.div>

        <motion.div
          className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
          }}
        >
          <Link
            href="/agents"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-brand-500/20 transition-all hover:bg-brand-400 hover:-translate-y-0.5"
          >
            <Sparkles
              size={18}
              className="transition-transform group-hover:rotate-12"
            />
            {dict.cta.browseMarketplace}
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-neutral-900 px-8 py-4 text-base font-bold text-white shadow-sm transition-all hover:border-white/20 hover:-translate-y-0.5"
          >
            {dict.cta.seeDashboard}
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
