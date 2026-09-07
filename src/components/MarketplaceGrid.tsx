"use client";

/**
 * Griglia marketplace con ricerca e filtri per categoria/disponibilità.
 *
 * Filtra gli agenti in locale (search per nome/descrizione, categoria,
 * disponibilità) e mostra le card; gli agenti arrivano già dal server o dai
 * feature flag.
 */
import { useMemo, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import AgentCard from "./AgentCard";
import type { Agent } from "@/lib/agents";
import { t } from "@/lib/i18n/dictionaries";

type MarketplaceGridProps = {
  availableAgents: Agent[];
  comingSoonAgents: Agent[];
  availableCount: number;
  comingSoonCount: number;
  availableLabel: string;
  comingSoonLabel: string;
  /**
   * Quando true (possessori del codice), le card "coming soon" mantengono il
   * tag ma restano cliccabili — il codice le sblocca, mentre il tag mostra
   * comunque quali agenti un cliente reale (senza codice) troverebbe bloccati.
   * Quando false (vista pubblica) le card sono attenuate e non cliccabili.
   */
  comingSoonAccessible?: boolean;
};

export default function MarketplaceGrid({
  availableAgents,
  comingSoonAgents,
  availableCount,
  comingSoonCount,
  availableLabel,
  comingSoonLabel,
  comingSoonAccessible = false,
}: MarketplaceGridProps) {
  const { locale, dict } = useLanguage();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Estrae le categorie uniche dagli agenti disponibili
  const categories = useMemo(() => {
    const cats = new Set(availableAgents.map((a) => a.category));
    return Array.from(cats).sort();
  }, [availableAgents]);

  // Filtra gli agenti disponibili per categoria + ricerca
  const filteredAvailable = useMemo(() => {
    let result = availableAgents;
    if (selectedCategory) {
      result = result.filter((a) => a.category === selectedCategory);
    }
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(lowerQuery) ||
          a.description.toLowerCase().includes(lowerQuery) ||
          a.category.toLowerCase().includes(lowerQuery) ||
          a.tasks.some((t) => t.toLowerCase().includes(lowerQuery)),
      );
    }
    return result;
  }, [availableAgents, selectedCategory, query]);

  // Filtra anche i prossimamente per ricerca
  const filteredComingSoon = useMemo(() => {
    if (!query.trim()) return comingSoonAgents;
    const lowerQuery = query.toLowerCase();
    return comingSoonAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(lowerQuery) ||
        a.description.toLowerCase().includes(lowerQuery) ||
        a.category.toLowerCase().includes(lowerQuery) ||
        a.tasks.some((t) => t.toLowerCase().includes(lowerQuery)),
    );
  }, [comingSoonAgents, query]);

  return (
    <div className="space-y-12">
      {/* Sezione agenti disponibili */}
      <div>
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">{availableLabel}</h2>
          <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-300">
            {t(dict.agentsPage.agentsCount, { count: availableCount })}
          </span>
        </div>

        {/* Barra di ricerca */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              locale === "it"
                ? "Cerca agenti per nome, categoria o funzionalità..."
                : "Search agents by name, category or feature..."
            }
            className="w-full rounded-xl border border-white/10 bg-neutral-900 py-3 pl-11 pr-10 text-sm font-semibold text-white placeholder-neutral-500 outline-none transition-colors focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Conteggio risultati */}
        <div className="mb-4 text-sm font-semibold text-neutral-500">
          {locale === "it" ? `${filteredAvailable.length} agenti trovati` : `${filteredAvailable.length} agents found`}
        </div>

        {/* Filtri per categoria */}
        <div className="mb-6">
          {/* Bottone toggle filtri (mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 lg:hidden"
          >
            <SlidersHorizontal size={16} />
            {locale === "it" ? "Filtri" : "Filters"}
            {selectedCategory && (
              <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs text-brand-300">
                1
              </span>
            )}
          </button>

          <div
            className={`flex flex-wrap gap-2 ${showFilters ? "flex" : "hidden lg:flex"}`}
          >
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                !selectedCategory
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                  : "border border-white/10 bg-neutral-900 text-neutral-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {locale === "it" ? "Tutti" : "All"}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === category ? null : category,
                  )
                }
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  selectedCategory === category
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                    : "border border-white/10 bg-neutral-900 text-neutral-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Griglia agenti disponibili — ogni card in questa lista è disponibile
            per costruzione: il server mette qui solo gli agenti abilitati dai
            flag. Non ricalcolare mai la disponibilità dai flag lato client. */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
          {filteredAvailable.map((agent) => (
            <AgentCard key={agent.slug} agent={agent} available={true} />
          ))}
        </div>

        {/* Messaggio nessun risultato */}
        {filteredAvailable.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-neutral-900 p-12 text-center">
            <Search size={48} className="mx-auto mb-4 text-neutral-600" />
            <h3 className="text-lg font-bold text-white">
              {locale === "it" ? "Nessun agente trovato" : "No agents found"}
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              {locale === "it"
                ? "Prova a selezionare un'altra categoria"
                : "Try selecting a different category"}
            </p>
          </div>
        )}
      </div>

      {/* Divisore netto */}
      {comingSoonAgents.length > 0 && <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />}

      {/* Coming soon agents section */}
      {filteredComingSoon.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-neutral-900/40 p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">
                <Search size={14} />
              </span>
              {comingSoonLabel}
            </h2>
            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-bold text-neutral-400">
              {t(dict.agentsPage.agentsCount, { count: comingSoonCount })}
            </span>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {locale === "it" ? "In arrivo" : "Soon"}
            </span>
          </div>
          {filteredComingSoon.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {locale === "it" ? "Nessun agente in arrivo corrisponde alla ricerca." : "No upcoming agents match your search."}
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
              {filteredComingSoon.map((agent) => (
                <AgentCard
                  key={agent.slug}
                  agent={agent}
                  available={comingSoonAccessible}
                  comingSoonTag={comingSoonAccessible}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}