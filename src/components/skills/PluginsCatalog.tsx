"use client";

/**
 * Griglia del catalogo Plugin (pacchetti) con filtri lato client.
 *
 * Questa griglia mostra SOLO i pacchetti: le singole competenze vivono in
 * `/skills` (`SkillsList`). I filtri (categoria, agente, integrazione,
 * "solo disponibili ora", ricerca testuale) sono interattivi e non devono
 * passare dal server a ogni keystroke. I dati arrivano già risolti e
 * localizzati dalla pagina server (`getPlugins(locale)`), quindi la prima
 * render è completa e indicizzabile: la pagina non è solo uno scheletro JS.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import SearchWithSuggestions from "@/components/SearchWithSuggestions";
import SkillIcon from "./SkillIcon";
import { Download, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import type { ResolvedPlugin } from "@/lib/skills/data";
import { getSkillsDictionary, type SkillsDictionary } from "@/lib/i18n/skills";
import { t } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/constants";

type Props = {
  plugins: ResolvedPlugin[];
  categories: { value: string; count: number }[];
  agents: { slug: string; pluginCount: number }[];
  integrations: { brand: string; name: string; available: boolean }[];
  locale: Locale;
  /**
   * Slug dei plugin con almeno un'integrazione utilizzabile oggi, e di quelli
   * con un'integrazione NECESSARIA non ancora collegabile.
   *
   * Perché elenchi di slug e non funzioni: la pagina server non può passare
   * funzioni a un Client Component. I due predicati sono derivati dai dati
   * (nessuna logica di business), quindi si calcolano qui e si passano i
   * risultati.
   */
  liveSlugs: string[];
  comingSoonRequiredSlugs: string[];
};

/** Sottoinsieme del dizionario necessario al badge di rischio. */
export type RiskDict = Pick<SkillsDictionary, "riskLow" | "riskMedium" | "riskHigh">;

/** Badge rischio: coerente con i toni usati in tutto il sito. */
export function RiskBadge({ risk, dict }: { risk: string; dict: RiskDict }) {
  const label = risk === "high" ? dict.riskHigh : risk === "medium" ? dict.riskMedium : dict.riskLow;
  const tone =
    risk === "high"
      ? "bg-red-500/10 text-red-300 border-red-500/20"
      : risk === "medium"
        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  const Icon = risk === "high" ? ShieldAlert : risk === "medium" ? AlertTriangle : CheckCircle2;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}

export default function PluginsCatalog({
  plugins,
  categories,
  agents,
  integrations,
  locale,
  liveSlugs,
  comingSoonRequiredSlugs,
}: Props) {
  const dict = getSkillsDictionary(locale);
  const [category, setCategory] = useState<string>("");
  const [agent, setAgent] = useState<string>("");
  const [integration, setIntegration] = useState<string>("");
  const [onlyLive, setOnlyLive] = useState(false);
  const [query, setQuery] = useState("");

  const liveSlugsSet = useMemo(() => new Set(liveSlugs), [liveSlugs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plugins.filter((p) => {
      if (category && p.category !== category) return false;
      if (agent && !p.agents.some((a) => a.slug === agent)) return false;
      if (integration && !p.resolvedIntegrations.some((i) => i.brand === integration)) return false;
      if (onlyLive && !liveSlugsSet.has(p.slug)) return false;
      if (
        q &&
        !`${p.name} ${p.tagline} ${p.description} ${p.skills.map((s) => s.name).join(" ")}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [plugins, category, agent, integration, onlyLive, query, liveSlugsSet]);

  // Voci dell'autocompletamento: ogni pacchetto con la categoria come
  // contesto, e tagline/descrizioni/skill cercabili nel testo lungo.
  const suggestions = useMemo(
    () =>
      plugins.map((p) => ({
        id: p.slug,
        label: p.name,
        hint: p.category,
        keywords: `${p.tagline} ${p.description} ${p.skills.map((s) => s.name).join(" ")}`,
        href: `/plugins/${p.slug}`,
      })),
    [plugins],
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
      {/* Filtri compatti: una riga con ricerca + 3 dropdown, niente chip per
          ogni valore (con tante categorie/agenti/integrazioni diventa illeggibile). */}
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
            {t(dict.resultsCount, { count: filtered.length })}
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
          {filtered.map((plugin, i) => (
            <PluginCard
              key={plugin.slug}
              plugin={plugin}
              dict={dict}
              index={i}
              hasComingSoonRequired={comingSoonRequiredSlugs.includes(plugin.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Card del plugin: icona, N competenze, agenti primary, loghi integrazioni, azioni. */
function PluginCard({
  plugin,
  dict,
  index,
  hasComingSoonRequired,
}: {
  plugin: ResolvedPlugin;
  dict: SkillsDictionary;
  index: number;
  hasComingSoonRequired: boolean;
}) {
  const primaryAgents = plugin.agents.filter((a) => a.fit === "primary");
  const liveIntegrations = plugin.resolvedIntegrations.filter((i) => i.available);
  const comingSoon = plugin.resolvedIntegrations.filter((i) => !i.available);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.32), ease: "easeOut" }}
      className="flex flex-col rounded-xl border border-white/5 bg-neutral-900 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-2xl hover:shadow-brand-500/10"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-brand-300"
        >
          <SkillIcon icon={plugin.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-tight text-white">{plugin.name}</h3>
          <p className="mt-0.5 text-xs font-semibold text-neutral-500">
            {t(dict.skillsCount, { count: plugin.skillCount })}
          </p>
        </div>
        {hasComingSoonRequired && (
          <span
            title={dict.arriving}
            className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300"
          >
            {dict.arriving}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-6 text-neutral-400">{plugin.tagline}</p>

      {/* Agenti consigliati: solo i primary, per non affollare la card */}
      {primaryAgents.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {primaryAgents.map((a) => (
            <Link
              key={a.slug}
              href={`/agents/${a.slug}`}
              className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-300 transition-colors hover:bg-brand-500/20 hover:text-brand-200"
            >
              <Sparkles size={9} />
              {a.slug}
            </Link>
          ))}
        </div>
      )}

      {/* Integrazioni: live piene, in arrivo sfumate con badge */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {liveIntegrations.map((i) => (
          <span key={i.brand} title={i.name} className="inline-flex items-center">
            <BrandLogo slug={i.brand} size={16} />
          </span>
        ))}
        {comingSoon.map((i) => (
          <span
            key={i.brand}
            title={`${i.name} · ${dict.arriving}`}
            className="inline-flex items-center opacity-40 grayscale"
          >
            <BrandLogo slug={i.brand} size={16} />
          </span>
        ))}
        {comingSoon.length > 0 && (
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
            +{comingSoon.length} {dict.arriving.toLowerCase()}
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Link
          href={`/plugins/${plugin.slug}`}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-400"
        >
          {dict.detail}
        </Link>
        <a
          href={`/api/plugins/${plugin.slug}/download`}
          aria-label={t(dict.downloadAria, { name: plugin.name })}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-neutral-800 px-3 py-2 text-xs font-bold text-neutral-200 transition-colors hover:bg-neutral-700 hover:text-white"
        >
          <Download size={13} />
          .zip
        </a>
      </div>
    </motion.article>
  );
}
