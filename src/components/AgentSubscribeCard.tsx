"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import AgentAvatar from "./AgentAvatar";
import type { Agent } from "@/lib/agents";

/**
 * Riquadro di abbonamento nella chat vuota (in alto al centro).
 *
 * Perché esiste: chi apre una chat libera con un agente ancora non abbonato
 * deve capire subito come passare a chat illimitate con quello specifico
 * agente — il contatore freemium da solo non dice dove comprare. Il link va
 * alla pagina dell'agente (`/agents/[slug]`), la stessa usata dal paywall.
 *
 * Mostrato SOLO dalla chat quando il piano è freemium (`unlimited: false`):
 * abbonati e admin non lo vedono, e senza agente selezionato non c'è nulla
 * da vendere qui.
 */
export default function AgentSubscribeCard({
  agent,
  slug,
  remaining,
  limit,
  resetAt,
}: {
  agent: Agent;
  slug: string;
  remaining: number;
  limit: number;
  resetAt?: string | null;
}) {
  const { dict } = useLanguage();
  const time = resetAt
    ? new Date(resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="flex w-full max-w-2xl min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900/80 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-sm">
      <AgentAvatar agent={agent} size="md" />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-bold leading-tight text-white">{agent.name}</p>
        <p className="mt-0.5 break-words text-xs font-semibold leading-tight text-neutral-400">
          {t(dict.chat.subscribeCard.trial, { remaining, limit, time })}
        </p>
      </div>
      <Link
        href={`/agents/${slug}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-400 sm:text-sm"
      >
        <Sparkles size={14} />
        {dict.chat.subscribeCard.cta}
      </Link>
    </div>
  );
}
