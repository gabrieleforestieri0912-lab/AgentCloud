/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import Link from "next/link";
import {
  Mail,
  MessageSquare,
  BarChart3,
  Megaphone,
  Users,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    id: "email",
    icon: Mail,
    quote: '"I want to automate my inbox"',
    title: "Email Automation",
    description:
      "Your AI agent drafts replies, schedules follow-ups, and manages your inbox — autonomously.",
    card: (
      <div className="bg-neutral-900 rounded-xl border border-white/5 shadow-sm p-4 space-y-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Email Assistant
          </span>
          <span className="text-xs bg-purple-500/20 text-purple-300 rounded-full px-2 py-0.5 font-semibold">
            Active
          </span>
        </div>
        {[
          {
            label: "Draft Ready",
            sub: "Re: Meeting confirmation",
            color: "bg-purple-500",
          },
          {
            label: "In Queue",
            sub: "Follow-up: Invoice #1042",
            color: "bg-brand-400",
          },
          { label: "Waiting", sub: "Proposal review", color: "bg-neutral-600" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-800"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-200 truncate">
                {item.label}
              </p>
              <p className="text-xs text-neutral-500 truncate">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "chat",
    icon: MessageSquare,
    quote: '"I need better customer support"',
    title: "Support Optimization",
    description:
      "Your AI analyzes requests, categorizes tickets, and responds to customers in real time.",
    card: (
      <div className="bg-neutral-900 rounded-xl border border-white/5 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-linear-to-br from-brand-500 to-pink-600 rounded-md flex items-center justify-center">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-neutral-400">
            Agent Conversation
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-end">
            <div className="bg-brand-500 text-white text-xs px-3 py-2 rounded-xl rounded-br-none max-w-[80%]">
              Ticket spike today — can you analyze?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-neutral-800 text-neutral-300 text-xs font-semibold px-3 py-2 rounded-xl rounded-bl-none max-w-[80%]">
              Scanning today's tickets to identify key issues.
            </div>
          </div>
          <div className="bg-neutral-800 rounded-lg p-3 mt-2">
            <p className="text-xs font-semibold text-neutral-400 mb-2">
              Ticket Summary (76 today)
            </p>
            {[
              { label: "Billing", n: 34, color: "bg-brand-400" },
              { label: "Access", n: 21, color: "bg-pink-400" },
              { label: "Scheduling", n: 12, color: "bg-indigo-400" },
              { label: "General", n: 9, color: "bg-neutral-600" },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${t.color}`} />
                <span className="text-xs font-semibold text-neutral-400 flex-1">
                  {t.label}
                </span>
                <span className="text-xs font-semibold text-neutral-200">
                  {t.n}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "finance",
    icon: BarChart3,
    quote: '"I want automated invoicing"',
    title: "Finance Management",
    description:
      "Track revenue, manage invoices, and receive automated financial reports every month.",
    card: (
      <div className="bg-neutral-900 rounded-xl border border-white/5 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-neutral-400">
            Monthly Overview
          </span>
          <span className="text-xs text-purple-300 font-semibold bg-purple-500/20 px-2 py-0.5 rounded-full">
            +12.4%
          </span>
        </div>
        <p className="text-2xl font-bold text-white mb-1">€24,580</p>
        <p className="text-xs font-semibold text-neutral-400 mb-4">
          Total revenue this month
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Invoices", value: "142" },
            { label: "Pending", value: "€3,200" },
            { label: "Paid", value: "€21,380" },
          ].map((s) => (
            <div key={s.label} className="bg-neutral-800 rounded-lg p-2">
              <p className="text-sm font-bold text-neutral-100">{s.value}</p>
              <p className="text-xs font-semibold text-neutral-400">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "campaigns",
    icon: Megaphone,
    quote: '"I want to launch campaigns faster"',
    title: "Campaign Generation",
    description:
      "Launch multi-channel campaigns with AI-generated content, segmentation, and auto-send.",
    card: (
      <div className="bg-neutral-900 rounded-xl border border-white/5 shadow-sm p-4 space-y-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-400">
            Active Campaigns
          </span>
        </div>
        {[
          {
            name: "Summer Sale",
            channel: "Email + SMS",
            reach: "2.4k sent",
            dot: "bg-purple-500",
          },
          {
            name: "New Launch",
            channel: "Instagram + Email",
            reach: "1.8k reached",
            dot: "bg-brand-400",
          },
          {
            name: "Flash Promo",
            channel: "Push + SMS",
            reach: "3.1k sent",
            dot: "bg-pink-400",
          },
          {
            name: "Loyalty Reward",
            channel: "Email + In-App",
            reach: "1.2k opened",
            dot: "bg-indigo-400",
          },
        ].map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-200">{c.name}</p>
              <p className="text-xs font-semibold text-neutral-400">
                {c.channel}
              </p>
            </div>
            <span className="text-xs font-semibold text-neutral-500 whitespace-nowrap">
              {c.reach}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "leads",
    icon: Users,
    quote: '"I need more local customers"',
    title: "Local Lead Gen",
    description:
      "Your AI identifies leads, qualifies them, and starts sales conversations on its own.",
    card: (
      <div className="bg-neutral-900 rounded-xl border border-white/5 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-neutral-400">
            Lead Pipeline
          </span>
          <span className="text-xs bg-brand-500/20 text-brand-300 rounded-full px-2 py-0.5 font-semibold">
            +12 today
          </span>
        </div>
        <div className="space-y-2">
          {[
            {
              initials: "SM",
              name: "Sara M.",
              time: "2m ago",
              status: "Contacted",
              statusColor: "bg-purple-500/20 text-purple-300",
            },
            {
              initials: "JR",
              name: "Giacomo R.",
              time: "15m ago",
              status: "Qualified",
              statusColor: "bg-brand-500/20 text-brand-300",
            },
            {
              initials: "LK",
              name: "Laura K.",
              time: "1h ago",
              status: "New Lead",
              statusColor: "bg-neutral-800 text-neutral-400",
            },
          ].map((lead) => (
            <div
              key={lead.name}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <div className="w-8 h-8 bg-linear-to-br from-brand-500 to-pink-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                {lead.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-200">
                  {lead.name}
                </p>
                <p className="text-xs font-semibold text-neutral-400">
                  {lead.time}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${lead.statusColor}`}
              >
                {lead.status}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400">
            Conversion rate
          </span>
          <span className="text-sm font-bold text-white">34.2%</span>
        </div>
      </div>
    ),
  },
];

export default function FeaturesSection() {
  return (
    <section id="solutions" className="py-24 bg-neutral-950">
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
              Automations
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            One platform,
            <br />
            <span className="bg-linear-to-r from-brand-500 to-pink-500 bg-clip-text text-transparent">
              every task automated
            </span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            AgentCloud integrates with the tools you already use — from
            productivity suites to CRMs.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
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
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.id}
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
                  <feature.icon size={20} />
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
              <div className="mt-4">{feature.card}</div>
            </motion.div>
          ))}
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
            Deploy Your First Agent
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
