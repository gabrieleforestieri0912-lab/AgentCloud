"use client";

/**
 * Card di un agente nel marketplace.
 *
 * Mostra badge di disponibilità (in arrivo/attivo), icona, nome, categoria,
 * descrizione e prezzo, con link alle azioni principali: pagina agente,
 * deploy/acquisto e avvio della chat. Usata da MarketplaceGrid e agenti
 * correlati in home.
 */
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, MessageSquare, Users, Zap } from "lucide-react";
import type { Agent } from "@/lib/agents";
import { isAvailable } from "@/lib/agents";
import AgentIcon from "./AgentIcon";
import { useLanguage } from "./LanguageProvider";
import AddToCartButton from "./AddToCartButton";

type AgentCardProps = {
  agent: Agent;
  className?: string;
  available?: boolean;
  comingSoonTag?: boolean;
};

export default function AgentCard({
  agent,
  className = "",
  available,
  comingSoonTag = false,
}: AgentCardProps) {
  const { dict, locale } = useLanguage();
  const isAgentAvailable = available ?? isAvailable(agent.slug);
  const chatHref = `/chat?agent=${agent.slug}`;
  const isIt = locale === "it";

  const persuasiveTagline =
    locale === "it"
      ? `Ideale per ${agent.industry} — attivazione ${agent.setupTime.toLowerCase()}`
      : `Perfect for ${agent.industry} — setup ${agent.setupTime.toLowerCase()}`;

  const benefitsTitle = isIt ? "Cosa ottieni" : "What you get";
  const ctaSubtext = isIt ? "Attiva ora" : "Activate now";
  const setupLabel = isIt ? "Setup" : "Setup";

  return (
    <article
      className={`relative group flex flex-col rounded-2xl border bg-neutral-900 p-6 shadow-sm transition-all duration-300 ${
        isAgentAvailable
          ? "border-white/5 hover:-translate-y-2 hover:border-brand-500/30 hover:shadow-2xl hover:shadow-brand-500/10"
          : "border-white/5 opacity-60"
      } ${className}`}
    >
      {/* Gradiente d'accento in alto */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {isAgentAvailable && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500/[0.04] to-purple-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}

      {(!isAgentAvailable || comingSoonTag) && (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-400">
          <Clock size={12} />
          {dict.agentCard.comingSoon}
        </div>
      )}

      {/* Intestazione: icona + categoria + badge */}
      <div className="relative mb-4 flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105 ${agent.accent}`}
        >
          <AgentIcon icon={agent.icon} brand={agent.brand} size={24} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {agent.category}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                agent.badge === "Popular"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                  : agent.badge === "New"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                    : "bg-brand-500/10 text-brand-300 border border-brand-500/20"
              }`}
            >
              {agent.badge}
            </span>
          </div>
          <h3 className="truncate text-[17px] font-bold leading-tight text-white">{agent.name}</h3>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 mt-0.5">
            <Users size={12} className="text-neutral-600" />
            {agent.industry}
          </p>
        </div>
      </div>

      {/* Tempo di setup */}
      <div className="relative mb-3 flex items-center gap-1.5 text-xs text-neutral-500 font-semibold">
        <Clock size={12} />
        {agent.setupTime}
      </div>

      {/* Descrizione persuasiva */}
      <p className="relative text-sm font-bold leading-6 text-white line-clamp-2">{agent.description}</p>
      <p className="relative mt-2 text-xs leading-5 text-neutral-400 line-clamp-2">
        {persuasiveTagline} — {agent.longDescription.slice(0, 110)}...
      </p>

      {/* Benefici */}
      <div className="relative mt-4 rounded-xl border border-white/5 bg-neutral-800/40 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          <Zap size={11} className="text-brand-400" />
          {benefitsTitle}
        </p>
        <div className="space-y-2">
          {agent.tasks.slice(0, 3).map((task) => (
            <div key={task} className="flex items-center gap-2.5 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle2 size={12} className="text-emerald-400" />
              </span>
              <span className="font-semibold text-neutral-200">{task}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Piè di card: prezzo + CTA */}
      <div className="relative mt-5 flex items-center justify-between border-t border-white/5 pt-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{setupLabel}</p>
          <p className="text-xl font-bold text-white">{agent.price}</p>
          <p className="text-xs font-semibold text-neutral-500">{agent.setupTime} · {isIt ? "senza vincoli" : "no commitment"}</p>
        </div>

        {isAgentAvailable ? (
          <div className="relative z-20 flex flex-col items-end gap-2">
            <Link
              href={chatHref}
              aria-label={`${dict.agentCard.buy} ${agent.name}`}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 hover:shadow-brand-500/30 hover:-translate-y-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {ctaSubtext}
              <ArrowRight size={14} />
            </Link>
            <AddToCartButton slug={agent.slug} compact />
          </div>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-5 py-2.5 text-sm font-semibold text-neutral-500 cursor-not-allowed">
            {dict.agentCard.comingSoon}
          </span>
        )}
      </div>
      <Link
        href="/chat"
        className="relative z-20 mt-3 inline-flex items-center justify-center gap-1 text-xs font-bold text-neutral-500 hover:text-brand-400 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <MessageSquare size={12} />
        {isIt ? "Parla con un esperto" : "Talk to an expert"}
      </Link>

      {/* Overlay cliccabile dell'intera card (tranne la CTA) */}
      {isAgentAvailable && (
        <Link href={`/agents/${agent.slug}`} aria-label={`${dict.agentCard.view} ${agent.name}`} className="absolute inset-0 rounded-2xl" />
      )}
    </article>
  );
}
