import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getLocale } from "@/lib/i18n/locale";
import { pageSeo } from "@/lib/seo";
import { getSkillsDictionary } from "@/lib/i18n/skills";
import { SKILL_TEMPLATE } from "@/lib/skills/template";
import { LIMITS } from "@/lib/skills/validate";
import { ArrowLeft, Download, CheckCircle2, AlertTriangle } from "lucide-react";

export const revalidate = 3600;

/** Torna typecheck se il template smette di essere un SKILL.md valido. */
const TITLE = "Crea la tua competenza in 10 minuti - AgentCloud";
const DESCRIPTION =
  "Guida per creare una competenza (SKILL.md) per gli agenti AgentCloud: struttura, frontmatter, esempi, limiti e template scaricabile.";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageSeo({ title: TITLE, description: DESCRIPTION, path: "/docs/skills", locale });
}

export default async function SkillsDocsPage() {
  const locale = await getLocale();
  const dict = getSkillsDictionary(locale);

  const steps = [
    {
      title: dict.docsStep1,
      body: dict.docsStep1Body,
    },
    {
      title: dict.docsStep2,
      body: dict.docsStep2Body,
    },
    {
      title: dict.docsStep3,
      body: dict.docsStep3Body,
    },
    {
      title: dict.docsStep4,
      body: dict.docsStep4Body,
    },
    {
      title: dict.docsStep5,
      body: dict.docsStep5Body,
    },
  ];

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-neutral-950">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 dark-gradient-main" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 50% 85%, rgba(168,85,247,.12), transparent 36%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
      </div>

      <Navbar />
      <section className="relative z-10 px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/skills"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} /> {dict.backToCatalog}
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {dict.docsTitle}
          </h1>
          <p className="mt-3 text-lg leading-8 text-neutral-400">{dict.docsIntro}</p>

          {/* Link e non <a>: `next/link` per la navigazione client. Il download
              è comunque gestito dal browser come risposta con
              Content-Disposition, quindi l'utente salva il file. */}
          <Link
            href="/api/skills/template/download"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
          >
            <Download size={15} /> {dict.templateDownload}
          </Link>

          {/* I 10 minuti, in 5 passi */}
          <ol className="mt-10 space-y-4">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-white/5 bg-neutral-900 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h2 className="font-bold text-white">{step.title}</h2>
                    <p className="mt-1.5 text-sm leading-6 text-neutral-400">{step.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {/* Limiti e regole: quello che il validatore rifiuta */}
          <section className="mt-10 rounded-2xl border border-white/5 bg-neutral-900 p-6">
            <h2 className="text-lg font-bold text-white">{dict.docsRulesTitle}</h2>
            <ul className="mt-4 space-y-2">
              {[
                dict.docsRuleFrontmatter,
                dict.docsRuleLength,
                dict.docsRuleSecrets,
                dict.docsRuleScripts,
                dict.docsRulePermissions,
                dict.docsRuleRisk,
              ].map((rule) => (
                <li key={rule} className="flex gap-2 text-sm leading-6 text-neutral-300">
                  <CheckCircle2 size={14} className="mt-1 shrink-0 text-emerald-400" />
                  {rule}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs leading-5 text-neutral-500">
              {LIMITS.maxLines} righe · {Math.round(LIMITS.maxSkillMdBytes / 1024)} KB per SKILL.md ·{" "}
              {LIMITS.maxZipBytes / (1024 * 1024)} MB per pacchetto
            </p>
          </section>

          <section className="mt-6 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <AlertTriangle size={16} className="text-amber-400" />
              {dict.docsSafetyTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-300">{dict.docsSafetyBody}</p>
          </section>

          {/* Template completo, così la guida si legge anche senza download */}
          <section className="mt-10">
            <h2 className="text-lg font-bold text-white">{dict.docsTemplateTitle}</h2>
            <pre className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-white/5 bg-neutral-900 p-5 font-mono text-xs leading-6 text-neutral-300">
              {SKILL_TEMPLATE}
            </pre>
          </section>
        </div>
      </section>
      <Footer />
    </main>
  );
}
