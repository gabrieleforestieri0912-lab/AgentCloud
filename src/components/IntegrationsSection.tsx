"use client";

/**
 * Sezione "integrazioni" della landing: loghi dei servizi collegabili
 * (Shopify, Google, Stripe...) con link alla pagina integrazioni. I loghi
 * vengono dal registry brand condiviso.
 *
 * Disposizione pensata per la conversione: prima solo i loghi di ciò che è
 * già live — niente etichette "disponibile": l'assenza di segni dice già che
 * funziona — poi una sola riga che conta quello che arriva, senza esporre
 * tutta la roadmap (resta sulla pagina /integrations).
 */
import Link from "next/link";
import { reveal } from "@/lib/motion";
import { Sparkles, ShieldCheck, PlugZap, Lock } from "lucide-react";
import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import { INTEGRATIONS as REGISTRY } from "@/lib/integrations";

export default function IntegrationsSection() {
  const { dict } = useLanguage();
  const ig = dict.integrations;
  const live = REGISTRY.filter((i) => i.available);
  const coming = REGISTRY.filter((i) => !i.available);
  // Icone allineate per indice con `dict.integrations.points`.
  const POINT_ICONS = [PlugZap, Lock, ShieldCheck];

  return (
    <section id="integrazioni" className="py-16 sm:py-20">
      <div className="max-w-7xl 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          {...reveal(20, 0.6)}
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkles size={13} className="text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
              {ig.badge}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
            {ig.titleA}
            <br />
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              {ig.titleB}
            </span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            {ig.subtitle}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-xs font-semibold text-neutral-500">
            {t(ig.summary, { live: live.length })}
          </p>
        </motion.div>

        {/* Blocchi concreti (3) */}
        <div className="mx-auto mb-10 grid max-w-5xl gap-3 sm:grid-cols-3">
          {ig.points.map((b, idx) => {
            const Icon = POINT_ICONS[idx] ?? PlugZap;
            return (
              <div key={b.title} className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
                <Icon size={16} className="text-brand-400" />
                <p className="mt-2 text-sm font-bold text-white">{b.title}</p>
                <p className="mt-1 text-xs font-semibold leading-4 text-neutral-400">{b.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Disponibili — solo i loghi, senza etichette: un marchio assieme
            agli altri dice "funziona" meglio di dieci badge "Live". */}
        <motion.ul
          className="flex flex-wrap justify-center gap-3 max-w-5xl 3xl:max-w-7xl mx-auto mb-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
          aria-label={ig.liveHeading}
        >
          {live.map((int) => (
            <motion.li
              key={int.name}
              className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-neutral-900 border border-white/10 hover:border-white/25 transition-colors flex items-center justify-center"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
            >
              <span title={int.name} className="flex items-center justify-center">
                <BrandLogo slug={int.brand} size={28} className="max-w-[70%] max-h-[70%]" />
              </span>
            </motion.li>
          ))}
        </motion.ul>

        {/* Le altre esistono, ma senza esporre l'elenco: la roadmap completa
            vive sulla pagina integrazioni. */}
        <p className="text-center text-xs font-semibold text-neutral-500 mx-auto max-w-5xl mb-8">
          {t(ig.comingShort, { count: coming.length })}
        </p>

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
            {ig.cta}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
