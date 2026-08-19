"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Star, Clock } from "lucide-react";
import type { Agent } from "@/lib/agents";
import { isAvailable } from "@/lib/agents";
import AgentIcon from "./AgentIcon";
import { useLanguage } from "./LanguageProvider";

type AgentCardProps = {
  agent: Agent;
  className?: string;
  /** Authoritative availability, computed server-side from feature flags. */
  available?: boolean;
};

export default function AgentCard({
  agent,
  className = "",
  available,
}: AgentCardProps) {
  const { dict } = useLanguage();
  // Server pages pass the authoritative value; otherwise fall back to the
  // flags (which resolve to the default vertical in client bundles).
  const isAgentAvailable = available ?? isAvailable(agent.slug);

  return (
    <article
      className={`relative rounded-lg border bg-neutral-900 p-5 shadow-sm transition-all duration-300 ${
        isAgentAvailable
          ? "border-white/5 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-xl hover:shadow-brand-500/10"
          : "border-white/5 opacity-60"
      } ${className}`}
    >
      {!isAgentAvailable && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-400">
          <Clock size={12} />
          {dict.agentCard.comingSoon}
        </div>
      )}

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${agent.accent}`}
          >
            <AgentIcon
              icon={agent.icon}
              brand={agent.brand}
              size={21}
              className="text-white"
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-white">
              {agent.shortName}
            </h3>
            <p className="text-sm font-semibold text-neutral-400">
              {agent.category}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-1 text-sm font-semibold text-neutral-300">
          <Star size={14} className="fill-purple-400 text-purple-400" />
          {agent.rating}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-brand-500/20 px-2.5 py-1 text-xs font-semibold text-brand-300">
          {agent.badge}
        </span>
        <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-400">
          {agent.installs} {dict.agentCard.installs}
        </span>
        <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-400">
          {agent.setupTime}
        </span>
      </div>

      <p className="mb-5 text-sm font-semibold leading-6 text-neutral-400">
        {agent.description}
      </p>

      <div className="mb-5 space-y-2">
        {agent.tasks.slice(0, 3).map((task) => (
          <div
            key={task}
            className="flex items-center gap-2 text-sm text-neutral-300"
          >
            <CheckCircle2 size={16} className="text-purple-400" />
            {task}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {dict.agentCard.setup}
          </p>
          <p className="text-base font-bold text-white">{agent.price}</p>
        </div>

        {isAgentAvailable ? (
          <Link
            href={`/agents/${agent.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-400 group"
          >
            {dict.agentCard.view}
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-500 cursor-not-allowed">
            {dict.agentCard.comingSoon}
          </span>
        )}
      </div>
    </article>
  );
}
