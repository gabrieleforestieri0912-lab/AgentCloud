import type { AgentRunStatus } from "@/types/agents-db";

/**
 * Badge di stato di un run (Fase 5): un solo posto per colore e classe così
 * Mission Control e Replay non divergono sul significato visivo.
 */

const STYLES: Record<AgentRunStatus, string> = {
  queued: "bg-neutral-500/15 text-neutral-300",
  running: "bg-brand-500/15 text-brand-300",
  waiting_approval: "bg-amber-500/15 text-amber-300",
  succeeded: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
  cancelled: "bg-neutral-500/15 text-neutral-400",
  completed: "bg-emerald-500/10 text-emerald-300/80",
};

export function runStatusLabel(
  t: Record<string, string>,
  status: AgentRunStatus,
): string {
  switch (status) {
    case "queued":
      return t.statusQueued ?? status;
    case "running":
      return t.statusRunning ?? status;
    case "waiting_approval":
      return t.statusWaiting ?? status;
    case "succeeded":
      return t.statusSucceeded ?? status;
    case "failed":
      return t.statusFailed ?? status;
    case "cancelled":
      return t.statusCancelled ?? status;
    case "completed":
      return t.statusCompleted ?? status;
    default:
      return String(status);
  }
}

const LIVE: ReadonlySet<AgentRunStatus> = new Set(["queued", "running"]);

export default function RunsStatusBadge({
  status,
  label,
}: {
  status: AgentRunStatus;
  label: string;
}) {
  const live = LIVE.has(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STYLES[status] ?? STYLES.queued}`}
      role="status"
      aria-label={label}
    >
      {// Punto lampeggiante SOLO per gli stati vivi: trasform/opacity, nulla che
      // ripaghi layout — e off a prefers-reduced-motion (CSS globale).
      live ? <span className="relative flex h-1.5 w-1.5" aria-hidden><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" /></span> : null}
      {label}
    </span>
  );
}
