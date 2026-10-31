"use client";

/**
 * Selettore dell'agente predefinito — componente CONDIVISO fra l'onboarding
 * (schermata 7) e la sezione "Chat" di Impostazioni (/account).
 *
 * Cosa fa: lista dell'agenti online (o posseduti), ricerca client-side,
 * anteprima "Nessuno (chiedimi ogni volta)". La PERSISTENZA non è qui:
 * l'onboarding la coordina con il resto delle risposte; le Impostazioni
 * salvano al cambio attraverso la callback `onChange` che il chiamante
 * collega al canale giusto (saveDefaultAgent: localStorage + POST
 * /api/user/preferences).
 *
 * Accessibilità: input di ricerca sempre a fuoco per primo, opzioni navigabili
 * con le frecce, Invio conferma; aria-live annuncia il cambio di scelta.
 */

import { useMemo, useRef, useState } from "react";
import { Search, Check } from "lucide-react";
import AgentIcon from "./AgentIcon";
import type { Agent } from "@/lib/agents";
import { useLanguage } from "./LanguageProvider";
import { getOnboardingCopy } from "@/lib/i18n/onboarding";

export type PickerAgent = {
  slug: string;
  name: string;
  shortName: string;
  category: string;
  /** Icona/brand del catalogo (chiave di AgentIcon); fallback "bot". */
  icon?: string;
  brand?: string;
};

type Props = {
  agents: PickerAgent[];
  /** Slug scelto; stringa vuota = "Nessuno". `null` = nessuna scelta ancora. */
  value: string | null;
  /** Slug "owned" (badge "Già tuo"): opzionale, per il contesto. */
  ownedSlugs?: readonly string[];
  onChange: (slug: string) => void;
  /** Id dei slug consigliati (etichetta "Consigliati per te" nell'onboarding). */
  recommendedSlugs?: readonly string[];
  mode: "onboarding" | "settings";
};

export default function AgentDefaultPicker({
  agents,
  value,
  ownedSlugs,
  onChange,
  recommendedSlugs,
  mode,
}: Props) {
  const { locale } = useLanguage();
  const copy = getOnboardingCopy(locale);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(mode === "settings");
  const listRef = useRef<HTMLDivElement>(null);

  const owned = new Set(ownedSlugs ?? []);
  const recommended = new Set(recommendedSlugs ?? []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.shortName.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [agents, query]);

  // Non in modalità impostazioni la lista parte stretta (i consigliati): la
  // ricerca apre implicitamente l'elenco completo.
  const list = mode === "onboarding" && !showAll && !query
    ? agents.filter((a) => recommended.has(a.slug))
    : filtered;

  function moveFocus(current: HTMLElement, delta: number): void {
    const buttons: HTMLElement[] = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("button[data-slug]") ?? [],
    );
    const index = buttons.indexOf(current);
    const next = buttons[index + delta] ?? buttons[delta > 0 ? 0 : buttons.length - 1];
    next?.focus();
  }

  return (
    <div className="w-full">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="search"
          value={query}
          autoFocus={mode === "onboarding"}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.screen7.searchPlaceholder}
          aria-label={copy.screen7.searchPlaceholder}
          className="w-full rounded-xl border border-white/10 bg-neutral-900 py-3 pl-11 pr-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-500/50"
        />
      </div>

      {mode === "onboarding" && !query && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="mt-2 inline-flex text-xs font-bold text-brand-400 hover:underline"
        >
          {showAll ? copy.screen7.recommended : copy.screen7.browseAll}
        </button>
      )}

      {mode === "settings" && (
        <button
          type="button"
          data-slug=""
          role="option"
          aria-selected={value === ""}
          tabIndex={value === "" ? 0 : -1}
          onClick={() => onChange("")}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); moveFocus(e.currentTarget, 1); }
            if (e.key === "ArrowUp") { e.preventDefault(); moveFocus(e.currentTarget, -1); }
          }}
          className={`mt-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            value === ""
              ? "border-brand-500/60 bg-brand-500/10"
              : "border-white/5 bg-neutral-900 hover:border-white/15 hover:bg-neutral-800/70"
          }`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            value === "" ? "bg-brand-500/20 text-brand-300" : "bg-white/5 text-neutral-400"
          }`}>
            ✳
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-white">{copy.defaultAgentPicker.none}</span>
          </span>
          {value === "" && <Check size={16} className="shrink-0 text-brand-400" />}
        </button>
      )}

      <div
        ref={listRef}
        role="listbox"
        aria-label={copy.screen7.title}
        className="mt-3 max-h-[46vh] space-y-2 overflow-y-auto pr-1"
      >
        {list.length === 0 && (
          <p className="px-2 py-6 text-sm text-neutral-500" role="status">
            {copy.screen7.noResults}
          </p>
        )}
        {list.map((agent) => {
          const selected = value === agent.slug;
          return (
            <button
              key={agent.slug}
              type="button"
              data-slug={agent.slug}
              role="option"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(agent.slug)}
              onKeyDown={(e) => {
                // Le frecce muovono il fuoco nella lista; Invio/Spazio devono
                // attivare il pulsante COME nativo (niente preventDefault su
                // quei tasti: romperebbero l'attivazione).
                if (e.key === "ArrowDown") { e.preventDefault(); moveFocus(e.currentTarget, 1); }
                if (e.key === "ArrowUp") { e.preventDefault(); moveFocus(e.currentTarget, -1); }
              }}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                selected
                  ? "border-brand-500/60 bg-brand-500/10"
                  : "border-white/5 bg-neutral-900 hover:border-white/15 hover:bg-neutral-800/70"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  selected ? "bg-brand-500/20 text-brand-300" : "bg-white/5 text-neutral-400"
                }`}
              >
                <AgentIcon
                  icon={(agent.icon ?? "bot") as Agent["icon"]}
                  brand={agent.brand as Agent["brand"] | undefined}
                  size={18}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-white">{agent.name}</span>
                <span className="block truncate text-xs text-neutral-500">{agent.category}</span>
              </span>
              {owned.has(agent.slug) && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  {copy.screen7.owned}
                </span>
              )}
              {selected && <Check size={16} className="shrink-0 text-brand-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
