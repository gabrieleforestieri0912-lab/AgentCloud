"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { ArrowRight, CheckCircle2, Clock, Loader2, Rocket } from "lucide-react";
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
  const [isBuying, setIsBuying] = useState(false);

  async function handleBuy(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsBuying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.slug }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // user stays on the page on error
    } finally {
      setIsBuying(false);
    }
  }

  return (
    <article
      className={`relative group rounded-xl border bg-neutral-900 p-6 shadow-sm transition-all duration-300 ${
        isAgentAvailable
          ? "border-white/5 hover:-translate-y-2 hover:border-brand-500/40 hover:shadow-2xl hover:shadow-brand-500/15"
          : "border-white/5 opacity-60"
      } ${className}`}
    >
      {/* Subtle gradient overlay on hover for available agents */}
      {isAgentAvailable && (
        <div className="absolute inset-0 rounded-xl bg-linear-to-br from-brand-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}

      {!isAgentAvailable && (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-400">
          <Clock size={12} />
          {dict.agentCard.comingSoon}
        </div>
      )}

      <div className="relative mb-6 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110 ${agent.accent}`}
          >
            <AgentIcon
              icon={agent.icon}
              brand={agent.brand}
              size={24}
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
      </div>

      <p className="relative mb-6 text-sm font-semibold leading-6 text-neutral-400">
        {agent.description}
      </p>

      <div className="relative mb-6 space-y-2.5">
        {agent.tasks.slice(0, 3).map((task) => (
          <div
            key={task}
            className="flex items-center gap-3 text-sm text-neutral-300"
          >
            <CheckCircle2 size={16} className="text-purple-400" />
            {task}
          </div>
        ))}
      </div>

      <div className="relative flex items-center justify-between border-t border-white/5 pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {dict.agentCard.setup}
          </p>
          <p className="text-xl font-bold text-white">{agent.price}</p>
        </div>

        {isAgentAvailable ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 group-hover:bg-brand-400 group-hover:shadow-lg group-hover:shadow-brand-500/25">
              {dict.agentCard.view}
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
            <button
              type="button"
              onClick={handleBuy}
              disabled={isBuying}
              aria-label={`${dict.agentCard.buy} ${agent.name}`}
              className="relative z-20 inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/10 px-5 py-2.5 text-sm font-semibold text-brand-300 transition-all duration-300 hover:bg-brand-500 hover:text-white disabled:opacity-60"
            >
              {isBuying ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Rocket size={16} />
              )}
              {dict.agentCard.buy}
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-5 py-2.5 text-sm font-semibold text-neutral-500 cursor-not-allowed">
            {dict.agentCard.comingSoon}
          </span>
        )}
      </div>

      {/* The whole card is clickable for available agents (an absolute Link
          overlay avoids nesting a <Link> inside a <Link>). */}
      {isAgentAvailable && (
        <Link
          href={`/agents/${agent.slug}`}
          aria-label={`${dict.agentCard.view} ${agent.name}`}
          className="absolute inset-0 rounded-xl"
        />
      )}
    </article>
  );
}
