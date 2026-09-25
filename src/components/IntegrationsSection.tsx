"use client";

/**
 * Sezione "integrazioni" della landing: loghi dei servizi collegabili
 * (Shopify, Google, Stripe...) con link alla pagina integrazioni. I loghi
 * vengono dal registry brand condiviso.
 */
import Link from "next/link";
import { Sparkles, ShieldCheck, PlugZap, Lock } from "lucide-react";
import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo";
import { useLanguage } from "./LanguageProvider";
import { INTEGRATIONS as REGISTRY } from "@/lib/integrations";

export default function IntegrationsSection() {
  const { dict } = useLanguage();
  const live = REGISTRY.filter((i) => i.available);
  const coming = REGISTRY.filter((i) => !i.available);
  const featuredLive = live.slice(0, 8);
  const featuredComing = coming.slice(0, 8);
  return (
    <section id="integrazioni" className="py-16 sm:py-20">
      <div className="max-w-7xl 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkles size={13} className="text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
              {dict.integrations.badge}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
            {dict.integrations.titleA}
            <br />
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              {dict.integrations.titleB}
            </span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            {dict.integrations.subtitle}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-xs font-semibold text-neutral-500">
            8 live • {coming.length} in arrivo — Shopify OAuth live, token per tenant via Edge, nessun segreto nel client.
          </p>
        </motion.div>

        {/* Blocchi concreti (3) + visual */}
        <div className="mx-auto mb-10 grid max-w-5xl gap-3 sm:grid-cols-3">
          {[
            { icon: PlugZap, t: "OAuth sicuro", d: "Shopify, Gmail, Calendar con token per tenant" },
            { icon: Lock, t: "Nessun segreto client", d: "Chiamate proxate da Edge Functions" },
            { icon: ShieldCheck, t: "RLS per tenant", d: "Ogni tabella isolata su Supabase" },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
              <b.icon size={16} className="text-brand-400" />
              <p className="mt-2 text-sm font-bold text-white">{b.t}</p>
              <p className="mt-1 text-xs font-semibold leading-4 text-neutral-400">{b.d}</p>
            </div>
          ))}
        </div>

        {/* Live */}
        <p className="mx-auto mb-3 max-w-5xl text-xs font-bold uppercase tracking-widest text-emerald-300">Live — pronte all’uso</p>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl 3xl:max-w-7xl mx-auto mb-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
        >
          {featuredLive.map((int) => (
            <motion.div
              key={int.name}
              className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-emerald-500/15 hover:border-emerald-500/30 transition-colors group"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
            >
              <div className="w-12 h-12 shrink-0 bg-neutral-950 rounded-xl border border-white/5 flex items-center justify-center">
                <BrandLogo slug={int.brand} size={24} />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-white truncate">{int.name}</span>
                <span className="block text-xs font-semibold text-emerald-300">Live</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* In arrivo */}
        <p className="mx-auto mb-3 max-w-5xl text-xs font-bold uppercase tracking-widest text-amber-300">In arrivo — badge dedicato</p>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl 3xl:max-w-7xl mx-auto mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
        >
          {featuredComing.map((int) => (
            <motion.div
              key={int.name}
              className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-900/50 border border-white/5 opacity-90"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
            >
              <div className="w-12 h-12 shrink-0 bg-neutral-900 rounded-xl border border-white/5 flex items-center justify-center">
                <BrandLogo slug={int.brand} size={24} />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-white truncate">{int.name}</span>
                <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">In arrivo</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link
            href="/integrations"
            className="inline-flex items-center gap-2 bg-brand-500 text-white px-8 py-3.5 rounded-full font-bold hover:bg-brand-400 hover:-translate-y-0.5 transition-all"
          >
            {dict.integrations.cta}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
