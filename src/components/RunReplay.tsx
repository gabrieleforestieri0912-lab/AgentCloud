"use client";

/**
 * Replay di un run (Fase 5): la timeline dei passi del journal
 * `agent_run_steps`, navigabile (frecce ← → e bottoni), con input/output
 * già mascherati alla scrittura (mask.ts) e ricontrollati al server prima
 * di arrivare qui. Il Replay serve a fidarsi guardando, non a ri-debuggare:
 * nessun dato di nuovo eseguito, solo lettura.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronLeft,
  Clock,
  Wrench,
  Users,
  CircleDot,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import type { AgentRunStepRow, AgentRunStepType } from "@/types/agents-db";

const TIPO_ICON: Record<AgentRunStepType, React.ReactNode> = {
  llm: <Bot size={14} />,
  tool: <Wrench size={14} />,
  delegation: <Users size={14} />,
  approval: <CircleDot size={14} />,
  system: <Clock size={14} />,
};

function formatMs(ms: number | null): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default function RunReplay({
  steps,
}: {
  steps: AgentRunStepRow[];
}) {
  const { dict, locale } = useLanguage();
  const t = dict.agentRuns;
  const [cursor, setCursor] = useState<number | null>(null);
  // null = live tail: il cursore sta sull'ultimo passo (la realtime aggiunge
  // passi e li mostra da soli). La prima navigazione imposta un indice
  // esplicito; tornare all'ultimo passo riaggancia la coda.
  const last = steps.length - 1;
  const index = cursor ?? last;
  const step = steps[index];
  const goto = (target: number | null) => setCursor(target);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setCursor(Math.max(0, Math.min(index, last) - 1));
      }
      if (event.key === "ArrowRight") {
        const next = Math.min(index + 1, last);
        setCursor(next === last ? null : next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, last]);

  if (steps.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-10 text-center text-sm text-neutral-500">
        {t.stepsCount} 0 — {t.empty}
      </p>
    );
  }
  if (!step) return null;

  return (
    <section aria-label={t.replayTitle} className="mt-8">
      <h2 className="text-lg font-bold tracking-tight text-white">{t.replayTitle}</h2>

      {/* cursore */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => goto(Math.max(0, index - 1))}
          disabled={index === 0}
          aria-label={t.prevStep}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] text-neutral-300 hover:bg-white/[0.06] disabled:opacity-30"
        >
          <ChevronLeft size={15} />
        </button>
        <input
          type="range"
          min={0}
          max={last}
          value={index}
          onChange={(e) => goto(Number(e.target.value))}
          aria-label={`${t.stepOf} ${index + 1} / ${steps.length}`}
          className="h-1.5 flex-1 accent-brand-500"
        />
        <span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-neutral-300">
          {t.stepOf} {index + 1} / {steps.length}
        </span>
        <button
          type="button"
          onClick={() => {
            const next = index + 1;
            goto(next === last ? null : next);
          }}
          disabled={index === last}
          aria-label={t.nextStep}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] text-neutral-300 hover:bg-white/[0.06] disabled:opacity-30"
        >
          <ArrowRight size={15} />
        </button>
      </div>

      {/* passo corrente */}
      <div className="mt-3 rounded-2xl border border-white/[0.08] bg-neutral-900/60 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 font-semibold text-brand-300">
            {TIPO_ICON[step.tipo]}
            {step.tipo}
          </span>
          {step.tool_name && (
            <code className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-neutral-300">
              {step.tool_name}
            </code>
          )}
          <span className="inline-flex items-center gap-1 text-neutral-500">
            <Clock size={12} /> {formatMs(step.durata_ms)}
          </span>
          <span className="text-neutral-500">
            {new Date(step.created_at).toLocaleString(locale)}
          </span>
        </div>

        {step.input && Object.keys(step.input).length > 0 && (
          <pre className="mt-3 overflow-x-auto rounded-xl bg-white/[0.04] p-3 text-xs text-neutral-300">
            {JSON.stringify(step.input, null, 2)}
          </pre>
        )}
        {step.output && (
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-white/[0.04] p-3 text-xs text-neutral-300">
            {step.output}
          </pre>
        )}
      </div>

      {/* strip della timeline, compatta e cliccabile */}
      <ol className="mt-4 flex flex-wrap gap-1.5">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => goto(i === last ? null : i)}
              aria-current={i === index}
              title={`${i + 1} · ${s.tipo}${s.tool_name ? ` · ${s.tool_name}` : ""}`}
              className={`h-7 rounded-lg border px-2 text-[11px] font-semibold ${
                i === index
                  ? "border-brand-400/60 bg-brand-500/15 text-brand-300"
                  : "border-white/[0.08] text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {i + 1}
              <span aria-hidden className="ml-1">
                {s.tipo === "tool" ? "⚙" : s.tipo === "llm" ? "◆" : "•"}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <p className="mt-2 text-xs text-neutral-600" aria-hidden>
        <ArrowLeft size={10} className="inline" /> / <ArrowRight size={10} className="inline" /> —
        usa le frecce per navigare ·{" "}
        <Link href="/dashboard/runs" className="text-neutral-500 underline hover:text-neutral-300">
          {t.title}
        </Link>
      </p>
    </section>
  );
}
