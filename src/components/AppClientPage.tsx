/**
 * Layout della pagina dedicata a un client (CLI, estensione, desktop).
 *
 * Perché esiste: prima tutto l'ecosistema stava in una sola pagina a tab in
 * italiano. Le pagine dedicate condividono questa struttura — hero, stato,
 * installazione, cosa saprà fare, invito all'azione — e cambiano solo i
 * contenuti, che arrivano localizzati da `lib/i18n/appClients.ts`.
 *
 * Server component: nessuno stato, così i testi restano fuori dal bundle JS.
 */
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MonitorDown,
  PanelRight,
  Terminal,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CommandCopy from "./CommandCopy";
import type {
  ClientPageContent,
  DocumentedClientSlug,
} from "@/lib/i18n/appClients";

const ICONS = {
  cli: Terminal,
  extension: PanelRight,
  desktop: MonitorDown,
} as const;

export default function AppClientPage({
  slug,
  content,
}: {
  slug: DocumentedClientSlug;
  content: ClientPageContent;
}) {
  const Icon = ICONS[slug];
  // Un client non ancora sugli store non deve promettere un download: il
  // pulsante principale porta alla piattaforma web o a un contatto, mai a un
  // file inesistente.
  const primaryHref = content.available ? "/signup" : "/contact";

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-neutral-950">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 dark-gradient-main" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 85% 12%, rgba(168,85,247,.14), transparent 28%), radial-gradient(circle at 50% 85%, rgba(234,67,53,.10), transparent 36%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
      </div>

      <Navbar />

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <Link
          href="/apps"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-400 hover:text-white"
        >
          <ArrowLeft size={13} />
          {content.backLabel}
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-300">
            <Icon size={14} />
            {content.badge}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
              content.available
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            {content.statusLabel}
          </span>
        </div>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {content.titleA}{" "}
          <span className="bg-linear-to-r from-brand-400 to-fuchsia-400 bg-clip-text text-transparent">
            {content.titleB}
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-neutral-300">{content.subtitle}</p>
        <p className="mt-3 max-w-2xl text-sm text-neutral-500">{content.statusNote}</p>

        {/* Installazione: comandi veri dove esistono, passi descrittivi
            altrove (nessun percorso inventato per i client non pubblicati). */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-neutral-900/70 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
              <Icon size={18} />
            </span>
            <h2 className="text-2xl font-bold text-white">{content.installTitle}</h2>
          </div>
          <p className="mt-3 text-sm text-neutral-400">{content.installNote}</p>

          <ol className="mt-5 space-y-3">
            {content.installSteps.map((step, i) => (
              <li key={step.label} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-neutral-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-200">
                    {step.label}
                  </p>
                  {step.code && (
                    <div className="mt-2">
                      <CommandCopy command={step.code} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Cosa saprà fare */}
        <div className="mt-14">
          <h2 className="text-2xl font-bold text-white">{content.featuresTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {content.features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-5"
              >
                <div className="flex items-center gap-2">
                  <Check size={14} className="shrink-0 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">{f.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Invito all'azione */}
        <div className="mt-14 rounded-3xl border border-white/10 bg-neutral-900/70 p-6 text-center backdrop-blur-xl sm:p-8">
          <h2 className="text-2xl font-bold text-white">{content.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-neutral-400">{content.ctaText}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400"
            >
              {content.ctaLabel}
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/apps"
              className="inline-flex items-center rounded-full border border-white/10 bg-neutral-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white/20"
            >
              {content.backLabel}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
