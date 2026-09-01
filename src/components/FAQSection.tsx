"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

export default function FAQSection() {
  const { dict } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = dict.faq.items;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <section id="faq" className="py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkles size={13} className="text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
              {dict.faq.badge}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            {dict.faq.titleA}{" "}
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              {dict.faq.titleB}
            </span>
          </h2>
        </motion.div>

        {/* FAQs Accordion Grid */}
        <motion.div
          className="space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.06,
              },
            },
          }}
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              className={`bg-neutral-900 border rounded-2xl overflow-hidden transition-colors duration-200 ${
                openIndex === i
                  ? "border-brand-500/30 shadow-sm shadow-brand-500/10"
                  : "border-white/5 hover:border-white/10"
              }`}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
              }}
            >
              <button
                className="w-full flex items-center justify-between px-6 py-4.5 text-left focus:outline-none cursor-pointer"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
                aria-controls={`faq-answer-${i}`}
              >
                <span
                  className={`text-base font-bold pr-4 transition-colors duration-200 ${
                    openIndex === i ? "text-brand-400" : "text-neutral-200"
                  }`}
                >
                  {faq.q}
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 transition-transform duration-300 ${
                    openIndex === i
                      ? "rotate-180 text-brand-400"
                      : "text-neutral-500"
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    id={`faq-answer-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-5">
                      <p className="text-sm font-semibold text-neutral-400 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact info */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-sm font-semibold text-neutral-400">
            {dict.faq.stillQuestions}{" "}
            <Link
              href="/demo"
              className="text-brand-400 font-bold hover:text-brand-300 transition-colors"
            >
              {dict.faq.contactSupport}
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
