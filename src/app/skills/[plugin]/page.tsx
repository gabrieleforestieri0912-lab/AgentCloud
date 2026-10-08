import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandLogo from "@/components/BrandLogo";
import { RiskBadge } from "@/components/skills/SkillsCatalog";
import { getLocale } from "@/lib/i18n/locale";
import { pageSeo } from "@/lib/seo";
import { getSkillsDictionary } from "@/lib/i18n/skills";
import { getPlugin, getPlugins } from "@/lib/skills/data";
import { getAgentBySlug } from "@/lib/agents";
import { ArrowLeft, ArrowRight, Check, Download, Sparkles, Info, ShieldCheck } from "lucide-react";

export const revalidate = 300;

/** I 13 plugin sono noti a build time: la pagina statica li elenca tutti. */
export async function generateStaticParams() {
  const plugins = await getPlugins();
  return plugins.map((p) => ({ plugin: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ plugin: string }>;
}): Promise<Metadata> {
  const { plugin: slug } = await params;
  const locale = await getLocale();
  const dict = getSkillsDictionary(locale);
  const plugin = await getPlugin(slug);
  if (!plugin) return pageSeo({ title: dict.notFoundTitle, description: dict.notFoundBody, path: `/skills/${slug}`, locale });
  return pageSeo({
    title: `${plugin.name} - ${dict.label} | AgentCloud`,
    description: plugin.tagline,
    path: `/skills/${plugin.slug}`,
    locale,
  });
}

export default async function PluginDetailPage({
  params,
}: {
  params: Promise<{ plugin: string }>;
}) {
  const { plugin: slug } = await params;
  const locale = await getLocale();
  const dict = getSkillsDictionary(locale);
  const plugin = await getPlugin(slug);
  if (!plugin) notFound();

  const primaryAgents = plugin.agents.filter((a) => a.fit === "primary");
  const secondaryAgents = plugin.agents.filter((a) => a.fit === "secondary");
  const requiredIntegrations = plugin.resolvedIntegrations.filter((i) => i.status === "required");
  const optionalIntegrations = plugin.resolvedIntegrations.filter((i) => i.status === "optional");
  const highRiskCount = plugin.skills.filter((s) => s.risk === "high").length;
  const permissions = Array.from(new Set(plugin.skills.flatMap((s) => s.permissions)));

  /** Nome leggibile dell'agente, con fallback sullo slug se non in catalogo. */
  const agentName = (agentSlug: string) => {
    const agent = getAgentBySlug(agentSlug);
    return agent?.name ?? agentSlug;
  };

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-neutral-950">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 dark-gradient-main" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 85% 12%, rgba(234,67,53,.14), transparent 28%), radial-gradient(circle at 50% 85%, rgba(168,85,247,.12), transparent 36%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
      </div>

      <Navbar />
      <section className="relative z-10 px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          <Link
            href="/skills"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} /> {dict.backToCatalog}
          </Link>

          {/* Hero del plugin */}
          <div className="rounded-3xl border border-white/5 bg-neutral-900 p-8 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <span
                aria-hidden
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-3xl"
              >
                {plugin.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {plugin.name}
                </h1>
                <p className="mt-2 text-lg text-neutral-300">{plugin.tagline}</p>
                <p className="mt-3 max-w-3xl leading-7 text-neutral-400">{plugin.description}</p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-neutral-300">
                    {plugin.category}
                  </span>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-neutral-300">
                    {dict.version} {plugin.version}
                  </span>
                  <RiskBadge
                    risk={highRiskCount > 0 ? "high" : plugin.skills.some((s) => s.risk === "medium") ? "medium" : "low"}
                    dict={dict}
                  />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href={`/api/plugins/${plugin.slug}/download`}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
                  >
                    <Download size={15} /> {dict.download}
                  </a>
                  {primaryAgents[0] && (
                    <Link
                      href={`/agents/${primaryAgents[0].slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                    >
                      {dict.install} · {agentName(primaryAgents[0].slug)} <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
                <p className="mt-3 text-xs text-neutral-500">{dict.downloadAllNote}</p>
              </div>
            </div>

            {/* Cosa costa: la domanda che segue ogni "Installa sul mio agente".
                La risposta dipende dal `price_tier` del plugin: `included`
                (nel prezzo dell'agente) o `addon` (add-on a parte). */}
            <div className="mt-6 grid gap-3 border-t border-white/5 pt-6 sm:grid-cols-2">
              <div
                className={`rounded-xl border p-4 ${
                  plugin.priceTier === "addon"
                    ? "border-white/5 bg-white/[0.02]"
                    : "border-emerald-500/20 bg-emerald-500/5"
                }`}
              >
                <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <Check size={14} className="text-emerald-400" />
                  {dict.pricingIncluded}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-neutral-400">
                  {dict.pricingIncludedBody}
                </p>
              </div>
              <div
                className={`rounded-xl border p-4 ${
                  plugin.priceTier === "addon"
                    ? "border-brand-500/30 bg-brand-500/5"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <Sparkles size={14} className="text-brand-400" />
                  {dict.pricingAddon}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-neutral-400">
                  {dict.pricingAddonBody}
                </p>
              </div>
              <p className="text-xs leading-5 text-neutral-500 sm:col-span-2">
                {dict.pricingNote}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {/* Competenze incluse */}
              <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Sparkles size={16} className="text-brand-400" />
                  {dict.includedSkills} ({plugin.skillCount})
                </h2>
                <div className="mt-4 space-y-3">
                  {plugin.skills.map((skill) => (
                    <details
                      key={skill.slug}
                      className="group rounded-xl border border-white/5 bg-white/[0.02]"
                    >
                      <summary className="flex cursor-pointer items-start gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white">{skill.name}</p>
                          <p className="mt-1 text-sm leading-6 text-neutral-400">
                            {skill.description}
                          </p>
                        </div>
                        <RiskBadge risk={skill.risk} dict={dict} />
                      </summary>
                      <div className="border-t border-white/5 px-4 pb-4 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                          {dict.permissions}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {skill.permissions.map((p) => (
                            <span
                              key={p}
                              className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-neutral-400"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                        {skill.example && (
                          <>
                            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                              {dict.chatExamples}
                            </p>
                            <p className="mt-1 text-sm italic text-neutral-300">
                              «{skill.example}»
                            </p>
                          </>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* Come funziona in chat */}
              <section className="mt-6 rounded-2xl border border-white/5 bg-neutral-900 p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Info size={16} className="text-brand-400" />
                  {dict.progressiveDisclosure}
                </h2>
                <p className="mt-3 leading-7 text-neutral-400">
                  {dict.progressiveDisclosureBody}
                </p>
                {highRiskCount > 0 && (
                  <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm leading-6 text-red-200">
                    {dict.riskHighHint}
                  </p>
                )}
              </section>
            </div>

            <aside className="space-y-6">
              {/* Agenti consigliati con motivazione */}
              <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                <h2 className="text-base font-bold text-white">{dict.recommendedAgents}</h2>
                <ul className="mt-4 space-y-3">
                  {[...primaryAgents, ...secondaryAgents].map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/agents/${a.slug}`}
                        className="block rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-brand-500/30 hover:bg-white/[0.05]"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white">{agentName(a.slug)}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              a.fit === "primary"
                                ? "bg-brand-500/15 text-brand-300"
                                : "bg-white/5 text-neutral-500"
                            }`}
                          >
                            {a.fit === "primary" ? dict.fitPrimary : dict.fitSecondary}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-neutral-500">
                          {a.rationale}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Integrazioni con motivazione e stato reale */}
              <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                <h2 className="text-base font-bold text-white">{dict.recommendedIntegrations}</h2>
                <ul className="mt-4 space-y-2.5">
                  {[...requiredIntegrations, ...optionalIntegrations].map((i) => (
                    <li key={i.brand} className="flex gap-3">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 ${
                          i.available ? "" : "opacity-40 grayscale"
                        }`}
                      >
                        <BrandLogo slug={i.brand} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-white">{i.name}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              i.status === "required"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-white/5 text-neutral-500"
                            }`}
                          >
                            {i.status === "required" ? dict.required : dict.optional}
                          </span>
                          {!i.available && (
                            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              {dict.arriving}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-neutral-500">
                          {i.rationale}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Changelog: cosa cambia fra una versione e l'altra. Sta qui e
                  non in pagina separata perché l'utente la consulta mentre
                  guarda cosa sta per installare. */}
              {plugin.changelog.length > 0 && (
                <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                  <h2 className="text-base font-bold text-white">{dict.changelogTitle}</h2>
                  <ol className="mt-4 space-y-4">
                    {plugin.changelog.map((entry) => (
                      <li key={entry.version} className="border-l-2 border-white/10 pl-4">
                        <p className="flex items-center gap-2 text-sm font-bold text-white">
                          v{entry.version}
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                            {entry.date}
                          </span>
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {entry.changes.map((change) => (
                            <li key={change} className="text-xs leading-5 text-neutral-400">
                              {change}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Permessi aggregati */}
              {permissions.length > 0 && (
                <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                  <h2 className="flex items-center gap-2 text-base font-bold text-white">
                    <ShieldCheck size={15} className="text-brand-400" />
                    {dict.permissions}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-neutral-400"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>

          {/* Plugin correlati: stessa categoria o agenti in comune */}
          <RelatedPlugins slug={plugin.slug} category={plugin.category} agents={plugin.agents.map((a) => a.slug)} />
        </div>
      </section>
      <Footer />
    </main>
  );
}

/** Plugin suggeriti in fondo alla pagina: stessa categoria o stessi agenti. */
async function RelatedPlugins({
  slug,
  category,
  agents,
}: {
  slug: string;
  category: string;
  agents: string[];
}) {
  const dict = getSkillsDictionary(await getLocale());
  const all = await getPlugins();
  const related = all
    .filter((p) => p.slug !== slug)
    .map((p) => ({
      plugin: p,
      score:
        (p.category === category ? 2 : 0) +
        p.agents.filter((a) => agents.includes(a.slug) && a.fit === "primary").length,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-lg font-bold text-white">{dict.related}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {related.map(({ plugin }) => (
          <Link
            key={plugin.slug}
            href={`/skills/${plugin.slug}`}
            className="rounded-xl border border-white/5 bg-neutral-900 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30"
          >
            <span className="flex items-center gap-3">
              <span aria-hidden className="text-xl">
                {plugin.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-white">{plugin.name}</span>
                <span className="block text-xs text-neutral-500">{plugin.tagline}</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
