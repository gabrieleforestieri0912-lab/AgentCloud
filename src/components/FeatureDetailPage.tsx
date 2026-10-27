/**
 * Layout della pagina di dettaglio di una funzionalità (`/features/<slug>`).
 *
 * Perché esiste: in home il pulsante "Vedi dettagli" apriva solo tre righe
 * dentro la card. Ora porta a questa pagina, che riprende quei tre punti
 * (tradotti nel dizionario) e li amplia con benefici, passi e un invito
 * all'azione.
 *
 * Server component: tutto il testo arriva dal dizionario o da
 * `lib/i18n/featureDetails.ts`, così nessun contenuto finisce nel bundle JS.
 */
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  LayoutDashboard,
  MessagesSquare,
  PlugZap,
  Timer,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import type { FeatureDetailContent, FeatureSlug } from "@/lib/i18n/featureDetails";

// Icone allineate per slug con la sezione Funzionalità della home.
const ICONS: Record<FeatureSlug, LucideIcon> = {
  agents: Bot,
  "agents-autonomous": Timer,
  integrations: PlugZap,
  chat: MessagesSquare,
  dashboard: LayoutDashboard,
};

export default function FeatureDetailPage({
  slug,
  content,
  highlights,
  related,
}: {
  slug: FeatureSlug;
  content: FeatureDetailContent;
  /** I tre punti "in sintesi", dal dizionario della lingua attiva. */
  highlights: string[];
  related: { label: string; href: string }[];
}) {
  const Icon = ICONS[slug];

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-neutral-950">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 dark-gradient-main" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 8%, rgba(3,139,254,.18), transparent 34%), radial-gradient(circle at 85% 12%, rgba(217,70,239,.12), transparent 30%), radial-gradient(circle at 50% 90%, rgba(234,67,53,.10), transparent 36%)",
          }}
        />
      </div>

      <Navbar />

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-400 hover:text-white"
        >
          <ArrowLeft size={13} />
          {content.homeLink}
        </Link>

        <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-300">
          <Icon size={14} />
          {content.badge}
        </span>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {content.titleA}{" "}
          <span className="bg-linear-to-r from-brand-400 to-pink-400 bg-clip-text text-transparent">
            {content.titleB}
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-neutral-300">{content.subtitle}</p>
        <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-400">
          {content.intro}
        </p>

        {/* In sintesi: gli stessi punti che prima si vedevano espandendo la
            card in home, qui nel contesto della pagina completa. */}
        {highlights.length > 0 && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-neutral-900/70 p-6 backdrop-blur-xl sm:p-8">
            <h2 className="text-xl font-bold text-white">{content.highlightsTitle}</h2>
            <ul className="mt-4 space-y-2.5">
              {highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-sm text-neutral-300">
                  <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span className="leading-6">{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Benefici: numerati, così restano leggibili anche a lungo. */}
        <div className="mt-14">
          <h2 className="text-2xl font-bold text-white">{content.benefitsTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {content.benefits.map((b, i) => (
              <div
                key={b.title}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-5"
              >
                <span className="text-xs font-bold text-brand-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-1.5 text-base font-bold text-white">{b.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-400">{b.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Come funziona, in tre passi. */}
        <div className="mt-14">
          <h2 className="text-2xl font-bold text-white">{content.stepsTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {content.steps.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl border border-white/10 bg-neutral-900/70 p-5 backdrop-blur-xl"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-300">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-base font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-400">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Invito all'azione + link alle altre funzionalità. */}
        <div className="mt-14 rounded-3xl border border-white/10 bg-neutral-900/70 p-6 backdrop-blur-xl sm:p-8">
          <h2 className="text-2xl font-bold text-white">{content.ctaTitle}</h2>
          <p className="mt-3 max-w-2xl text-neutral-400">{content.ctaText}</p>
          <Link
            href={content.ctaHref}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400"
          >
            {content.ctaLabel}
            <ArrowRight size={14} />
          </Link>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">
              {content.relatedTitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {related.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:border-brand-500/30 hover:text-white"
                >
                  {r.label}
                  <ArrowRight size={13} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
