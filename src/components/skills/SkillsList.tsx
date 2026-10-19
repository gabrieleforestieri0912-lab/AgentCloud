"use client";

/**
 * Griglia delle singole competenze con filtri lato client.
 *
 * Questa griglia mostra SOLO le skill (una card per competenza): i pacchetti
 * vivono in `/plugins` (`PluginsCatalog`). Ogni card rimanda al dettaglio
 * della skill (`/skills/[slug]`) e al pacchetto che la contiene.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Download, ArrowRight, Package } from "lucide-react";
import { RiskBadge } from "./PluginsCatalog";
import SearchWithSuggestions from "@/components/SearchWithSuggestions";
import { getSkillsDictionary, type SkillsDictionary } from "@/lib/i18n/skills";
import { t } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/constants";

/** Una skill appiattita dal catalogo, con il contesto del plugin padre. */
export type FlatSkill = {
  slug: string;
  name: string;
  description: string;
  risk: string;
  pluginSlug: string;
  pluginName: string;
  category: string;
  agentSlugs: string[];
  integrationBrands: string[];
  live: boolean;
};

type Props = {
  skills: FlatSkill[];
  categories: { value: string; count: number }[];
  agents: { slug: string; pluginCount: number }[];
  integrations: { brand: string; name: string; available: boolean }[];
  locale: Locale;
};

export default function SkillsList({
  skills,
  categories,
  agents,
  integrations,
  locale,
}: Props) {
  const dict = getSkillsDictionary(locale);
  const [category, setCategory] = useState<string>("");
  const [agent, setAgent] = useState<string>("");
  const [integration, setIntegration] = useState<string>("");
  const [onlyLive, setOnlyLive] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      if (category && s.category !== category) return false;
      if (agent && !s.agentSlugs.includes(agent)) return false;
      if (integration && !s.integrationBrands.includes(integration)) return false;
      if (onlyLive && !s.live) return false;
      if (q && !`${s.name} ${s.description}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [skills, category, agent, integration, onlyLive, query]);

  // Voci dell'autocompletamento: ogni skill con il suo pacchetto come
  // contesto, e descrizione/categoria/integrazioni cercabili nel testo lungo.
  const suggestions = useMemo(
    () =>
      skills.map((s) => ({
        id: s.slug,
        label: s.name,
        hint: s.pluginName,
        keywords: `${s.description} ${s.category} ${s.integrationBrands.join(" ")} ${s.agentSlugs.join(" ")}`,
        href: `/skills/${s.slug}`,
      })),
    [skills],
  );

  const hasFilters = Boolean(category || agent || integration || onlyLive || query);

  const clearAll = () => {
    setCategory("");
    setAgent("");
    setIntegration("");
    setOnlyLive(false);
    setQuery("");
  };

  return (
    <div>
      {/* Filtri compatti: stessa grammatica di PluginsCatalog */}
      <div className="mb-6 rounded-2xl border border-white/5 bg-neutral-900/60 p-3">
        <div className="flex flex-col gap-2 lg:flex-row">
          <label htmlFor="skills-search" className="sr-only">
            {dict.searchLabel}
          </label>
          <SearchWithSuggestions
            id="skills-search"
            type="search"
            value={query}
            onChange={setQuery}
            suggestions={suggestions}
            placeholder={dict.searchPlaceholder}
            wrapperClassName="flex-1"
            inputClassName="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-[13px] font-semibold text-white placeholder-neutral-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={dict.category}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-2 py-2 text-xs font-bold text-neutral-300 outline-none focus:border-brand-500/50 lg:w-36"
            >
              <option value="">
                {dict.category}: {dict.allCategories}
              </option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value} ({c.count})
                </option>
              ))}
            </select>

            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              aria-label={dict.agent}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-2 py-2 text-xs font-bold text-neutral-300 outline-none focus:border-brand-500/50 lg:w-36"
            >
              <option value="">
                {dict.agent}: {dict.allCategories}
              </option>
              {agents.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.slug} ({a.pluginCount})
                </option>
              ))}
            </select>

            <select
              value={integration}
              onChange={(e) => setIntegration(e.target.value)}
              aria-label={dict.integration}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-2 py-2 text-xs font-bold text-neutral-300 outline-none focus:border-brand-500/50 lg:w-36"
            >
              <option value="">
                {dict.integration}: {dict.allCategories}
              </option>
              {integrations.map((i) => (
                <option key={i.brand} value={i.brand}>
                  {i.name}
                  {!i.available ? " ·" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-neutral-400">
            <input
              type="checkbox"
              checked={onlyLive}
              onChange={(e) => setOnlyLive(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-neutral-900 accent-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            {dict.onlyAvailable}
          </label>
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-bold text-brand-400 transition-colors hover:text-brand-300"
            >
              {dict.clearFilters}
            </button>
          )}
          <span className="ml-auto text-xs font-semibold text-neutral-500">
            {t(dict.skillsCount, { count: filtered.length })}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-6 text-center">
          <p className="font-bold text-white">{dict.noResults}</p>
          <p className="mt-2 text-sm text-neutral-500">{dict.noResultsHint}</p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-400"
          >
            {dict.clearFilters}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
          {filtered.map((skill, i) => (
            <SkillCard key={skill.slug} skill={skill} dict={dict} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Card della singola competenza: testi, rischio, pacchetto padre, azioni. */
function SkillCard({
  skill,
  dict,
  index,
}: {
  skill: FlatSkill;
  dict: SkillsDictionary;
  index: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.32), ease: "easeOut" }}
      className="flex flex-col rounded-xl border border-white/5 bg-neutral-900 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-2xl hover:shadow-brand-500/10"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold leading-tight text-white">{skill.name}</h3>
        <RiskBadge risk={skill.risk} dict={dict} />
      </div>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-400">
        {skill.description}
      </p>

      <Link
        href={`/plugins/${skill.pluginSlug}`}
        className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Package size={11} />
        {skill.pluginName}
      </Link>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Link
          href={`/skills/${skill.slug}`}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-brand-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-400"
        >
          {dict.detail} <ArrowRight size={12} />
        </Link>
        <a
          href={`/api/skills/${skill.slug}/download`}
          aria-label={t(dict.downloadSkillAria, { name: skill.name })}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-neutral-800 px-3 py-2 text-xs font-bold text-neutral-200 transition-colors hover:bg-neutral-700 hover:text-white"
        >
          <Download size={13} />
          .zip
        </a>
      </div>
    </motion.article>
  );
}
