"use client";

/**
 * Cliente del setup guidato: 8 schermate, una domanda a testa.
 *
 * Punti architetturali:
 * - PERSISTENZA: dopo ogni schermata POST /api/user/setup con l'intero stato
 *   (patch cumulativa) + numero passo. 3 retry silenziosi: l'utente non perde
 *   mai risposte date, semmai una schermata segnala il problema senza bloccare.
 * - L'agente predefinito rispetta il canale esistente della chat:
 *   `saveDefaultAgent` scrive localStorage + user_preferences. In più la POST
 *   finale lo archivia in profiles.onboarding (export GDPR / storico).
 * - Scoring agenti: modulo puro `recommendAgents`, eseguito lato client con i
 *   dati passati dalla pagine server (nessuna chiamata di rete in più).
 * - Tastiera: frecce per muoversi tra le opzioni, Invio per avanti,
 *   cifre 1–9 per selezionare l'opzione n-esima della schermata corrente.
 * - Movimento: preset di `prefers-reduced-motion` rispettato (fade senza slide).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, AlertCircle, Check, PartyPopper } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import AgentDefaultPicker, { type PickerAgent } from "@/components/AgentDefaultPicker";
import { saveDefaultAgent } from "@/lib/chat-settings";
import {
  GOALS,
  GOALS_MAX,
  LANGUAGES,
  OCCUPATIONS,
  ROLES,
  STUDY_LEVELS,
  TOOLS,
  TONES,
  type OnboardingAnswers,
  type OnboardingPatch,
} from "@/lib/onboarding/constants";
import { recommendAgents } from "@/lib/onboarding/recommendation";
import type { Locale } from "@/lib/i18n/constants";
import type { OnboardingCopy } from "@/lib/i18n/onboarding";

type AgentCandidate = PickerAgent & {
  priceCents: number;
  integrations: string[];
};

type Props = {
  locale: Locale;
  copy: OnboardingCopy;
  agents: AgentCandidate[];
  eligibleSlugs: string[];
  ownedSlugs: string[];
  initialName: string;
  googleHint: boolean;
  initialAnswers: OnboardingAnswers;
  initialStep: number;
  returnTo: string;
};

const TOTAL = 8;

/** Ticket di default (ultile se il browser non espone navigator.language). */
function detectPreferredLanguage(locale: Locale): Locale {
  try {
    const nav = navigator.language.slice(0, 2);
    const match = LANGUAGES.find((l) => l === nav);
    return (match ?? locale) as Locale;
  } catch {
    return locale;
  }
}

const LOCALE_LABELS: Record<string, string> = {
  it: "Italiano",
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
};

/**
 * Primo prompt per la chat: mappa deterministica, come lo scoring —
 * obiettivo principale → frase concreta (studente → frase dedicata).
 */
function starterPrompt(copy: OnboardingCopy, answers: OnboardingAnswers): string {
  if (answers.occupation === "student" || answers.occupation === "exploring") {
    return copy.screen8.starterStudent;
  }
  const firstGoal = answers.goals?.[0];
  if (firstGoal && firstGoal in copy.screen8.starterPrompts) {
    return copy.screen8.starterPrompts[firstGoal as keyof typeof copy.screen8.starterPrompts];
  }
  return copy.screen8.starterStudent;
}

export default function OnboardingClient({
  locale,
  copy,
  agents,
  eligibleSlugs,
  ownedSlugs,
  initialName,
  googleHint,
  initialAnswers,
  initialStep,
  returnTo,
}: Props) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [step, setStep] = useState(() => Math.min(Math.max(initialStep, 0), TOTAL - 1));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers);
  // Slug scelto per il default; null = schermata 7 non ancora toccata.
  const [defaultAgent, setDefaultAgent] = useState<string | null>(
    typeof initialAnswers.defaultAgentSlug === "string" ? initialAnswers.defaultAgentSlug : null,
  );
  const [language, setLanguage] = useState<string>(
    initialAnswers.language ?? detectPreferredLanguage(locale),
  );
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<"chat" | "dashboard" | null>(null);

  // Patch sempre COMPLETA: le risposte accumulato si riflettono tutte a ogni
  // POST — un retry automatico non dipende da stati intermediali persi.
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const persist = useCallback(async (stepIndex: number, extra: OnboardingPatch = {}, action?: "complete" | "skip") => {
    setSaveNotice(null);
    const body = JSON.stringify({
      step: stepIndex,
      patch: { ...answersRef.current, ...extra },
      ...(action ? { action } : {}),
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("/api/user/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
        if (res.ok) return true;
        const data = (await res.json().catch(() => null)) as { warning?: string } | null;
        // Slug non valido restituito dal server: si accetta, senza default.
        if (data?.warning === "defaultAgentSlug_invalid") {
          setDefaultAgent("");
          if (typeof answersRef.current.defaultAgentSlug !== "undefined") {
            answersRef.current.defaultAgentSlug = "";
          }
          return true;
        }
      } catch {
        // Network: si riprova, l'utente non vede niente.
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
    setSaveNotice(copy.nav.saveError);
    return false;
  }, [copy]);

  /** Avanza a passo successivo, con persistenza e senza doppioni. */
  const goNext = useCallback(async () => {
    if (step >= TOTAL - 1 || leaving) return;
    setDirection(1);
    const next = step + 1;
    setStep(next);
    if (answers.defaultAgentSlug !== undefined) {
      setAnswers((prev) => ({ ...prev }));
    }
    void persist(next);
  }, [step, leaving, persist, answers.defaultAgentSlug]);

  function goBack() {
    if (step === 0 || leaving) return;
    setDirection(-1);
    const prev = step - 1;
    setStep(prev);
    void persist(prev);
  }

  async function handleSkip() {
    if (leaving) return;
    setLeaving("dashboard");
    // Skip = nessuna risposta, nessun default: server pulisce anche la KV.
    await persist(TOTAL - 1, {}, "skip");
    router.push("/dashboard");
  }

  function updateAnswers(patch: OnboardingAnswers) {
    setAnswers((prev) => ({ ...prev, ...patch }));
  }

  // ── Raccomandazioni (scoring puro, stale-proof) ────────────────────────────
  const recommendations = useMemo(
    () =>
      recommendAgents({
        agents,
        eligibleSlugs,
        ownedSlugs,
        goals: answers.goals ?? [],
        tools: answers.tools ?? [],
        role: answers.role ?? null,
        occupation: answers.occupation ?? null,
      }).map((r) => r.slug),
    [agents, eligibleSlugs, ownedSlugs, answers.goals, answers.tools, answers.role, answers.occupation],
  );

  // Ritorno richiesto? Se era /agents/<slug>, che agente diventa predefinito.
  const returnToAgent = useMemo(() => {
    const match = /^\/agents\/([a-z0-9-]+)/.exec(returnTo);
    const slug = match?.[1] ?? "";
    // Solo se l'agente esiste nel pool dato (online/posseduto).
    return slug && eligibleSlugs.includes(slug) ? slug : "";
  }, [returnTo, eligibleSlugs]);

  const pickerAgents: PickerAgent[] = useMemo(
    () => agents.map(({ slug, name, shortName, category }) => ({ slug, name, shortName, category })),
    [agents],
  );

  // ── Navigazione da tastiera (desktop) ─────────────────────────────────────
  const onScreenKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && (event.target as HTMLElement).tagName !== "TEXTAREA") {
        // In campo di testo il submit va bene (nome, rontarea, area studio):
        // un campo è già "l'uso naturale", Enter muove in poi.
        goNext();
        return;
      }
      if (event.key === "Escape") return;
      const digit = /^\d$/.exec(event.key);
      if (!digit) return;
      const index = Number(digit[0]) - 1;
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[data-onboard-screen="true"] button[data-option-index]'),
      ).filter((el) => el.offsetParent !== null);
      if (index >= buttons.length) return;
      buttons[index].click();
      event.preventDefault();
    },
    [goNext],
  );

  // ── Schermata finale: azioni ──────────────────────────────────────────────
  async function openFirstChat() {
    if (leaving) return;
    setLeaving("chat");
    const slug = returnToAgent || defaultAgent || "";
    saveDefaultAgent(slug); // localStorage + KV: la chat lo legge subito
    await persist(TOTAL - 1, { defaultAgentSlug: slug }, "complete");
    const qs = new URLSearchParams();
    if (slug) qs.set("agent", slug);
    qs.set("q", starterPrompt(copy, { ...answers, language } as OnboardingAnswers));
    // Se il ritorno era una pagina agente, si torna là: quell'agente è
    // preselezionato dal link stesso.
    const target = returnTo ? returnTo : `/chat?${qs.toString()}`;
    router.push(target);
  }

  async function goDashboard() {
    if (leaving) return;
    setLeaving("dashboard");
    const slug = defaultAgent ?? "";
    saveDefaultAgent(slug);
    await persist(TOTAL - 1, { defaultAgentSlug: slug }, "complete");
    router.push("/dashboard");
  }

  // ── Opzioni selezionabili (riusata da 5 schermate) ───────────────────────
  type Option = {
    id: string;
    label: string;
    hint?: string;
    emoji?: string;
  };

  function OptionGroup({
    options,
    values,
    onToggle,
    multi = false,
    variant = "card",
  }: {
    options: Option[];
    values: string[];
    onToggle: (id: string) => void;
    multi?: boolean;
    variant?: "card" | "chip" | "tool";
  }) {
    return (
      <div
        role={multi ? "group" : "radiogroup"}
        aria-orientation="vertical"
        className={
          variant === "chip"
            ? "flex flex-wrap gap-2"
            : "grid gap-3 sm:grid-cols-2"
        }
      >
        {options.map((option, index) => {
          const selected = values.includes(option.id);
          if (variant === "chip") {
            return (
              <motion.button
                key={option.id}
                type="button"
                data-option-index={index}
                role={multi ? undefined : "radio"}
                aria-pressed={multi ? selected : undefined}
                aria-checked={multi ? undefined : selected}
                tabIndex={multi ? (selected ? 0 : -1) : undefined}
                whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                onClick={() => onToggle(option.id)}
                className={`rounded-full border px-4 py-2.5 text-sm font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  selected
                    ? "border-brand-500/70 bg-brand-500/15 text-brand-200"
                    : "border-white/10 bg-neutral-900 text-neutral-200 hover:border-white/25 hover:bg-neutral-800"
                }`}
              >
                {option.label}
              </motion.button>
            );
          }
          return (
            <motion.button
              key={option.id}
              type="button"
              data-option-index={index}
              role={multi ? undefined : "radio"}
              aria-pressed={multi ? selected : undefined}
              aria-checked={multi ? undefined : selected}
              whileTap={reducedMotion ? undefined : { scale: 0.98 }}
              onClick={() => onToggle(option.id)}
              className={`group relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                variant === "tool" ? "items-center" : ""
              } ${
                selected
                  ? "border-brand-500/60 bg-brand-500/10 shadow-lg shadow-brand-500/10"
                  : "border-white/10 bg-neutral-900 hover:border-white/20 hover:bg-neutral-800/60"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                  variant === "tool" && !option.emoji
                    ? "" // il logo brand è già colorato dal suo SVG
                    : selected ? "bg-brand-500/15" : "bg-white/5"
                }`}
              >
                {option.emoji ? <span aria-hidden>{option.emoji}</span> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-bold ${variant === "tool" ? "text-sm" : "text-[15px]"} text-white`}>
                  {option.label}
                </span>
                {option.hint && (
                  <span className="mt-0.5 block text-xs leading-relaxed text-neutral-400">{option.hint}</span>
                )}
              </span>
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  selected ? "border-brand-400 bg-brand-500 text-white" : "border-white/20"
                }`}
              >
                {selected && <Check size={12} strokeWidth={3} />}
              </span>
            </motion.button>
          );
        })}
      </div>
    );
  }

  // ── Costruzione contenuto schermata corrente ─────────────────────────────
  const screens: Array<{
    id: string;
    content: React.ReactNode;
  }> = [
    // 0 · Nome
    {
      id: "name",
      content: (
        <div className="space-y-4">
          <Heading copy={copy} title={copy.screen1.title} subtitle={copy.screen1.subtitle} />
          {googleHint && (
            <p className="text-xs text-brand-300/80">{copy.screen1.fromGoogle}</p>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-neutral-300">{copy.screen1.label}</span>
            <input
              autoFocus
              value={answers.displayName ?? ""}
              onChange={(e) => updateAnswers({ displayName: e.target.value })}
              maxLength={80}
              placeholder={copy.screen1.placeholder}
              className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-lg text-white placeholder-neutral-500 outline-none focus:border-brand-500/50"
            />
          </label>
        </div>
      ),
    },
    // 1 · Occupazione
    {
      id: "occupation",
      content: (
        <div className="space-y-4">
          <Heading copy={copy} title={copy.screen2.title} />
          <OptionGroup
            options={OCCUPATIONS.map((id) => ({
              id,
              label: copy.screen2.options[id].label,
              hint: copy.screen2.options[id].hint,
            }))}
            values={answers.occupation ? [answers.occupation] : []}
            onToggle={(id) => {
              updateAnswers({ occupation: id as OnboardingAnswers["occupation"] });
              // "Altro" mette fuoco sul campo libero già nella schermata.
            }}
          />
          {answers.occupation === "other" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-neutral-300">{copy.screen2.otherField.label}</span>
              <input
                autoFocus
                value={answers.occupationOther ?? ""}
                onChange={(e) => updateAnswers({ occupationOther: e.target.value })}
                maxLength={200}
                placeholder={copy.screen2.otherField.placeholder}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-brand-500/50"
              />
            </label>
          )}
        </div>
      ),
    },
    // 2 · Ruolo dinamico
    {
      id: "role",
      content: answers.occupation === "student" ? (
        <div className="space-y-4">
          <Heading copy={copy} title={copy.screen3.student.title} />
          <OptionGroup
            variant="chip"
            options={STUDY_LEVELS.map((level) => ({
              id: level,
              label: copy.screen3.student.levels[level].label,
            }))}
            values={answers.studyLevel ? [answers.studyLevel] : []}
            onToggle={(id) => updateAnswers({ studyLevel: id as OnboardingAnswers["studyLevel"] })}
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-neutral-300">{copy.screen3.student.areaLabel}</span>
            <input
              value={answers.studyArea ?? ""}
              onChange={(e) => updateAnswers({ studyArea: e.target.value })}
              maxLength={200}
              placeholder={copy.screen3.student.areaPlaceholder}
              className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-brand-500/50"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <Heading copy={copy} title={copy.screen3.work.title} subtitle={copy.screen3.work.subtitle} />
          <OptionGroup
            variant="chip"
            options={[
              ...ROLES.map((id) => ({ id, label: copy.screen3.roleLabels[id] })),
              { id: "other", label: copy.screen3.other },
            ]}
            values={answers.role ? [answers.role] : answers.roleOther ? ["other"] : []}
            onToggle={(id) => {
              if (id === "other") {
                updateAnswers({ role: undefined as never, roleOther: answers.roleOther ?? "" });
              } else {
                updateAnswers({ role: id as OnboardingAnswers["role"], roleOther: undefined });
              }
            }}
          />
          {answers.role === undefined && answers.roleOther !== undefined && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-neutral-300">{copy.screen3.roleOther.label}</span>
              <input
                autoFocus
                value={answers.roleOther ?? ""}
                onChange={(e) => updateAnswers({ roleOther: e.target.value })}
                maxLength={200}
                placeholder={copy.screen3.roleOther.placeholder}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-brand-500/50"
              />
            </label>
          )}
        </div>
      ),
    },
    // 3 · Obiettivi (max 3)
    {
      id: "goals",
      content: (
        <div className="space-y-4">
          <Heading copy={copy} title={copy.screen4.title} subtitle={copy.screen4.subtitle} />
          {(answers.goals?.length ?? 0) >= GOALS_MAX && (
            <p className="text-xs text-neutral-400">{copy.screen4.maxReached}</p>
          )}
          <OptionGroup
            options={GOALS.map((id) => ({
              id,
              label: copy.screen4.cards[id].title,
              hint: copy.screen4.cards[id].row,
              emoji: copy.screen4.cards[id].emoji,
            }))}
            values={answers.goals ?? []}
            multi
            onToggle={(id) => {
              const current = answers.goals ?? [];
              const next = current.includes(id as (typeof current)[number])
                ? current.filter((g) => g !== id)
                : current.length >= GOALS_MAX
                  ? current
                  : [...current, id as (typeof current)[number]];
              updateAnswers({ goals: next as OnboardingAnswers["goals"] });
            }}
          />
        </div>
      ),
    },
    // 4 · Tool
    {
      id: "tools",
      content: (
        <div className="space-y-4">
          <Heading copy={copy} title={copy.screen5.title} subtitle={copy.screen5.subtitle} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TOOLS.map((tool, index) => {
              const selected = (answers.tools ?? []).includes(tool.id);
              return (
                <motion.button
                  key={tool.id}
                  type="button"
                  data-option-index={index}
                  aria-pressed={selected}
                  whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                  onClick={() => {
                    const current = answers.tools ?? [];
                    updateAnswers({
                      tools: current.includes(tool.id)
                        ? current.filter((t) => t !== tool.id)
                        : [...current, tool.id],
                    });
                  }}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    selected
                      ? "border-brand-500/60 bg-brand-500/10"
                      : "border-white/10 bg-neutral-900 hover:border-white/20 hover:bg-neutral-800/60"
                  }`}
                >
                  <BrandLogo slug={tool.brand} size={26} />
                  <span className="block text-center text-[11px] font-bold text-neutral-200">{tool.label}</span>
                </motion.button>
              );
            })}
          </div>
          <button
            type="button"
            aria-pressed={(answers.tools ?? []).length === 0}
            onClick={() => updateAnswers({ tools: [] })}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              (answers.tools ?? []).length === 0
                ? "border-brand-500/60 bg-brand-500/10 text-brand-200"
                : "border-white/10 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {copy.screen5.none}
          </button>
        </div>
      ),
    },
  // 5 · Tono + lingua
    {
      id: "tone",
      content: (
        <div className="space-y-5">
          <Heading copy={copy} title={copy.screen6.title} subtitle={copy.screen6.subtitle} />
          <OptionGroup
            variant="chip"
            options={TONES.map((tone) => ({ id: tone, label: copy.screen6.tones[tone].label, hint: copy.screen6.tones[tone].desc }))}
            values={answers.tone ? [answers.tone] : []}
            onToggle={(id) => updateAnswers({ tone: id as OnboardingAnswers["tone"] })}
          />
          <label className="block max-w-xs">
            <span className="mb-1.5 block text-sm font-semibold text-neutral-300">{copy.screen6.languageLabel}</span>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                updateAnswers({ language: e.target.value as OnboardingAnswers["language"] });
              }}
              className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-brand-500/50"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LOCALE_LABELS[lang]}
                  {lang === language && language !== "it" && answers.language === undefined
                    ? ` — ${copy.screen6.languageDefault(LOCALE_LABELS[lang])}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      ),
    },
    // 6 · Agente predefinito
    {
      id: "agent",
      content: (
        <div className="space-y-4">
          <Heading copy={copy} title={copy.screen7.title} subtitle={copy.screen7.explanation} />
          {recommendations.length > 0 && (
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-300">
              <Sparkles size={13} /> {copy.screen7.recommended}
            </p>
          )}
          <AgentDefaultPicker
            mode="onboarding"
            agents={pickerAgents}
            recommendedSlugs={recommendations}
            ownedSlugs={ownedSlugs}
            value={defaultAgent}
            onChange={(slug) => {
              setDefaultAgent(slug);
              updateAnswers({ defaultAgentSlug: slug });
            }}
          />
          <button
            type="button"
            aria-pressed={defaultAgent === ""}
            onClick={() => {
              setDefaultAgent("");
              updateAnswers({ defaultAgentSlug: "" });
            }}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              defaultAgent === ""
                ? "border-brand-500/60 bg-brand-500/10 text-brand-100"
                : "border-white/10 bg-neutral-900 text-neutral-300 hover:border-white/20"
            }`}
          >
            {copy.screen7.none}
          </button>
          {defaultAgent !== "" && (
            <p className="text-xs text-neutral-400">{copy.screen8.defaultAgentIntro}</p>
          )}
        </div>
      ),
    },
    // 7 · Finale
    {
      id: "done",
      content: (
        <div className="space-y-5">
          <motion.div
            initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
          >
            <Heading copy={copy} title={copy.screen8.title} subtitle={copy.screen8.summaryTitle} icon={<PartyPopper size={18} className="text-brand-400" />} />
          </motion.div>
          <FinalSummary copy={copy} answers={answers} defaultAgent={defaultAgent ?? ""} agents={agents} language={language} />
          {(answers.tools?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
              <p className="text-sm font-bold text-white">{copy.screen8.integrationsTitle}</p>
              <p className="mt-1 text-xs text-neutral-400">{copy.screen8.integrationsHint}</p>
              <a
                href="/dashboard/integrations"
                className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
              >
                {copy.screen8.connectCta} →
              </a>
            </div>
          )}
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
            <p className="text-xs leading-relaxed text-emerald-100/80">
              {copy.screen8.starterPrompt} <span className="text-emerald-200/60">«{starterPrompt(copy, { ...answers, language } as OnboardingAnswers)}»</span>
              <br />
              {copy.screen8.starterAutoSend} {copy.screen8.trialNote}
            </p>
          </div>
          {saveNotice && (
            <p className="inline-flex items-center gap-1 text-xs text-amber-300">
              <AlertCircle size={12} /> {saveNotice}
            </p>
          )}
          <button
            type="button"
            onClick={openFirstChat}
            disabled={Boolean(leaving)}
            className="w-full rounded-xl bg-brand-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400 disabled:opacity-60 sm:w-auto"
          >
            {returnTo ? returnTo : copy.screen8.primaryCta}
          </button>
          <button
            type="button"
            onClick={goDashboard}
            disabled={Boolean(leaving)}
            className="block w-full text-center text-sm font-semibold text-neutral-400 hover:text-neutral-200 disabled:opacity-60 sm:w-auto"
          >
            {copy.screen8.secondaryCta}
          </button>
        </div>
      ),
    },
  ];

  const current = screens[step] ?? screens[0];

  return (
    <div
      className="flex min-h-dvh flex-col bg-neutral-950 text-white"
      onKeyDown={onScreenKeyDown}
    >
      <a href="#onboard-screen" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white">
        Salta al contenuto
      </a>

      {/* Barra di progresso: si riempie con una molla, non a scatti */}
      <div className="fixed left-0 right-0 top-0 z-40">
        <div className="h-1.5 w-full bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-300"
            initial={false}
            animate={{ width: `${((step + 1) / TOTAL) * 100}%` }}
            transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-black tracking-tight">
            <span className="rounded-lg bg-brand-500 px-2 py-0.5 text-[11px] font-black text-white">AC</span>
            AgentCloud
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-neutral-500 sm:block" aria-hidden>
              {copy.nav.stepOf(step + 1, TOTAL)}
            </span>
            {step < TOTAL - 1 && (
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/5"
              >
                {copy.nav.skip}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Schermata corrente */}
      <main
        id="onboard-screen"
        data-onboard-screen="true"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 pb-44 pt-24"
        style={{ minHeight: "100dvh" }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * -48 }}
            transition={reducedMotion ? { duration: 0.18 } : { type: "spring", stiffness: 260, damping: 26 }}
          >
            {current.content}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer: Indietro / Avanti — sticky, rispetta la safe-area mobile */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-neutral-950/90 backdrop-blur">
        <div
          className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || Boolean(leaving)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-neutral-200 transition-colors hover:bg-white/5 disabled:opacity-40"
          >
            <ArrowLeft size={15} /> {copy.nav.back}
          </button>
          {step < TOTAL - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={Boolean(leaving)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400 disabled:opacity-60"
            >
              {copy.nav.next} <ArrowRight size={15} />
            </button>
          ) : (
            <span className="text-xs text-neutral-500">{copy.screen8.returnNote?.("") ?? ""}</span>
          )}
        </div>
      </footer>
    </div>
  );
}

/** Titolo + sottotitolo standard di ogni schermata. */
function Heading({
  copy,
  title,
  subtitle,
  icon,
}: {
  copy: OnboardingCopy;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
        {icon}
        {title}
      </h2>
      {subtitle && <p className="mt-2 text-sm leading-relaxed text-neutral-400">{subtitle} <span className="sr-only">{copy.meta.privacy}</span></p>}
      {(subtitle === undefined) && (
        <p className="sr-only">{copy.meta.privacy}</p>
      )}
    </div>
  );
}

/** Riepilogo del finale, prima dialoga senza analytics. */
function FinalSummary({
  copy,
  answers,
  defaultAgent,
  agents,
  language,
}: {
  copy: OnboardingCopy;
  answers: OnboardingAnswers;
  defaultAgent: string;
  agents: Array<{ slug: string; name: string }>;
  language: string;
}) {
  const occupationLabel =
    answers.occupation && answers.occupation !== "other"
      ? copy.screen2.options[answers.occupation].label
      : answers.occupationOther || "";
  // "Altro" non ha un id nel ruolo: vive in roleOther, `role` resta vuoto.
  const roleLabel = answers.role
    ? copy.screen3.roleLabels[answers.role]
    : answers.roleOther || "";
  const agentName = defaultAgent
    ? agents.find((a) => a.slug === defaultAgent)?.name ?? defaultAgent
    : copy.screen8.summary.none;

  const rows = [
    { label: copy.screen8.summary.name, value: answers.displayName || "" },
    { label: copy.screen8.summary.occupation, value: occupationLabel },
    ...(roleLabel ? [{ label: copy.screen8.summary.role, value: roleLabel }] : []),
    ...(answers.studyArea ? [{ label: copy.screen8.summary.studyArea, value: answers.studyArea }] : []),
    {
      label: copy.screen8.summary.goals,
      value: (answers.goals ?? []).map((g) => `${copy.screen4.cards[g as keyof typeof copy.screen4.cards]?.emoji ?? ""} ${copy.screen4.cards[g as keyof typeof copy.screen4.cards]?.title ?? ""}`).join(", "),
    },
    {
      label: copy.screen8.summary.tools,
      value: (answers.tools ?? []).map((t) => t).length
        ? (answers.tools ?? []).join(", ")
        : "",
    },
    { label: copy.screen8.summary.tone, value: answers.tone ? copy.screen6.tones[answers.tone].label : "" },
    { label: copy.screen8.summary.language, value: LOCALE_LABELS[language] ?? language },
    { label: copy.screen8.summary.defaultAgent, value: agentName },
  ].filter((row) => row.value);

  return (
    <dl className="grid gap-x-6 gap-y-3 rounded-2xl border border-white/10 bg-neutral-900 p-5 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{row.label}</dt>
          <dd className="truncate text-sm font-semibold text-neutral-100">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
