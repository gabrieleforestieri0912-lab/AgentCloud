import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageSeo } from "@/lib/seo";
import { MonitorDown, Smartphone, TerminalSquare, PanelRight, ArrowRight, ArrowLeft } from "lucide-react";

/**
 * Indice di "App ed estensioni": desktop, mobile, CLI ed estensione browser.
 * Citata dalla landing (sezione #app, navbar, footer).
 *
 * È solo una directory: ogni card apre la pagina dedicata del client, dove
 * stanno i dettagli e le istruzioni. Qui non si ripete come si installa
 * (su `/cli`, `/extension`, `/desktop`, `/mobile` c'è tutto).
 *
 * Onestà di stato: la CLI si installa da npm (live), desktop, mobile ed
 * estensione sono in arrivo (badge "In arrivo" / "Prossimamente").
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return pageSeo({
    title: dict.apps.metaTitle,
    description: dict.apps.metaDescription,
    path: "/apps",
    locale,
  });
}

export default async function AppsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const a = dict.apps;
  const cards = [
    {
      id: "desktop",
      icon: MonitorDown,
      title: a.desktopTitle,
      desc: a.desktopDesc,
      cta: a.desktopCta,
      href: "/desktop",
      live: false,
    },
    {
      id: "mobile",
      icon: Smartphone,
      title: a.mobileTitle,
      desc: a.mobileDesc,
      cta: a.mobileCta,
      href: "/mobile",
      live: false,
    },
    {
      id: "cli",
      icon: TerminalSquare,
      title: a.cliTitle,
      desc: a.cliDesc,
      cta: a.cliCta,
      href: "/cli",
      live: true,
    },
    {
      id: "extension",
      icon: PanelRight,
      title: a.extTitle,
      desc: a.extDesc,
      cta: a.extCta,
      href: "/extension",
      live: false,
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
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.18), transparent 32%), radial-gradient(circle at 85% 12%, rgba(234,67,53,.14), transparent 28%), radial-gradient(circle at 50% 85%, rgba(168,85,247,.12), transparent 36%)",
          }}
        />
      </div>

      <Navbar />
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-400 hover:text-white"
        >
          <ArrowLeft size={13} />
          AgentCloud
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-400">{a.badge}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">{a.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-neutral-400">{a.subtitle}</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {cards.map(({ id, icon: Icon, title, desc, cta, href, live }) => (
            // La card è un link: cliccare un componente porta dritto alla
            // pagina di quel client, non a un'altra pagina generica.
            <Link
              key={id}
              id={id}
              href={href}
              className="group scroll-mt-28 rounded-3xl border border-white/10 bg-neutral-900/70 p-6 backdrop-blur-xl transition-colors hover:border-brand-500/30 sm:p-8"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
                  <Icon size={20} />
                </span>
                {!live && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
                    {a.soon}
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">{title}</h2>
              <p className="mt-1 text-sm text-neutral-400">{desc}</p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-all group-hover:bg-brand-400">
                {cta}
                <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
