"use client";

/**
 * Scheda "Competenze" della pagina agente.
 *
 * Mostra i plugin consigliati per quell'agente con:
 * - lo stato di installazione per competenza (installa / rimuovi / attiva-disattiva),
 * - le integrazioni mancanti, con il flusso "Connetti in 2 minuti" per quelle
 *   già disponibili e "Avvisami" per quelle in arrivo,
 * - la modalità ridotta dichiarata esplicitamente quando l'integrazione non
 *   è ancora collegabile.
 *
 * Tutte le azioni sono per-slug: `installed_skills.agent_instance_id` è lo slug
 * dell'agente, quindi la pagina pubblica e la dashboard parlano la stessa
 * lingua senza mappare id di sessione.
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Download,
  CheckCircle2,
  Plus,
  Trash2,
  Power,
  Clock3,
  Bell,
  ArrowRight,
  AlertTriangle,
  Search,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { RiskBadge, type RiskDict } from "./SkillsCatalog";

/** Plugin raccomandato, già risolto lato server. */
export type AgentPlugin = {
  slug: string;
  name: string;
  tagline: string;
  icon: string;
  version: string;
  skillCount: number;
  fit: "primary" | "secondary";
  rationale: string | null;
  skills: {
    slug: string;
    name: string;
    description: string;
    risk_level: "low" | "medium" | "high";
    permissions: string[];
    installed: boolean;
    enabled: boolean;
  }[];
  integrations: {
    brand: string;
    name: string;
    status: "required" | "optional";
    availability: "live" | "coming_soon";
    rationale: string;
  }[];
};

/** Integrazioni già collegate all'account (dal session check del server). */
type ConnectedMap = Record<string, boolean>;

type Dict = RiskDict & {
  agentTabTitle: string;
  agentTabBody: string;
  agentTabPrimary: string;
  agentTabSecondary: string;
  installAll: string;
  installAllDone: string;
  installing: string;
  installedBadge: string;
  missingIntegrations: string;
  missingIntegrationsBody: string;
  connectInTwoMinutes: string;
  notifyMe: string;
  notifyMeDone: string;
  degradedMode: string;
  degradedModeBody: string;
  noRecommended: string;
  noRecommendedBody: string;
  installSkill: string;
  removeSkill: string;
  agentTabSearch: string;
  agentTabSearchLabel: string;
  agentTabNoResults: string;
  enable: string;
  disable: string;
  detail: string;
  download: string;
  required: string;
  optional: string;
  arriving: string;
  toggleError: string;
  enabledSkills: string;
};

export default function AgentSkillsTab({
  agentSlug,
  plugins,
  connected,
  signedIn,
  dict,
}: {
  agentSlug: string;
  plugins: AgentPlugin[];
  connected: ConnectedMap;
  signedIn: boolean;
  dict: Dict;
}) {
  const [items, setItems] = useState(plugins);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  // La ricerca filtra su due livelli, perché qui le competenze sono annidate
  // dentro i plugin: un plugin resta visibile se corrisde per nome o descrizione
  // OPPURE se contiene una competenza che corrisce, e in quel caso dentro
  // vengono mostrate solo le competenze che corrispondono. Filtrando solo i
  // plugin, cercare il nome di una competenza riporterebbe il plugin giusto ma
  // con tutte le competenze dentro, cioe non avrebbe filtrato nulla.
  const q = query.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    if (!q) return items;
    return items
      .map((p) => {
        const pluginMatches =
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q);
        if (pluginMatches) return p;
        const skills = p.skills.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.description ?? "").toLowerCase().includes(q),
        );
        return skills.length > 0 ? { ...p, skills } : null;
      })
      .filter((p): p is AgentPlugin => p !== null);
  }, [items, q]);

  const installedCount = useMemo(
    () => items.flatMap((p) => p.skills).filter((s) => s.installed).length,
    [items],
  );

  const updateSkill = useCallback(
    (pluginSlug: string, skillSlug: string, patch: Partial<AgentPlugin["skills"][number]>) => {
      setItems((prev) =>
        prev.map((p) =>
          p.slug !== pluginSlug
            ? p
            : { ...p, skills: p.skills.map((s) => (s.slug === skillSlug ? { ...s, ...patch } : s)) },
        ),
      );
    },
    [],
  );

  async function call(skillSlug: string, action: "install" | "remove" | "toggle", enabled?: boolean) {
    setError(null);
    try {
      if (action === "install") {
        const res = await fetch(`/api/agents/${encodeURIComponent(agentSlug)}/skills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill_slug: skillSlug }),
        });
        if (!res.ok) throw new Error();
        return { installed: true, enabled: true };
      }
      const res = await fetch(
        `/api/agents/${encodeURIComponent(agentSlug)}/skills?skill_slug=${encodeURIComponent(skillSlug)}`,
        {
          method: action === "remove" ? "DELETE" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: action === "remove" ? undefined : JSON.stringify({ skill_slug: skillSlug, enabled }),
        },
      );
      if (!res.ok) throw new Error();
      return action === "remove" ? { installed: false } : { enabled: Boolean(enabled) };
    } catch {
      setError(dict.toggleError);
      return null;
    }
  }

  async function handleInstall(plugin: AgentPlugin, skillSlug: string) {
    setBusy(skillSlug);
    const result = await call(skillSlug, "install");
    if (result) updateSkill(plugin.slug, skillSlug, { installed: true, enabled: true });
    setBusy(null);
  }

  async function handleRemove(plugin: AgentPlugin, skillSlug: string) {
    setBusy(skillSlug);
    const result = await call(skillSlug, "remove");
    if (result) updateSkill(plugin.slug, skillSlug, { installed: false });
    setBusy(null);
  }

  async function handleToggle(plugin: AgentPlugin, skillSlug: string, enabled: boolean) {
    setBusy(skillSlug);
    // Ottimistico: il toggle deve rispondere subito, con rollback se fallisce.
    updateSkill(plugin.slug, skillSlug, { enabled });
    const result = await call(skillSlug, "toggle", enabled);
    if (!result) updateSkill(plugin.slug, skillSlug, { enabled: !enabled });
    setBusy(null);
  }

  async function handleInstallAll(plugin: AgentPlugin) {
    const missing = plugin.skills.filter((s) => !s.installed);
    if (missing.length === 0) return;
    setBusy(`all:${plugin.slug}`);
    for (const skill of missing) {
      // In sequenza, non in parallelo: il vincolo unico su
      // (account, agente, skill) è più semplice da rispettare così e le
      // richieste sono poche (2-5 per plugin).
      const result = await call(skill.slug, "install");
      if (result) updateSkill(plugin.slug, skill.slug, { installed: true, enabled: true });
    }
    setBusy(null);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-neutral-900 p-10 text-center">
        <p className="text-base font-bold text-white">{dict.noRecommended}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">{dict.noRecommendedBody}</p>
        <Link
          href="/skills"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
        >
          <Sparkles size={15} /> {dict.detail}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Sparkles size={18} className="text-brand-400" />
            {dict.agentTabTitle}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-neutral-400">
            {dict.agentTabBody}
          </p>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-neutral-400">
          {installedCount} {dict.enabledSkills.toLowerCase()}
        </span>
      </div>

      {!signedIn && (
        <p className="mb-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-neutral-400">
          {dict.missingIntegrationsBody}
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </p>
      )}

      <div className="relative mb-5">
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.agentTabSearch}
          aria-label={dict.agentTabSearchLabel}
          className="w-full rounded-xl border border-white/10 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm font-semibold text-white placeholder:text-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
        />
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-neutral-900 p-10 text-center">
          <p className="text-sm font-bold text-white">{dict.agentTabNoResults}</p>
        </div>
      ) : (
      <div className="space-y-4">
        {visibleItems.map((plugin) => {
          const missingRequired = plugin.integrations.filter(
            (i) => i.status === "required" && !connected[i.brand],
          );
          const comingSoonRequired = plugin.integrations.filter(
            (i) => i.status === "required" && i.availability === "coming_soon",
          );
          const pendingInstall = busy === `all:${plugin.slug}`;
          const allInstalled = plugin.skills.every((s) => s.installed);

          return (
            <section
              key={plugin.slug}
              className="rounded-2xl border border-white/5 bg-neutral-900 p-5"
            >
              <div className="flex flex-wrap items-start gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-xl"
                >
                  {plugin.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-white">{plugin.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        plugin.fit === "primary"
                          ? "bg-brand-500/15 text-brand-300"
                          : "bg-white/5 text-neutral-500"
                      }`}
                    >
                      {plugin.fit === "primary" ? dict.agentTabPrimary : dict.agentTabSecondary}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-neutral-400">
                      {plugin.skillCount}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-400">{plugin.tagline}</p>
                  {plugin.rationale && (
                    <p className="mt-1 text-xs leading-5 text-neutral-500">{plugin.rationale}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/skills/${plugin.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-200 transition-colors hover:bg-neutral-700 hover:text-white"
                  >
                    {dict.detail} <ArrowRight size={12} />
                  </Link>
                  <a
                    href={`/api/plugins/${plugin.slug}/download`}
                    aria-label={`${dict.download} ${plugin.name}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-200 transition-colors hover:bg-neutral-700 hover:text-white"
                  >
                    <Download size={12} /> .zip
                  </a>
                </div>
              </div>

              {/* Integrazioni mancanti: il flusso guidato */}
              {(missingRequired.length > 0 || comingSoonRequired.length > 0) && (
                <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <AlertTriangle size={12} className="text-amber-400" />
                    {dict.missingIntegrations}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {dict.missingIntegrationsBody}
                  </p>
                  <div className="mt-3 space-y-2">
                    {missingRequired
                      .filter((i) => i.availability === "live")
                      .map((i) => (
                        <div
                          key={i.brand}
                          className="flex flex-wrap items-center gap-2.5 rounded-lg border border-white/5 bg-neutral-900/60 px-3 py-2"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                            <BrandLogo slug={i.brand} size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold text-white">{i.name}</span>
                            <span className="block text-[11px] leading-4 text-neutral-500">
                              {i.rationale}
                            </span>
                          </span>
                          <Link
                            href="/dashboard/integrations"
                            className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-brand-400"
                          >
                            {dict.connectInTwoMinutes}
                          </Link>
                        </div>
                      ))}
                    {comingSoonRequired.map((i) => (
                      <div
                        key={i.brand}
                        className="flex flex-wrap items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 opacity-50 grayscale">
                          <BrandLogo slug={i.brand} size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{i.name}</span>
                            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              {dict.arriving}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-4 text-neutral-500">
                            {dict.degradedModeBody}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setNotified((prev) => ({ ...prev, [i.brand]: true }))}
                          disabled={notified[i.brand]}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                            notified[i.brand]
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "border border-white/10 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white"
                          }`}
                        >
                          {notified[i.brand] ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Bell size={12} />
                          )}
                          {notified[i.brand] ? dict.notifyMeDone : dict.notifyMe}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Competenze del plugin con toggle */}
              <ul className="mt-4 divide-y divide-white/5">
                {plugin.skills.map((skill) => (
                  <li
                    key={skill.slug}
                    className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-white">{skill.name}</p>
                        <RiskBadge risk={skill.risk_level} dict={dict} />
                        {skill.installed && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            {dict.installedBadge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        {skill.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {skill.installed ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggle(plugin, skill.slug, !skill.enabled)
                            }
                            disabled={busy === skill.slug}
                            aria-pressed={skill.enabled}
                            title={skill.enabled ? dict.disable : dict.enable}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                              skill.enabled
                                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                                : "border-white/10 bg-neutral-800 text-neutral-500 hover:text-white"
                            }`}
                          >
                            <Power size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(plugin, skill.slug)}
                            disabled={busy === skill.slug}
                            title={dict.removeSkill}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-neutral-800 text-neutral-500 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleInstall(plugin, skill.slug)}
                          disabled={busy === skill.slug}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
                        >
                          <Plus size={12} /> {dict.installSkill}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {!allInstalled && (
                <button
                  type="button"
                  onClick={() => handleInstallAll(plugin)}
                  disabled={pendingInstall}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  {pendingInstall ? (
                    <>
                      <Clock3 size={13} /> {dict.installing}
                    </>
                  ) : (
                    <>
                      <Plus size={13} /> {dict.installAll}
                    </>
                  )}
                </button>
              )}
            </section>
          );
        })}
      </div>
      )}
    </div>
  );
}
