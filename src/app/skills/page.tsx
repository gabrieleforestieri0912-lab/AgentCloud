import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingBrandBubbles from "@/components/FloatingBrandBubbles";
import SkillsList from "@/components/skills/SkillsList";
import SkillUploader from "@/components/skills/SkillUploader";
import { getLocale } from "@/lib/i18n/locale";
import { getSessionUser } from "@/lib/supabase/server";
import { pageSeo } from "@/lib/seo";
import { getSkillsDictionary } from "@/lib/i18n/skills";
import {
  agentOptions,
  flattenSkills,
  getPlugins,
  integrationOptions,
  pluginCategories,
} from "@/lib/skills/data";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Catalogo delle singole competenze.
 *
 * Qui ci sono SOLO le skill (una card per competenza): i pacchetti vivono in
 * `/plugins`, così le due viste non si mischiano. Pagina pubblica in cache
 * per qualche minuto, come il resto del catalogo.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getSkillsDictionary(locale);
  return pageSeo({
    title: dict.metaTitle,
    description: dict.metaDescription,
    path: "/skills",
    locale,
  });
}

export default async function SkillsPage() {
  const locale = await getLocale();
  const dict = getSkillsDictionary(locale);
  // Serve solo per mostrare o nascondere l'upload: la validazione e la
  // scrittura restano dietro sessione nella route.
  const user = await getSessionUser();
  const userId = user?.id ?? null;

  const plugins = await getPlugins(locale);
  const skills = flattenSkills(plugins);
  // I filtri riusano le opzioni dei plugin (le skill ereditano categoria,
  // agenti e integrazioni dal pacchetto padre): i conteggi restano quelli
  // dei pacchetti, non delle skill.
  const categories = pluginCategories(plugins);
  const agents = agentOptions(plugins);
  const integrations = integrationOptions(plugins);

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-neutral-950">
      {/* Sfondo: stesso layer fisso di /integrations e /agents (gradiente
          scuro + radiali + hairline). Le bolle stanno sopra il gradiente e
          sotto il contenuto. */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 dark-gradient-main" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 85% 12%, rgba(234,67,53,.14), transparent 28%), radial-gradient(circle at 50% 85%, rgba(168,85,247,.12), transparent 36%)",
          }}
        />
      </div>

      <FloatingBrandBubbles
        bubbles={[
          { top: "10%", left: "3%", size: "w-11 h-11", brand: "notion", delay: "0s", anim: "animate-float-gentle" },
          { top: "14%", left: "92%", size: "w-10 h-10", brand: "slack", delay: "1.2s", anim: "animate-float-reverse" },
          { top: "26%", left: "2%", size: "w-10 h-10", brand: "googlesheets", delay: "0.6s", anim: "animate-float-gentle" },
          { top: "30%", left: "93%", size: "w-11 h-11", brand: "gmail", delay: "1.8s", anim: "animate-float-reverse" },
          { top: "42%", left: "4%", size: "w-10 h-10", brand: "trello", delay: "0.4s", anim: "animate-float-reverse" },
          { top: "40%", left: "89%", size: "w-11 h-11", brand: "hubspot", delay: "2.0s", anim: "animate-float-gentle" },
          { top: "56%", left: "3%", size: "w-12 h-12", brand: "asana", delay: "1.0s", anim: "animate-float-reverse" },
          { top: "54%", left: "92%", size: "w-10 h-10", brand: "airtable", delay: "1.5s", anim: "animate-float-gentle" },
          { top: "68%", left: "5%", size: "w-11 h-11", brand: "clickup", delay: "1.6s", anim: "animate-float-gentle" },
          { top: "66%", left: "87%", size: "w-12 h-12", brand: "github", delay: "0.9s", anim: "animate-float-reverse" },
          { top: "80%", left: "5%", size: "w-10 h-10", brand: "woocommerce", delay: "1.1s", anim: "animate-float-reverse" },
          { top: "78%", left: "91%", size: "w-11 h-11", brand: "googledrive", delay: "2.2s", anim: "animate-float-reverse" },
        ]}
      />

      <Navbar />
      <section className="relative z-10 px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl 3xl:max-w-[1720px]">
          {/* Hero */}
          <div className="mb-10 text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Sparkles size={13} className="text-brand-400" />
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">
                {dict.label}
              </span>
            </div>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {dict.heroTitle}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-lg leading-8 text-neutral-400">
              {dict.heroSubtitle}
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
              {dict.heroNote}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/plugins"
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
              >
                {dict.browsePlugins} <ArrowRight size={14} />
              </Link>
              <span className="text-sm font-semibold text-neutral-500">
                {plugins.length} · {skills.length}
              </span>
            </div>
          </div>

          <SkillsList
            skills={skills}
            categories={categories}
            agents={agents}
            integrations={integrations}
            locale={locale}
          />

          {/* Carica la tua competenza: sotto il catalogo — è un'azione per
              utenti autenticati, non una card del catalogo. */}
          <div className="mt-10">
            <SkillUploader signedIn={Boolean(userId)} dict={dict} />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
