"use client";

/**
 * Sezione "app" della landing: desktop, mobile, CLI ed estensione, con un
 * link per ogni client alla sua pagina dedicata. Stessi agenti, stessa
 * sessione, ovunque.
 */
import Link from "next/link";
import { reveal, enter } from "@/lib/motion";
import { MonitorDown, Smartphone, TerminalSquare, PanelRight, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

export default function AppsSection() {
  const { dict } = useLanguage();
  const a = dict.apps;
  const cards = [
    { icon: MonitorDown, title: a.desktopTitle, desc: a.desktopDesc, href: "/desktop", soon: true },
    { icon: Smartphone, title: a.mobileTitle, desc: a.mobileDesc, href: "/mobile", soon: true },
    { icon: TerminalSquare, title: a.cliTitle, desc: a.cliDesc, href: "/cli", soon: false },
    { icon: PanelRight, title: a.extTitle, desc: a.extDesc, href: "/extension", soon: true },
  ];
  return (
    <section id="app" className="py-16 sm:py-20">
      <div className="max-w-7xl 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          {...reveal(20, 0.6)}
        >
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkles size={13} className="text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
              {a.badge}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
            {a.title}
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            {a.subtitle}
          </p>
        </motion.div>

        <div className="mx-auto mb-10 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon: Icon, title, desc, href, soon }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-2xl border border-white/5 bg-neutral-900/60 p-5 transition-all hover:border-brand-500/30 hover:bg-neutral-900"
            >
              <div className="flex items-center justify-between gap-2">
                <Icon size={20} className="text-brand-400" />
                {soon && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                    {a.soon}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-bold text-white">{title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-neutral-400">{desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-400 transition-transform group-hover:translate-x-0.5">
                <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>

        {/* Ogni card porta alla pagina del suo client. Il bottone in fondo
            punta alla CLI: è l'unico client installabile oggi, quindi
            l'unica azione reale da offrire qui. */}
        <div className="text-center">
          <Link
            href="/cli"
            className="inline-flex items-center gap-2 bg-brand-500 text-white px-8 py-3.5 rounded-full font-bold hover:bg-brand-400 hover:-translate-y-0.5 transition-all"
          >
            {a.cliCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
