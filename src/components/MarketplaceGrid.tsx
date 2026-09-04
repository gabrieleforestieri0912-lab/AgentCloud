"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
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
   * When true (access-code holders), "coming soon" cards keep the tag but
   * stay clickable — the code unlocks them, while the tag still shows which
   * agents a real (non-code) client would find locked. When false (public
   * view) the cards are dimmed and not clickable.
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique categories from available agents
  const categories = useMemo(() => {
    const cats = new Set(availableAgents.map((a) => a.category));
    return Array.from(cats).sort();
  }, [availableAgents]);

  // Filter available agents by category
  const filteredAvailable = useMemo(() => {
    if (!selectedCategory) return availableAgents;
    return availableAgents.filter((a) => a.category === selectedCategory);
  }, [availableAgents, selectedCategory]);

  return (
    <div className="space-y-12">
      {/* Available agents section */}
      <div>
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">{availableLabel}</h2>
          <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-300">
            {t(dict.agentsPage.agentsCount, { count: availableCount })}
          </span>
        </div>

        {/* Category filters */}
        <div className="mb-6">
          {/* Filter toggle button (mobile) */}
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

        {/* Available agents grid — every card in this list is available by
            construction: the server only puts flag-enabled agents here.
            Never re-derive availability from the client-side flags here. */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
          {filteredAvailable.map((agent) => (
            <AgentCard key={agent.slug} agent={agent} available={true} />
          ))}
        </div>

        {/* No results message */}
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

      {/* Coming soon agents section */}
      {comingSoonAgents.length > 0 && (
        <div>
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{comingSoonLabel}</h2>
            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-bold text-neutral-400">
              {t(dict.agentsPage.agentsCount, { count: comingSoonCount })}
            </span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
            {comingSoonAgents.map((agent) => (
              <AgentCard
                key={agent.slug}
                agent={agent}
                available={comingSoonAccessible}
                comingSoonTag={comingSoonAccessible}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}