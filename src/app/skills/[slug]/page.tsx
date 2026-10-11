import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandLogo from "@/components/BrandLogo";
import { RiskBadge } from "@/components/skills/PluginsCatalog";
import SkillIcon from "@/components/skills/SkillIcon";
import { getLocale } from "@/lib/i18n/locale";
import { pageSeo } from "@/lib/seo";
import { getSkillsDictionary } from "@/lib/i18n/skills";
import { getPlugin, getSkill } from "@/lib/skills/data";
import { allCatalogSkills } from "@/lib/skills/catalog";
import { getAgentBySlug } from "@/lib/agents";
import { ArrowLeft, ArrowRight, Download, Sparkles, Package, ShieldCheck } from "lucide-react";

export const revalidate = 300;

/**
 * Dettaglio di una singola competenza.
 *
 * I vecchi URL `/skills/<plugin>` (quando il catalogo mescolava pacchetti e
 * skill) reindirizzano a `/plugins/<plugin>`: nessun link esistente si rompe.
 */
export async function generateStaticParams() {
  return allCatalogSkills().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = getSkillsDictionary(locale);
  const skill = await getSkill(slug, locale);
  if (skill) {
    return pageSeo({
      title: `${skill.name} - ${dict.label} | AgentCloud`,
      description: skill.description,
      path: `/skills/${skill.slug}`,
      locale,
    });
  }
  const plugin = await getPlugin(slug, locale);
  if (plugin) {
    return pageSeo({
      title: `${plugin.name} - ${dict.pluginsLabel} | AgentCloud`,
      description: plugin.tagline,
      path: `/plugins/${plugin.slug}`,
      locale,
    });
  }
  return pageSeo({ title: dict.notFoundTitle, description: dict.notFoundBody, path: `/skills/${slug}`, locale });
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = getSkillsDictionary(locale);

  // Retrocompatibilità: prima i plugin vivevano sotto /skills.
  const pluginMatch = await getPlugin(slug, locale);
  if (pluginMatch) redirect(`/plugins/${pluginMatch.slug}`);

  const skill = await getSkill(slug, locale);
  if (!skill) notFound();
  const plugin = skill.plugin;

  const primaryAgents = plugin.agents.filter((a) => a.fit === "primary");
  const secondaryAgents = plugin.agents.filter((a) => a.fit === "secondary");

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

          {/* Hero della skill */}
          <div className="rounded-3xl border border-white/5 bg-neutral-900 p-8 shadow-xl shadow-black/20">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-neutral-300">
                  {plugin.category}
                </span>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-neutral-300">
                  {dict.version} {plugin.version}
                </span>
                <RiskBadge risk={skill.risk} dict={dict} />
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {skill.name}
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-neutral-400">{skill.description}</p>

              <Link
                href={`/plugins/${plugin.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Package size={13} />
                {dict.parentPlugin}: {plugin.name}
              </Link>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={`/api/skills/${skill.slug}/download`}
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
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Procedura */}
              {skill.procedure.length > 0 && (
                <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Sparkles size={16} className="text-brand-400" />
                    {dict.procedureTitle}
                  </h2>
                  <ol className="mt-4 space-y-2.5">
                    {skill.procedure.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-6 text-neutral-300">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Regole */}
              {skill.rules.length > 0 && (
                <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                  <h2 className="text-lg font-bold text-white">{dict.rulesTitle}</h2>
                  <ul className="mt-4 space-y-2">
                    {skill.rules.map((rule, i) => (
                      <li key={i} className="text-sm leading-6 text-neutral-300">
                        · {rule}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Output atteso */}
              <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                <h2 className="text-lg font-bold text-white">{dict.outputTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-neutral-300">{skill.output}</p>
              </section>

              {/* Quando non usarla */}
              {skill.whenNot.length > 0 && (
                <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                  <h2 className="text-lg font-bold text-white">{dict.whenNotTitle}</h2>
                  <ul className="mt-4 space-y-2">
                    {skill.whenNot.map((w, i) => (
                      <li key={i} className="text-sm leading-6 text-neutral-400">
                        · {w}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Esempio */}
              {skill.example && (
                <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                  <h2 className="text-lg font-bold text-white">{dict.chatExamples}</h2>
                  <p className="mt-3 text-sm italic leading-6 text-neutral-300">
                    «{skill.example}»
                  </p>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              {/* Pacchetto padre */}
              <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                <h2 className="text-base font-bold text-white">{dict.parentPlugin}</h2>
                <Link
                  href={`/plugins/${plugin.slug}`}
                  className="mt-3 block rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-brand-500/30 hover:bg-white/[0.05]"
                >
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="text-brand-300">
                      <SkillIcon icon={plugin.icon} size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white">{plugin.name}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-neutral-500">
                        {plugin.tagline}
                      </span>
                    </span>
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-400">
                    {dict.viewPlugin} <ArrowRight size={12} />
                  </span>
                </Link>
              </section>

              {/* Agenti consigliati */}
              {[...primaryAgents, ...secondaryAgents].length > 0 && (
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
              )}

              {/* Permessi */}
              {skill.permissions.length > 0 && (
                <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                  <h2 className="flex items-center gap-2 text-base font-bold text-white">
                    <ShieldCheck size={15} className="text-brand-400" />
                    {dict.permissions}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skill.permissions.map((p) => (
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

              {/* Integrazioni del pacchetto */}
              {plugin.resolvedIntegrations.length > 0 && (
                <section className="rounded-2xl border border-white/5 bg-neutral-900 p-6">
                  <h2 className="text-base font-bold text-white">{dict.recommendedIntegrations}</h2>
                  <ul className="mt-4 space-y-2.5">
                    {plugin.resolvedIntegrations.map((i) => (
                      <li key={i.brand} className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 ${
                            i.available ? "" : "opacity-40 grayscale"
                          }`}
                        >
                          <BrandLogo slug={i.brand} size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-white">{i.name}</span>
                          <span className="block text-xs leading-5 text-neutral-500">
                            {i.rationale}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
