import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  MonitorDown,
  PanelRight,
  Smartphone,
  Sparkles,
  Terminal,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CommandCopy from "@/components/CommandCopy";
import { getLocale } from "@/lib/i18n/locale";
import {
  CLI_INSTALL_CURL,
  CLI_INSTALL_NPM,
  CLIENT_PATHS,
  getAppHub,
  type ClientSlug,
} from "@/lib/i18n/appClients";
import { pageSeo } from "@/lib/seo";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Hub di "App ed estensioni" (`/install`).
 *
 * Prima questa pagina conteneva quattro tab con tutto l'ecosistema dentro.
 * Ora è un indice: ogni client ha la sua pagina dedicata (`/cli`,
 * `/extension`, `/desktop`, `/mobile`) e qui restano i comandi per la CLI,
 * che è l'unico client già installabile, più i link alle altre schede.
 *
 * Server component: tutto il testo arriva da `lib/i18n/appClients.ts` nella
 * lingua attiva, quindi la pagina è tradotta come il resto del sito.
 */
export const revalidate = 300;

const ICONS: Record<ClientSlug, LucideIcon> = {
  cli: Terminal,
  extension: PanelRight,
  desktop: MonitorDown,
  mobile: Smartphone,
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const hub = getAppHub(locale);
  return pageSeo({
    title: hub.metaTitle,
    description: hub.metaDescription,
    path: "/install",
    locale,
  });
}

export default async function InstallPage() {
  const locale = await getLocale();
  const hub = getAppHub(locale);
  const { navbar } = getDictionary(locale);

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

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-brand-300 backdrop-blur-md">
            <Sparkles size={13} />
            {hub.badge}
          </span>
        </div>

        <div className="mx-auto mt-6 max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {hub.titleA}{" "}
            <span className="bg-clip-text text-transparent bg-linear-to-r from-brand-400 to-fuchsia-400">
              {hub.titleB}
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-300 sm:text-lg">
            {hub.subtitle}
          </p>
        </div>

        {/* Comandi della CLI: l'unico client già installabile, quindi gli
            unici comandi che ha senso copiare da qui. */}
        <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/10 bg-neutral-900/70 p-6 backdrop-blur-xl sm:p-8">
          <h2 className="text-xl font-bold text-white">{hub.quickTitle}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CommandCopy command={CLI_INSTALL_NPM} label={hub.quickNpm} />
            <CommandCopy command={CLI_INSTALL_CURL} label={hub.quickCurl} />
          </div>
          <Link
            href={CLIENT_PATHS.cli}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300"
          >
            {hub.cards[0].cta}
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Una card per client: ognuna apre la propria pagina. */}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {hub.cards.map((card) => {
            const Icon = ICONS[card.slug];
            return (
              <article
                key={card.slug}
                className="flex flex-col rounded-3xl border border-white/10 bg-neutral-900/70 p-6 backdrop-blur-xl transition-colors hover:border-brand-500/30 sm:p-8"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
                    <Icon size={20} />
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      card.soon
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {card.soon ? hub.soonBadge : hub.availableBadge}
                  </span>
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">{card.title}</h3>
                <p className="mt-1 text-sm text-neutral-400">{card.desc}</p>
                <Link
                  href={CLIENT_PATHS[card.slug]}
                  className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-400"
                >
                  {card.cta}
                  <ArrowRight size={14} />
                </Link>
              </article>
            );
          })}
        </div>

        {/* Account unico: spiega perché non serve una chiave per client. */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white">{hub.accountTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-400">{hub.accountText}</p>
          <Link
            href="/signup"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:border-white/20"
          >
            {navbar.startNow}
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
