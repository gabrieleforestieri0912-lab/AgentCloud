"use client";

/**
 * Gestore delle pianificazioni (Fase 3) — dashboard/schedules.
 *
 * Dato che arriva dal server: schedule (con anteprima) + agente posseduti.
 * Le mutazioni parlano con /api/agents/schedules* e ricaricano via router
 * refresh: un solo percorso di verità, niente stato locale che diverge.
 * L'anteprima delle prossime esecuzioni nel FORM è live (debounce 400ms)
 * sull'endpoint /preview; l'anteprima di ogni card arriva dal server.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Pause,
  Play,
  Pencil,
  Plus,
  Trash2,
  Rocket,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import type { AgentScheduleRow } from "@/types/agents-db";

export type ScheduleCard = AgentScheduleRow & { upcoming: string[] };

export type AgentOption = {
  slug: string;
  name: string;
};

type Preset = "hourly" | "daily" | "weekdays" | "weekly" | "custom";

type Draft = {
  id: string | null;
  name: string;
  agentSlug: string;
  instructions: string;
  preset: Preset;
  time: string; // HH:MM
  weekday: number; // 0-6
  cron: string;
  timezone: string;
};

const TIMEZONES = [
  "Europe/Rome",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "UTC",
];

const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function emptyDraft(agents: AgentOption[]): Draft {
  return {
    id: null,
    name: "",
    agentSlug: agents[0]?.slug ?? "",
    instructions: "",
    preset: "daily",
    time: "08:00",
    weekday: 1,
    cron: "0 8 * * *",
    timezone: "Europe/Rome",
  };
}

function cronFromDraft(d: Draft): string {
  if (d.preset === "custom") return d.cron.trim();
  const [hh, mm] = (d.time || "08:00").split(":");
  const hour = String(Math.min(23, Math.max(0, Number(hh) || 0)));
  const minute = String(Math.min(59, Math.max(0, Number(mm) || 0)));
  if (d.preset === "hourly") return `${minute} * * * *`;
  if (d.preset === "daily") return `${minute} ${hour} * * *`;
  if (d.preset === "weekdays") return `${minute} ${hour} * * 1-5`;
  return `${minute} ${hour} * * ${d.weekday}`;
}

function formatIso(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SchedulesManager({
  schedules: initial,
  agents,
}: {
  schedules: ScheduleCard[];
  agents: AgentOption[];
}) {
  const { locale, dict } = useLanguage();
  const t = dict.agentSchedules;
  const router = useRouter();

  // I dati arrivano dal server component: router.refresh() ri-rendirizza e
  // le nuove props sostituiscono le vecchie (niente copia di stato locale).
  const schedules = initial;
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(agents));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string>("");
  const [preview, setPreview] = useState<string[]>([]);

  const errorMessage = useCallback((code: string): string => {
    if (code === "cron_too_frequent" || code === "timezone_invalid") return t.errorTooFrequent;
    if (code === "agent_not_owned") return t.errorAgentNotOwned;
    if (code === "instructions_required") return t.errorInstructionsRequired;
    return t.errorGeneric;
  }, [t]);

  // Anteprima live del form (400ms di debounce, none while saving).
  const draftCron = useMemo(() => cronFromDraft(draft), [draft]);
  useEffect(() => {
    if (!formOpen || !draftCron) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(
        `/api/agents/schedules/preview?cron=${encodeURIComponent(draftCron)}&timezone=${encodeURIComponent(draft.timezone)}`,
      )
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: { upcoming?: string[] }) => {
          if (!cancelled) setPreview(data.upcoming ?? []);
        })
        .catch(() => { if (!cancelled) setPreview([]); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [draftCron, draft.timezone, formOpen]);

  const closeForm = () => { setFormOpen(false); setEditingId(null); setPreview([]); };

  const openForEdit = (card: ScheduleCard) => {
    // Ricava il preset dalla cron; se non combacia, resta "custom".
    let preset: Preset = "custom";
    if (/^\d{1,2} \* \* \* \*$/.test(card.cron)) preset = "hourly";
    else if (/^\d{1,2} \d{1,2} \* \* \*$/.test(card.cron)) preset = "daily";
    else if (/^\d{1,2} \d{1,2} \* \* 1-5$/.test(card.cron)) preset = "weekdays";
    else if (/^\d{1,2} \d{1,2} \* \* \d{1}$/.test(card.cron)) preset = "weekly";
    const minute = card.cron.split(" ")[0];
    const hour = card.cron.split(" ")[1];
    setDraft({
      id: card.id,
      name: card.name,
      agentSlug: card.agent_slug,
      instructions: card.instructions,
      preset,
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      weekday: preset === "weekly" ? Number(card.cron.split(" ")[4]) || 1 : 1,
      cron: card.cron,
      timezone: card.timezone,
    });
    setEditingId(card.id);
    setFormOpen(true);
  };

  const refresh = () => router.refresh();

  const notice = feedback || toastMessage;

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        name: draft.name,
        agentSlug: draft.agentSlug,
        instructions: draft.instructions,
        cron: cronFromDraft(draft),
        timezone: draft.timezone,
      };
      const response = await fetch(
        editingId ? `/api/agents/schedules/${editingId}` : "/api/agents/schedules",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setFeedback(errorMessage(String(data.error ?? "")));
        return;
      }
      setToastMessage(editingId ? t.toastUpdated : t.toastCreated);
      closeForm();
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (card: ScheduleCard) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/agents/schedules/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: card.status === "active" ? "paused" : "active" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setFeedback(errorMessage(String(data.error ?? ""))); return; }
      setToastMessage(t.toastUpdated);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (card: ScheduleCard) => {
    if (!window.confirm(t.confirmDelete)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/agents/schedules/${card.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setFeedback(errorMessage(String(data.error ?? ""))); return; }
      setToastMessage(t.toastDeleted);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const runNow = async (card: ScheduleCard) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/agents/schedules/${card.id}/run-now`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setFeedback(errorMessage(String(data.error ?? ""))); return; }
      setToastMessage(t.toastRunStarted);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
      <header className="pt-10 pb-8 sm:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15">
              <CalendarClock size={20} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{t.title}</h1>
              <p className="mt-1 max-w-xl text-sm text-neutral-400">{t.subtitle}</p>
            </div>
          </div>
          {!formOpen && (
            <button
              type="button"
              disabled={agents.length === 0}
              onClick={() => { setDraft(emptyDraft(agents)); setEditingId(null); setFormOpen(true); }}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} /> {t.newSchedule}
            </button>
          )}
        </div>
      </header>

      {(notice) && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-neutral-200"
        >
          {notice}
        </div>
      )}

      {formOpen && (
        <section
          aria-label={editingId ? t.edit : t.newSchedule}
          className="mb-8 rounded-2xl border border-white/[0.08] bg-neutral-900/60 p-5 sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.name}</span>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={t.namePlaceholder}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-brand-400/60 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.agent}</span>
              <select
                value={draft.agentSlug}
                onChange={(e) => setDraft({ ...draft, agentSlug: e.target.value })}
                disabled={Boolean(editingId)}
                className="w-full appearance-none rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-brand-400/60 focus:outline-none disabled:opacity-60"
              >
                {agents.map((a) => (
                  <option key={a.slug} value={a.slug}>{a.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.instructions}</span>
            <textarea
              rows={3}
              value={draft.instructions}
              onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
              placeholder={t.instructionsPlaceholder}
              className="w-full resize-y rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-brand-400/60 focus:outline-none"
            />
          </label>

          <fieldset className="mt-5">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.frequency}</legend>
            <div className="flex flex-wrap gap-2">
              {([["hourly", t.presetHourly], ["daily", t.presetDaily], ["weekdays", t.presetWeekdays], ["weekly", t.presetWeekly], ["custom", t.presetCustom]] as const).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={draft.preset === value}
                    onClick={() => setDraft({ ...draft, preset: value })}
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-all ${
                      draft.preset === value
                        ? "border-brand-400/60 bg-brand-500/15 text-brand-300"
                        : "border-white/[0.1] bg-white/[0.03] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </fieldset>

          {draft.preset !== "custom" && draft.preset !== "hourly" && (
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.time}</span>
                <input
                  type="time"
                  value={draft.time}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-brand-400/60 focus:outline-none"
                />
              </label>
              {draft.preset === "weekly" && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.presetWeekly}</span>
                  <select
                    value={draft.weekday}
                    onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}
                    className="appearance-none rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-brand-400/60 focus:outline-none"
                  >
                    {WEEKDAYS.map((day, index) => (
                      <option key={day} value={index}>{day}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {draft.preset === "custom" && (
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.presetCustom}</span>
              <input
                type="text"
                value={draft.cron}
                onChange={(e) => setDraft({ ...draft, cron: e.target.value })}
                placeholder="15 8 * * 1"
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 font-mono text-sm text-white focus:border-brand-400/60 focus:outline-none"
              />
            </label>
          )}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.timezone}</span>
            <select
              value={draft.timezone}
              onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
              className="appearance-none rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-brand-400/60 focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </label>

          <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <Clock size={13} /> {t.previewTitle}
            </p>
            {preview.length > 0 ? (
              <ol className="mt-2 space-y-1 text-sm text-neutral-300">
                {preview.map((iso, index) => (
                  <li key={iso} className={index === 0 ? "font-semibold text-brand-300" : ""}>
                    {formatIso(iso, locale)}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">{t.noPreview}</p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-white/[0.1] px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-white/[0.05]"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              disabled={busy || !draft.name.trim() || !draft.instructions.trim() || !draft.agentSlug}
              onClick={save}
              className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? t.saving : editingId ? t.save : t.create}
            </button>
          </div>
        </section>
      )}

      {schedules.length === 0 && !formOpen ? (
        <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-14 text-center">
          <CalendarClock size={28} className="mx-auto text-neutral-600" aria-hidden />
          <p className="mt-4 text-sm font-semibold text-neutral-300">{t.empty}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">{t.emptyHint}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {schedules.map((card) => (
            <li
              key={card.id}
              className="rounded-2xl border border-white/[0.08] bg-neutral-900/50 p-5 transition-all hover:border-white/[0.14]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-white">{card.name}</h2>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        card.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      ● {card.status === "active" ? t.statusActive : t.statusPaused}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-400">
                    <span className="font-semibold text-neutral-300">{card.agent_slug}</span>
                    <span aria-hidden> · </span>
                    <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-neutral-300">{card.cron}</code>
                    <span aria-hidden> · </span>
                    {card.timezone}
                  </p>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-neutral-400 sm:grid-cols-2">
                    <div className="flex gap-1.5">
                      <dt className="text-neutral-500">{t.nextRun}:</dt>
                      <dd className="text-neutral-300">{formatIso(card.next_run_at, locale)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-neutral-500">{t.lastRun}:</dt>
                      <dd className="text-neutral-300">{formatIso(card.last_run_at, locale)}</dd>
                    </div>
                  </dl>
                  {card.upcoming.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-300">
                        {t.upcoming} ({card.upcoming.length})
                      </summary>
                      <ol className="mt-1.5 space-y-0.5 text-xs text-neutral-400">
                        {card.upcoming.map((iso) => (
                          <li key={iso}>{formatIso(iso, locale)}</li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runNow(card)}
                    title={t.runNow}
                    aria-label={t.runNow}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 disabled:opacity-40"
                  >
                    <Rocket size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleStatus(card)}
                    title={card.status === "active" ? t.pause : t.resume}
                    aria-label={card.status === "active" ? t.pause : t.resume}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] text-neutral-400 hover:text-white disabled:opacity-40"
                  >
                    {card.status === "active" ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openForEdit(card)}
                    title={t.edit}
                    aria-label={t.edit}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] text-neutral-400 hover:text-white disabled:opacity-40"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(card)}
                    title={t.delete}
                    aria-label={t.delete}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
