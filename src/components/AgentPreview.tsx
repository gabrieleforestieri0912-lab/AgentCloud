"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, CheckCircle2, Loader2, Play, Send, Sparkles } from "lucide-react";
import type { Agent } from "@/lib/agents";
import AgentIcon from "./AgentIcon";
import { useLanguage } from "./LanguageProvider";

type AgentPreviewProps = {
  agent: Agent;
};

type StepStatus = "pending" | "running" | "done";

export default function AgentPreview({ agent }: AgentPreviewProps) {
  const { dict } = useLanguage();
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(() =>
    agent.workflow.map(() => "pending"),
  );
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "running") return;

    let cancelled = false;
    const runSteps = async () => {
      for (let i = 0; i < agent.workflow.length; i++) {
        if (cancelled) return;
        setStepStatuses((prev) =>
          prev.map((s, idx) => (idx === i ? "running" : idx < i ? "done" : "pending")),
        );
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));
      }
      if (cancelled) return;
      setStepStatuses(agent.workflow.map(() => "done"));
      await new Promise((r) => setTimeout(r, 300));
      if (cancelled) return;
      setStatus("done");
      setShowResult(true);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    };
    runSteps();

    return () => { cancelled = true; };
  }, [status, agent.workflow]);

  function reset() {
    setStatus("idle");
    setStepStatuses(agent.workflow.map(() => "pending"));
    setShowResult(false);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-neutral-900 shadow-xl shadow-brand-500/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${agent.accent}`}>
            <AgentIcon icon={agent.icon} brand={agent.brand} size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{agent.shortName}</p>
            <p className="text-xs font-semibold text-neutral-500">{dict.agentPreview.livePreview}</p>
          </div>
        </div>
        <span className="rounded-full bg-brand-500/20 px-2.5 py-1 text-[11px] font-bold text-brand-300">
          {dict.agentPreview.demoMode}
        </span>
      </div>

      {/* Conversation area */}
      <div className="space-y-4 px-5 py-5">
        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-[88%] rounded-2xl rounded-br-md bg-brand-500 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
            {agent.previewPrompt}
          </div>
        </div>

        {/* Agent response area */}
        <div className="flex items-start gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${agent.accent}`}>
            <Bot size={16} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            {/* Idle state */}
            {status === "idle" && (
              <div className="rounded-2xl rounded-bl-md border border-white/5 bg-neutral-800 px-4 py-3">
                <p className="text-sm font-semibold leading-relaxed text-neutral-400">
                  {dict.agentPreview.readyToSimulate.replace("{name}", agent.shortName)}
                </p>
              </div>
            )}

            {/* Running state with step progress */}
            {status === "running" && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Loader2 size={14} className="animate-spin text-brand-400" />
                  {dict.agentPreview.runningWorkflow}
                </div>
                <div className="space-y-1.5">
                  {agent.workflow.map((step, i) => {
                    const stepStatus = stepStatuses[i];
                    return (
                      <div
                        key={step}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                          stepStatus === "running"
                            ? "bg-brand-500/10 text-brand-300"
                            : stepStatus === "done"
                              ? "bg-neutral-800 text-neutral-300"
                              : "text-neutral-600"
                        }`}
                      >
                        {stepStatus === "done" ? (
                          <CheckCircle2 size={14} className="text-purple-400" />
                        ) : stepStatus === "running" ? (
                          <div className="flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin" />
                            <Sparkles size={12} className="animate-pulse" />
                          </div>
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-neutral-700" />
                        )}
                        {step}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Done state — diversificato per agente */}
            {status === "done" && showResult && (
              <div ref={resultRef} className="rounded-2xl rounded-bl-md border border-white/5 bg-neutral-800 px-4 py-3.5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-purple-400">
                  <Sparkles size={13} />
                  {dict.agentPreview.workflowCompleted} — {agent.shortName}
                </div>
                <div className="space-y-1.5">
                  {agent.workflow.map((step) => (
                    <div
                      key={step}
                      className="flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-300"
                    >
                      <CheckCircle2 size={12} className="text-purple-400 shrink-0" />
                      {step}
                    </div>
                  ))}
                </div>
                {/* Risultato testuale */}
                <div className="mt-3 rounded-lg border border-white/5 bg-neutral-950 p-3">
                  <p className="whitespace-pre-wrap text-xs font-semibold leading-relaxed text-neutral-300">
                    {agent.previewResult}
                  </p>
                </div>
                {/* Dettaglio visivo diversificato per agente */}
                <div className="mt-3">
                  {agent.slug === "shopify-agent" && (
                    <div className="grid gap-2">
                      <div className="rounded-lg border border-white/5 bg-neutral-900 p-3">
                        <p className="text-xs font-bold text-white">Collezione Estate 2024 — 3 prodotti</p>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded bg-neutral-950 p-2 text-center">
                            <div className="mx-auto h-8 w-8 rounded bg-green-500/20 mb-1" />
                            <p className="font-bold text-white">Maglia Lino</p>
                            <p className="text-neutral-400">€49,90</p>
                            <p className="text-[10px] text-brand-400">Cart: /cart/445...:1</p>
                          </div>
                          <div className="rounded bg-neutral-950 p-2 text-center">
                            <div className="mx-auto h-8 w-8 rounded bg-green-500/20 mb-1" />
                            <p className="font-bold text-white">Shorts Chino</p>
                            <p className="text-neutral-400">€39,90</p>
                            <p className="text-[10px] text-brand-400">Cart: /cart/446...:1</p>
                          </div>
                          <div className="rounded bg-neutral-950 p-2 text-center">
                            <div className="mx-auto h-8 w-8 rounded bg-green-500/20 mb-1" />
                            <p className="font-bold text-white">Cappello</p>
                            <p className="text-neutral-400">€24,90</p>
                            <p className="text-[10px] text-brand-400">Cart: /cart/447...:1</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-bold text-emerald-400">Sconto ESTATE20 — 20% attivo • 100 usi</p>
                      </div>
                    </div>
                  )}
                  {agent.slug === "email-manager" && (
                    <div className="rounded-lg border border-white/5 bg-neutral-900 p-3">
                      <p className="text-xs font-bold text-white">Inbox triage</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between rounded bg-neutral-950 px-2 py-1.5">
                          <span className="text-neutral-300">Urgenti</span>
                          <span className="font-bold text-red-400">3</span>
                        </div>
                        <div className="flex justify-between rounded bg-neutral-950 px-2 py-1.5">
                          <span className="text-neutral-300">Newsletter</span>
                          <span className="font-bold text-neutral-400">18</span>
                        </div>
                        <div className="flex justify-between rounded bg-neutral-950 px-2 py-1.5">
                          <span className="text-neutral-300">Archiviate</span>
                          <span className="font-bold text-emerald-400">21</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {agent.slug === "support-agent" && (
                    <div className="rounded-lg border border-white/5 bg-neutral-900 p-3">
                      <p className="text-xs font-bold text-white">Ticket gestiti</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="rounded bg-emerald-500/10 px-2 py-1.5 text-emerald-300">#1042 Risolto — reset password inviato</div>
                        <div className="rounded bg-amber-500/10 px-2 py-1.5 text-amber-300">#1043 Escalation — fattura doppia → billing</div>
                        <div className="rounded bg-emerald-500/10 px-2 py-1.5 text-emerald-300">#1044 Risolto — tracking TRK123</div>
                      </div>
                    </div>
                  )}
                  {agent.slug === "lead-capture" && (
                    <div className="rounded-lg border border-white/5 bg-neutral-900 p-3">
                      <p className="text-xs font-bold text-white">Lead catturato</p>
                      <div className="mt-2 space-y-1 text-xs text-neutral-300">
                        <p><span className="font-bold text-white">Mario Rossi</span> — mario@acme.it — Acme SRL</p>
                        <p>Score: <span className="font-bold text-emerald-400">Alto</span> • Fonte: form sito</p>
                        <p className="rounded bg-brand-500/10 px-2 py-1.5 text-brand-300">Slack #sales notificato ✓ — follow-up domani 10:00</p>
                      </div>
                    </div>
                  )}
                  {agent.slug === "copywriter" && (
                    <div className="rounded-lg border border-white/5 bg-neutral-900 p-3">
                      <p className="text-xs font-bold text-white">Copy varianti</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="rounded bg-neutral-950 px-2 py-1.5">
                          <p className="font-bold text-white">A — Benefit</p>
                          <p className="text-neutral-400">Raddoppia vendite senza assumere — agenti AI 24/7</p>
                        </div>
                        <div className="rounded bg-neutral-950 px-2 py-1.5">
                          <p className="font-bold text-white">B — Proof</p>
                          <p className="text-neutral-400">Già 2.3k team usano AgentCloud</p>
                        </div>
                        <div className="rounded bg-neutral-950 px-2 py-1.5">
                          <p className="font-bold text-white">C — Urgency</p>
                          <p className="text-neutral-400">Lancia oggi, vendi domani</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {agent.slug === "calendar-booking" && (
                    <div className="rounded-lg border border-white/5 bg-neutral-900 p-3">
                      <p className="text-xs font-bold text-white">Booking confermato</p>
                      <p className="mt-1 text-xs text-neutral-300">Mar 15:30-16:00 — Marco & Anna — Zoom https://zoom.us/j/123</p>
                      <p className="text-xs text-emerald-400">Inviti inviati • promemoria 15 min • Slack #sales</p>
                    </div>
                  )}
                  {agent.slug.startsWith("seo") && (
                    <div className="rounded-lg border border-white/5 bg-neutral-900 p-3">
                      <p className="text-xs font-bold text-white">SEO Draft</p>
                      <p className="mt-1 text-xs text-neutral-400">H1 + 5 keywords • Meta 152 char • 3 link interni • 1.520 parole</p>
                    </div>
                  )}
                  {["finance-manager", "business-manager", "personal-assistant"].includes(agent.slug) && (
                    <div className="rounded-lg border border-white/5 bg-neutral-900 p-3">
                      <p className="text-xs font-bold text-white">Report pronto</p>
                      <p className="mt-1 text-xs text-neutral-400">File salvato • KPI aggiornati • 3 azioni consigliate</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer button */}
      <div className="border-t border-white/5 px-5 py-4">
        <button
          type="button"
          onClick={status === "done" ? reset : () => { setStatus("running"); setShowResult(false); }}
          disabled={status === "running"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 hover:shadow-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "running" ? (
            <><Loader2 size={15} className="animate-spin" /> {dict.agentPreview.running}</>
          ) : status === "done" ? (
            <><Send size={15} /> {dict.agentPreview.runAgain}</>
          ) : (
            <><Play size={15} /> {dict.agentPreview.runPreview}</>
          )}
        </button>
      </div>
    </div>
  );
}
