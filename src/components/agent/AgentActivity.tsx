"use client";

/**
 * Componenti dell'interfaccia agentica per la chat.
 *
 * Principio: ogni componente mostra SOLO informazioni operative (task,
 * strumenti, integrazioni, approvazioni, errori azionabili) — mai il
 * ragionamento interno del modello. Le card vivono inline nel flusso della
 * conversazione, con bordi sottili, angoli arrotondati e animazioni discrete.
 */
import { useState } from "react";
import {
  Check,
  ChevronDown,
  Circle,
  CircleAlert,
  CircleX,
  Clock3,
  Loader2,
  Lock,
  Pause,
  Plug,
  ShieldAlert,
  Wrench,
  X,
} from "lucide-react";
import BrandLogo from "../BrandLogo";
import InlineConnectCard from "../InlineConnectCard";
import { useLanguage } from "../LanguageProvider";
import {
  stepDurationSecs,
  type AgentStatus,
  type AgentStep,
} from "@/lib/agent-activity";

/* ─── Status system ───────────────────────────────────────────────
   Stati: pending, running, completed, attention, failed, paused, approval.
   Gli stessi stati sono usati in tutta l'interfaccia. */

export function StatusDot({ status, size = 14 }: { status: AgentStatus; size?: number }) {
  switch (status) {
    case "completed":
      return <Check size={size} className="shrink-0 text-emerald-400" aria-hidden />;
    case "running":
      return (
        <span className="relative flex shrink-0" style={{ width: size, height: size }} aria-hidden>
          <Loader2 size={size} className="animate-spin text-brand-400" />
        </span>
      );
    case "failed":
      return <CircleX size={size} className="shrink-0 text-red-400" aria-hidden />;
    case "attention":
      return <CircleAlert size={size} className="shrink-0 text-amber-300" aria-hidden />;
    case "approval":
      return <Lock size={size} className="shrink-0 text-amber-300" aria-hidden />;
    case "paused":
      return <Pause size={size} className="shrink-0 text-neutral-500" aria-hidden />;
    default:
      return <Circle size={size} className="shrink-0 text-neutral-600" aria-hidden />;
  }
}

/** Stato aggregato dei passi: il peggiore vince (failed > running > approval...). */
export function aggregateStatus(steps: AgentStep[]): AgentStatus {
  if (steps.some((s) => s.status === "failed")) return "failed";
  if (steps.some((s) => s.status === "running")) return "running";
  if (steps.some((s) => s.status === "approval")) return "approval";
  if (steps.some((s) => s.status === "attention")) return "attention";
  if (steps.length > 0 && steps.every((s) => s.status === "completed")) return "completed";
  return "pending";
}

/* ─── Indicatore live discreto ──────────────────────────────────── */

export function WorkingIndicator({ label }: { label?: string }) {
  const { dict } = useLanguage();
  return (
    <p
      role="status"
      aria-live="polite"
      className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-300"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" aria-hidden />
      {label || dict.chat.activity.working}
    </p>
  );
}

/* ─── Riga di un singolo passo operativo ────────────────────────── */

function ToolStepRow({ step }: { step: AgentStep }) {
  const { dict } = useLanguage();
  const [open, setOpen] = useState(false);
  const duration = stepDurationSecs(step);
  const hasDetail = Boolean(step.detail) || step.impact === "high" || duration;
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5">
        <StatusDot status={step.status} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {step.brand ? (
            <BrandLogo slug={step.brand} size={14} />
          ) : (
            <Wrench size={13} className="shrink-0 text-neutral-500" aria-hidden />
          )}
          <button
            type="button"
            onClick={() => hasDetail && setOpen((v) => !v)}
            aria-expanded={hasDetail ? open : undefined}
            className={`min-w-0 flex-1 truncate text-left text-[13px] font-semibold ${
              step.status === "failed" ? "text-red-300" : "text-neutral-200"
            } ${hasDetail ? "cursor-pointer hover:text-white" : "cursor-default"}`}
          >
            {step.label}
          </button>
          {step.impact === "high" && (
            <span
              title={dict.chat.activity.modifiesData}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300"
            >
              <ShieldAlert size={10} aria-hidden />
              {dict.chat.activity.highImpact}
            </span>
          )}
          {duration && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-neutral-500">
              <Clock3 size={10} aria-hidden />
              {duration}
            </span>
          )}
        </div>
        {open && hasDetail && (
          <div className="mt-1 space-y-1 pl-6 text-xs text-neutral-400">
            {step.detail && <p className="break-words">“{step.detail}”</p>}
            {step.impact === "high" && <p>{dict.chat.activity.modifiesData}</p>}
          </div>
        )}
      </div>
    </li>
  );
}

/* ─── Card di approvazione connessione ────────────────────────────
   Quando appare: l'agente chiede di collegare un'integrazione (evento
   `connection` o tool `request_integration_connect`).
   Contiene: azione, motivo, integrazione, conseguenze, Autorizza, Annulla. */

export function ApprovalCard({ step }: { step: AgentStep }) {
  const { dict } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const provider = step.provider ?? "";
  if (dismissed) {
    return (
      <p className="my-2 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
        <X size={12} aria-hidden />
        {dict.chat.activity.approvalDismissed}
      </p>
    );
  }
  return (
    <div
      role="group"
      aria-label={dict.chat.activity.approvalTitle}
      className="my-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-4"
    >
      <p className="flex items-center gap-1.5 text-sm font-bold text-amber-200">
        <Lock size={14} className="shrink-0" aria-hidden />
        {dict.chat.activity.approvalTitle}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-neutral-300">
        {dict.chat.activity.approvalDesc.replace("{provider}", step.label)}
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
        <Plug size={12} className="shrink-0 text-neutral-500" aria-hidden />
        <span>{dict.chat.activity.approvalConsequence}</span>
      </div>
      <InlineConnectCard provider={provider} />
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="mt-1 min-h-[44px] rounded-full px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
      >
        {dict.chat.activity.cancel}
      </button>
    </div>
  );
}

/* ─── Feed attività comprimibile ───────────────────────────────────
   Appare sotto la bolla quando l'agente ha usato ≥1 strumento.
   Header: "Attività · N passi" + stato aggregato. Corpo: passi operativi
   (mai ragionamento interno). Le approvazioni restano visibili anche da
   chiuso? No: da chiuso si vede solo lo stato; l'approvazione richiede
   attenzione → il feed si apre da solo se c'è una approval in sospeso. */

export function ActivityFeed({ steps }: { steps: AgentStep[] }) {
  const { dict } = useLanguage();
  const needsAttention = steps.some((s) => s.status === "approval" || s.status === "failed");
  const [open, setOpen] = useState(needsAttention);
  if (steps.length === 0) return null;
  const status = aggregateStatus(steps);
  const toolSteps = steps.filter((s) => s.status !== "approval");
  const approvalSteps = steps.filter((s) => s.status === "approval");
  return (
    <div className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left"
      >
        <StatusDot status={status} />
        <span className="text-xs font-bold text-neutral-300">
          {dict.chat.activity.title.replace("{count}", String(steps.length))}
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          className={`ml-auto shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="border-t border-white/[0.06] px-3 py-1">
          {toolSteps.map((s) => (
            <ToolStepRow key={s.id} step={s} />
          ))}
        </ul>
      )}
      {approvalSteps.map((s) => (
        <div key={s.id} className="px-3 pb-1">
          <ApprovalCard step={s} />
        </div>
      ))}
    </div>
  );
}

/* ─── Errore azionabile ───────────────────────────────────────────
   Appare al posto della risposta quando la generazione fallisce.
   Contiene: cosa è successo, perché (se noto), cosa fare ora. */

export function AgentErrorCard({ message, supportEmail }: { message: string; supportEmail: string }) {
  const { dict } = useLanguage();
  return (
    <div
      role="alert"
      className="my-1 rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4"
    >
      <p className="flex items-center gap-1.5 text-sm font-bold text-red-300">
        <CircleX size={15} className="shrink-0" aria-hidden />
        {dict.chat.activity.errorTitle}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-neutral-300">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`mailto:${supportEmail}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 transition-colors"
        >
          {dict.chat.activity.contactSupport}
        </a>
      </div>
    </div>
  );
}
