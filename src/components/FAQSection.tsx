"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FAQS = [
  {
    q: "What is AgentCloud?",
    a: "AgentCloud is an AI agent platform designed to help businesses automate operations, reduce overhead, and create room for growth. We offer pre-built and customizable AI agents that integrate with the tools you already use.",
  },
  {
    q: "Who is AgentCloud for?",
    a: "AgentCloud is built for founders, operations teams, and SMBs who want to leverage AI without hiring developers or building solutions from scratch.",
  },
  {
    q: "What kind of business tasks can AgentCloud automate?",
    a: "AgentCloud can automate customer support, email management, lead generation, content scheduling, invoice processing, marketing campaigns, and much more.",
  },
  {
    q: "Are these ready-to-use or custom solutions?",
    a: "Both. You get access to pre-configured agents you can activate immediately, plus the ability to customize them to your specific workflows.",
  },
  {
    q: "How do I know which solution is right for my business?",
    a: "Book a free demo with our team. We'll analyze your processes and recommend the best agents for your needs.",
  },
  {
    q: "How long does setup take?",
    a: "Most agents can be activated within hours. More complex configurations with multiple integrations may take 1–3 business days.",
  },
  {
    q: "What tools does AgentCloud integrate with?",
    a: "AgentCloud integrates with Gmail, Outlook, Slack, Notion, HubSpot, Stripe, Shopify, Zapier, Salesforce, WhatsApp, and many more tools.",
  },
  {
    q: "Do I need technical skills to use it?",
    a: "No. AgentCloud is designed to be accessible to everyone. No coding or technical expertise is required to set up and use our agents.",
  },
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-neutral-950">
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
              FAQ
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Frequently asked{" "}
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              questions
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
          {FAQS.map((faq, i) => (
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
            Still have questions?{" "}
            <Link
              href="/demo"
              className="text-brand-400 font-bold hover:text-brand-300 transition-colors"
            >
              Contact support
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
