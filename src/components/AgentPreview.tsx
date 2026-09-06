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

            {/* Done state */}
            {status === "done" && showResult && (
              <div ref={resultRef} className="rounded-2xl rounded-bl-md border border-white/5 bg-neutral-800 px-4 py-3.5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-purple-400">
                  <Sparkles size={13} />
                  {dict.agentPreview.workflowCompleted}
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
                <div className="mt-3 rounded-lg border border-white/5 bg-neutral-950 p-3">
                  <p className="text-xs font-semibold leading-relaxed text-neutral-300">
                    {agent.previewResult}
                  </p>
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
