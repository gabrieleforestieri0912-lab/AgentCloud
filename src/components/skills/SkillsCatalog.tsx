"use client";

/**
 * Griglia del catalogo Competenze con filtri lato client.
 *
 * Perché è un client component: i filtri (categoria, agente, integrazione,
 * "solo disponibili ora", ricerca testuale) sono interattivi e non devono
 * passare dal server a ogni keystroke. I dati arrivano già risolti dalla
 * pagina server (`getPlugins()`), quindi la prima render è completa e
 * indicizzabile: la pagina non è solo uno scheletro JS.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
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

/** Pillola filtro: il pattern usato da MarketplaceGrid e IntegrationsGrid. */
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        active
          ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
          : "border border-white/10 bg-neutral-900 text-neutral-400 hover:border-white/20 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

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

export default function SkillsCatalog({
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
      {/* Filtri — stessa grammatica visiva di MarketplaceGrid */}
      <div className="mb-8 rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
        <label htmlFor="skills-search" className="sr-only">
          {dict.searchLabel}
        </label>
        <input
          id="skills-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.searchPlaceholder}
          className="mb-3 w-full rounded-xl border border-white/10 bg-neutral-900 py-2.5 px-4 text-sm font-semibold text-white placeholder-neutral-500 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
        />

        <FilterRow label={dict.category}>
          <Chip active={category === ""} onClick={() => setCategory("")}>
            {dict.allCategories}
          </Chip>
          {categories.map((c) => (
            <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
              {c.value} ({c.count})
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={dict.agent}>
          <Chip active={agent === ""} onClick={() => setAgent("")}>
            {dict.allCategories}
          </Chip>
          {agents.map((a) => (
            <Chip key={a.slug} active={agent === a.slug} onClick={() => setAgent(a.slug)}>
              {a.slug} ({a.pluginCount})
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label={dict.integration}>
          <Chip active={integration === ""} onClick={() => setIntegration("")}>
            {dict.allCategories}
          </Chip>
          {integrations.map((i) => (
            <Chip
              key={i.brand}
              active={integration === i.brand}
              onClick={() => setIntegration(i.brand)}
            >
              {i.name}
              {!i.available && (
                <span className="ml-1 text-amber-400/80">·</span>
              )}
            </Chip>
          ))}
        </FilterRow>

        <div className="mt-3 flex flex-wrap items-center gap-3">
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
        <div className="rounded-2xl border border-white/5 bg-neutral-900 p-12 text-center">
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

/** Riga di filtri con etichetta: la label rende leggibile il gruppo a colpo d'occhio. */
function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 last:mb-0">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      {children}
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-xl"
        >
          {plugin.icon}
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
          href={`/skills/${plugin.slug}`}
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
