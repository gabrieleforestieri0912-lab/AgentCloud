"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo";
import { useLanguage } from "./LanguageProvider";

const INTEGRATIONS = [
  { name: "Shopify", category: "E-commerce", brand: "shopify" },
  { name: "WooCommerce", category: "E-commerce", brand: "woocommerce" },
  { name: "Stripe", category: "Payments", brand: "stripe" },
  { name: "PayPal", category: "Payments", brand: "paypal" },
  { name: "WhatsApp", category: "Messaging", brand: "whatsapp" },
  { name: "Facebook", category: "Social & Ads", brand: "facebook" },
  { name: "Instagram", category: "Social & Ads", brand: "instagram" },
  { name: "TikTok", category: "Social & Ads", brand: "tiktok" },
  { name: "Google Ads", category: "Advertising", brand: "googleads" },
  { name: "Google Analytics", category: "Analytics", brand: "googleanalytics" },
  { name: "Google Calendar", category: "Calendar", brand: "googlecalendar" },
  { name: "Google Meet", category: "Meetings", brand: "googlemeet" },
  { name: "Gmail", category: "Email Service", brand: "gmail" },
  { name: "Mailchimp", category: "Email Marketing", brand: "mailchimp" },
  { name: "Calendly", category: "Scheduling", brand: "calendly" },
  { name: "HubSpot", category: "CRM", brand: "hubspot" },
];

export default function IntegrationsSection() {
  const { dict } = useLanguage();
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkles size={13} className="text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
              {dict.integrations.badge}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            {dict.integrations.titleA}
            <br />
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              {dict.integrations.titleB}
            </span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            {dict.integrations.subtitle}
          </p>
        </motion.div>

        {/* Integration grid with original brand marks */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
        >
          {INTEGRATIONS.map((int) => (
            <motion.div
              key={int.name}
              className="flex items-center gap-4 p-3 rounded-2xl bg-neutral-900/50 hover:bg-neutral-900 hover:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.3)] border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer group"
              variants={{
                hidden: { opacity: 0, scale: 0.95 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.4, ease: "easeOut" },
                },
              }}
            >
              <div className="w-16 h-16 shrink-0 bg-neutral-900 rounded-2xl border border-white/5 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <BrandLogo slug={int.brand} size={28} />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-white group-hover:text-brand-400 transition-colors text-sm sm:text-base truncate">
                  {int.name}
                </span>
                <span className="text-xs text-neutral-500 truncate">
                  {(dict.integrations.categories as Record<string, string>)[int.category] ?? int.category}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 bg-brand-500 text-white px-8 py-3.5 rounded-full font-medium hover:bg-brand-400 hover:-translate-y-0.5 transition-all"
          >
            {dict.integrations.cta}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
