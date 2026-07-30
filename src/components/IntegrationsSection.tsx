/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGoogle,
  faMicrosoft,
  faSlack,
  faStripe,
  faShopify,
  faWhatsapp,
  faDropbox,
  faTiktok,
  faHubspot,
  faFacebook,
} from "@fortawesome/free-brands-svg-icons";
import {
  faBook,
  faBolt,
  faCloud,
  faTable,
  faCalendarDays,
  faComment,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";

const INTEGRATIONS = [
  {
    name: "Azure",
    category: "Cloud Infrastructure",
    icon: faCloud,
    color: "text-[#0089d6]",
  },
  {
    name: "Dropbox",
    category: "Cloud Storage",
    icon: faDropbox,
    color: "text-[#0061FE]",
  },
  {
    name: "Outlook",
    category: "Email & Calendar",
    icon: faEnvelope,
    color: "text-[#0078d4]",
  },
  {
    name: "TikTok",
    category: "Social & Ads",
    icon: faTiktok,
    color: "text-white",
  },
  {
    name: "Cal.com",
    category: "Scheduling",
    icon: faCalendarDays,
    color: "text-white",
  },
  {
    name: "Excel",
    category: "Spreadsheets",
    icon: faTable,
    color: "text-[#107C41]",
  },
  {
    name: "PowerPoint",
    category: "Presentations",
    icon: faMicrosoft,
    color: "text-[#D83B01]",
  },
  {
    name: "Twilio",
    category: "SMS & VoIP",
    icon: faComment,
    color: "text-[#F22F46]",
  },
  {
    name: "Google Calendar",
    category: "Calendar",
    icon: faGoogle,
    color: "text-[#4285F4]",
  },
  {
    name: "Facebook",
    category: "Social & Ads",
    icon: faFacebook,
    color: "text-[#1877F2]",
  },
  {
    name: "Google Sheets",
    category: "Spreadsheets",
    icon: faTable,
    color: "text-[#0F9D58]",
  },
  {
    name: "WhatsApp",
    category: "Messaging",
    icon: faWhatsapp,
    color: "text-[#25D366]",
  },
  {
    name: "Calendly",
    category: "Scheduling",
    icon: faCalendarDays,
    color: "text-[#006BFF]",
  },
  {
    name: "Gmail",
    category: "Email Service",
    icon: faGoogle,
    color: "text-[#EA4335]",
  },
  {
    name: "Shopify",
    category: "E-commerce",
    icon: faShopify,
    color: "text-[#96BF48]",
  },
  {
    name: "Word",
    category: "Documents",
    icon: faBook,
    color: "text-[#106EBE]",
  },
];

export default function IntegrationsSection() {
  return (
    <section className="py-24 bg-neutral-950">
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
              Integrations
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Works with the tools
            <br />
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              your team already uses
            </span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            AgentCloud connects with the platforms your business runs on — from
            productivity tools to CRMs, communication apps to automation
            workflows.
          </p>
        </motion.div>

        {/* Integration grid */}
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
          {INTEGRATIONS.map((int, i) => (
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
                <FontAwesomeIcon
                  icon={int.icon}
                  className={`text-2xl ${int.color}`}
                />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-white group-hover:text-brand-400 transition-colors text-sm sm:text-base truncate">
                  {int.name}
                </span>
                <span className="text-xs text-neutral-500 truncate">
                  {int.category}
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
            Explore AgentCloud Integrations
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
