"use client";

import { useState, useMemo } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import type { Agent } from "@/lib/agents";

type MarketplaceSearchProps = {
  agents: Agent[];
  onFilter: (filtered: Agent[]) => void;
};

export default function MarketplaceSearch({
  agents,
  onFilter,
}: MarketplaceSearchProps) {
  const { dict, locale } = useLanguage();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique categories from agents
  const categories = useMemo(() => {
    const cats = new Set(agents.map((a) => a.category));
    return Array.from(cats).sort();
  }, [agents]);

  // Filter agents based on query and category
  const filteredAgents = useMemo(() => {
    let result = agents;

    // Filter by category
    if (selectedCategory) {
      result = result.filter((a) => a.category === selectedCategory);
    }

    // Filter by search query
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
  }, [agents, query, selectedCategory]);

  // Notify parent when filters change
  useMemo(() => {
    onFilter(filteredAgents);
  }, [filteredAgents, onFilter]);

  return (
    <div className="mb-8">
      {/* Search bar */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
        />
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

      {/* Category filters */}
      <div
        className={`flex flex-wrap gap-2 ${showFilters ? "block" : "hidden lg:flex"}`}
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

      {/* Results count */}
      <div className="mt-4 text-sm font-semibold text-neutral-500">
        {locale === "it"
          ? `${filteredAgents.length} agenti trovati`
          : `${filteredAgents.length} agents found`}
      </div>
    </div>
  );
}
