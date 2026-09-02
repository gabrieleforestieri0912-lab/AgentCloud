"use client";
import Link from "next/link";
import {
  Mail,
  MessageSquare,
  BarChart3,
  Megaphone,
  Users,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";
import type { FeatureItem } from "@/lib/i18n/dictionaries";

const FEATURE_ICONS = [MessageSquare, Megaphone, BarChart3, Users, Mail, Briefcase];

export default function FeaturesSection() {
  const { dict } = useLanguage();
  const features = dict.features.items;

  return (
    <section id="solutions" className="py-24">
      <div className="max-w-7xl 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
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
              {dict.features.badge}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            {dict.features.titleA}
            <br />
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              {dict.features.titleB}
            </span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            {dict.features.subtitle}
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 gap-6"
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
          {features.map((feature, i) => {
            const Icon = FEATURE_ICONS[i] ?? Sparkles;
            return (
              <motion.div
                key={feature.title}
                className="bg-neutral-900 rounded-2xl border border-white/5 p-6 hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-1 transition-all duration-300 group"
                variants={{
                  hidden: { opacity: 0, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    scale: 1,
                    transition: { duration: 0.5, ease: "easeOut" },
                  },
                }}
              >
                <div className="mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-neutral-800 text-neutral-400 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300">
                    <Icon size={20} />
                  </div>
                  <p className="text-xs font-semibold text-neutral-500 italic mb-2">
                    {feature.quote}
                  </p>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm font-semibold text-neutral-400">
                    {feature.description}
                  </p>
                </div>
                <div className="mt-4">
                  <FeatureCard feature={feature} />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 bg-brand-500 text-white px-8 py-3.5 rounded-full font-medium hover:bg-brand-400 hover:-translate-y-0.5 transition-all"
          >
            {dict.features.cta}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

type FeatureCardData =
  | {
      variant: "chat";
      title: string;
      userBubble: string;
      agentBubble: string;
      summaryTitle: string;
      rows: { label: string; n: number }[];
    }
  | {
      variant: "finance";
      title: string;
      totalLabel: string;
      stats: { label: string; value: string }[];
    }
  | {
      variant: "leads";
      title: string;
      todayBadge: string;
      leads: { initials: string; name: string; time: string; status: string }[];
      conversionLabel: string;
    }
  | {
      variant: "campaigns";
      title: string;
      rows: { name: string; channel: string; reach: string }[];
    }
  | {
      variant: "email" | "projects";
      title: string;
      status?: string;
      rows: { label: string; sub: string }[];
    };

function FeatureCard({ feature }: { feature: FeatureItem }) {
  const card = feature.card as FeatureCardData;

  if (card.variant === "chat") {
    return (
      <div className="bg-neutral-900 rounded-xl border border-white/5 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-linear-to-br from-brand-500 to-pink-600 rounded-md flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-neutral-400">{card.title}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-end">
            <div className="bg-brand-500 text-white text-xs px-3 py-2 rounded-xl rounded-br-none max-w-[80%]">
              {card.userBubble}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-neutral-800 text-neutral-300 text-xs font-semibold px-3 py-2 rounded-xl rounded-bl-none max-w-[80%]">
              {card.agentBubble}
            </div>
          </div>
          <div className="bg-neutral-800 rounded-lg p-3 mt-2">
            <p className="text-xs font-semibold text-neutral-400 mb-2">
              {card.summaryTitle}
            </p>
            {card.rows.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ["bg-brand-400", "bg-pink-400", "bg-indigo-400", "bg-neutral-600"][idx % 4]
                  }`}
                />
                <span className="text-xs font-semibold text-neutral-400 flex-1">
                  {t.label}
                </span>
                <span className="text-xs font-semibold text-neutral-200">{t.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (card.variant === "finance") {
    return (
      <div className="bg-neutral-900 rounded-xl border border-white/5 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-neutral-400">{card.title}</span>
          <span className="text-xs text-purple-300 font-semibold bg-purple-500/20 px-2 py-0.5 rounded-full">
            +12.4%
          </span>
        </div>
        <p className="text-2xl font-bold text-white mb-1">€24,580</p>
        <p className="text-xs font-semibold text-neutral-400 mb-4">{card.totalLabel}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {card.stats.map((s, idx) => (
            <div key={idx} className="bg-neutral-800 rounded-lg p-2">
              <p className="text-sm font-bold text-neutral-100">{s.value}</p>
              <p className="text-xs font-semibold text-neutral-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card.variant === "leads") {
    return (
      <div className="bg-neutral-900 rounded-xl border border-white/5 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-neutral-400">{card.title}</span>
          <span className="text-xs bg-brand-500/20 text-brand-300 rounded-full px-2 py-0.5 font-semibold">
            {card.todayBadge}
          </span>
        </div>
        <div className="space-y-2">
          {card.leads.map((lead, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <div className="w-8 h-8 bg-linear-to-br from-brand-500 to-pink-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                {lead.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-200">{lead.name}</p>
                <p className="text-xs font-semibold text-neutral-400">{lead.time}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  idx === 2 ? "bg-neutral-800 text-neutral-400" : "bg-purple-500/20 text-purple-300"
                }`}
              >
                {lead.status}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400">{card.conversionLabel}</span>
          <span className="text-sm font-bold text-white">34.2%</span>
        </div>
      </div>
    );
  }

  if (card.variant === "campaigns") {
    return (
      <div className="bg-neutral-900 rounded-xl border border-white/5 shadow-sm p-4 space-y-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-400">{card.title}</span>
        </div>
        {card.rows.map((c, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                ["bg-purple-500", "bg-brand-400", "bg-pink-400", "bg-indigo-400"][idx % 4]
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-200">{c.name}</p>
              <p className="text-xs font-semibold text-neutral-400">{c.channel}</p>
            </div>
            <span className="text-xs font-semibold text-neutral-500 whitespace-nowrap">
              {c.reach}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // email / projects variants (label/sub rows). If a new `variant` is added
  // to the dictionaries it must also be added to FeatureCardData above,
  // otherwise it silently falls through to this rows branch.
  return (
    <div className="bg-neutral-900 rounded-xl border border-white/5 shadow-sm p-4 space-y-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          {card.title}
        </span>
        {"status" in card && (
          <span className="text-xs bg-purple-500/20 text-purple-300 rounded-full px-2 py-0.5 font-semibold">
            {card.status}
          </span>
        )}
      </div>
      {card.rows.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-800">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              ["bg-purple-500", "bg-brand-400", "bg-neutral-600"][idx % 3]
            }`}
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-neutral-200 truncate">{item.label}</p>
            <p className="text-xs text-neutral-500 truncate">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
