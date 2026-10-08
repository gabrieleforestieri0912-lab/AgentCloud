"use client";

/**
 * Tab "Panoramica / Competenze" della pagina agente.
 *
 * Perché un wrapper client invece di due pagine: il contenuto dei due tab è
 * renderizzato lato server e passato come `children`, quindi nessuna funzione
 * o prop non serializzabile attraversa il confine — i dati restano sul server.
 * Il client possiede solo lo stato di quale tab è attivo.
 *
 * Di default si apre "Competenze" quando l'agente ha plugin consigliati: è la
 * novità della pagina e l'utente viene a cercarla. La scelta resta fissa per
 * visita (nessun routing): sono due sezioni della stessa pagina prodotto.
 */

import { useState, type ReactNode } from "react";
import { Info, Sparkles } from "lucide-react";

export default function AgentDetailTabs({
  overview,
  skills,
  defaultTab,
  overviewLabel,
  skillsLabel,
  skillsCount,
}: {
  overview: ReactNode;
  skills: ReactNode;
  defaultTab: "overview" | "skills";
  overviewLabel: string;
  skillsLabel: string;
  skillsCount: number;
}) {
  const [tab, setTab] = useState<"overview" | "skills">(defaultTab);

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
      active
        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
        : "border border-white/10 bg-neutral-900 text-neutral-400 hover:border-white/20 hover:text-white"
    }`;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sezioni della pagina agente"
        className="mb-5 flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          onClick={() => setTab("overview")}
          className={tabClass(tab === "overview")}
        >
          <Info size={14} />
          {overviewLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "skills"}
          onClick={() => setTab("skills")}
          className={tabClass(tab === "skills")}
        >
          <Sparkles size={14} />
          {skillsLabel}
          {skillsCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === "skills" ? "bg-white/20 text-white" : "bg-white/10 text-neutral-400"
              }`}
            >
              {skillsCount}
            </span>
          )}
        </button>
      </div>
      <div role="tabpanel">{tab === "skills" ? skills : overview}</div>
    </div>
  );
}
