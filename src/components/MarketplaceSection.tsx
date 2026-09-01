"use client";

import Link from "next/link";
import { Puzzle, ShoppingCart, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

export default function MarketplaceSection() {
  const { dict } = useLanguage();
  return (
    <section id="marketplace" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header animation */}
        <motion.div
          className="mb-14 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div>
            <div className="mb-5 flex items-center gap-2">
              <ShoppingCart size={13} className="text-brand-400" />
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
                {dict.marketplace.badge}
              </span>
            </div>
            <h2 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {dict.marketplace.titleA}
              <br />
              {dict.marketplace.titleB}
            </h2>
          </div>

          <p className="max-w-2xl text-lg leading-8 text-neutral-400 lg:ml-auto">
            {dict.marketplace.subtitle}
          </p>
        </motion.div>

        {/* Quick solutions grid with premium interactive cards */}
        <motion.div
          className="mb-14 grid gap-4 border-y border-white/5 py-8 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
        >
          {dict.marketplace.quickSolutions.map((solution) => (
            <motion.div
              key={solution.title}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: "easeOut" },
                },
              }}
            >
              <Link
                href="/agents"
                className="block h-full p-4.5 rounded-2xl border border-white/5 bg-neutral-900/50 hover:bg-neutral-900 hover:border-brand-500/30 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
              >
                <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors">
                  {solution.title}
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-neutral-400">
                  {solution.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom browse button */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-brand-500/20 transition-all duration-200 hover:bg-brand-400 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            {dict.marketplace.browseAll}
          </Link>
        </motion.div>

        {/* Custom agent box */}
        <motion.div
          className="mt-14 overflow-hidden rounded-2xl border border-brand-500/20 bg-linear-to-br from-brand-950/50 via-neutral-900 to-purple-950/30 p-6 shadow-sm shadow-brand-500/5 sm:flex sm:items-center sm:justify-between sm:gap-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-purple-500 text-white shadow-md shadow-brand-500/20">
              <Puzzle size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {dict.marketplace.customTitle}
              </h3>
              <p className="mt-1 text-sm leading-6 text-neutral-400">
                {dict.marketplace.customText}
              </p>
            </div>
          </div>

          <Link
            href="/demo"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 hover:shadow-lg hover:shadow-brand-500/30 active:scale-[0.98] sm:mt-0"
          >
            <Zap size={16} />
            {dict.marketplace.buildCustom}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
