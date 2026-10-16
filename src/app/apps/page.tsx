import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageSeo } from "@/lib/seo";
import { MonitorDown, Smartphone, TerminalSquare, PanelRight, ArrowRight, ArrowLeft, Check } from "lucide-react";

/**
 * Pagina dedicata ad app ed estensioni: desktop, mobile, CLI ed estensione
 * browser. Citata dalla landing (sezione #app, navbar, footer): è il punto
 * unico da cui installare tutto l'ecosistema.
 *
 * Onestà di stato: la CLI si installa da npm, desktop, mobile ed estensione
 * sono in arrivo (badge "In arrivo" / "Prossimamente").
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
      href: "/install",
      steps: ["macOS (.dmg)", "Windows (.exe)", "Linux (.AppImage, .deb)"],
      live: false,
    },
    {
      id: "mobile",
      icon: Smartphone,
      title: a.mobileTitle,
      desc: a.mobileDesc,
      cta: a.mobileCta,
      href: "/install",
      steps: ["iOS", "Android"],
      live: false,
    },
    {
      id: "cli",
      icon: TerminalSquare,
      title: a.cliTitle,
      desc: a.cliDesc,
      cta: a.cliCta,
      href: "/install",
      steps: ["npm i -g agentcloud-cli"],
      live: false,
    },
    {
      id: "extension",
      icon: PanelRight,
      title: a.extTitle,
      desc: a.extDesc,
      cta: a.extCta,
      href: "/install#extension",
      steps: ["Chrome", "Edge", "Brave", "Firefox"],
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
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
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
          {cards.map(({ id, icon: Icon, title, desc, cta, href, steps, live }) => (
            <article
              key={id}
              id={id}
              className="scroll-mt-28 rounded-3xl border border-white/10 bg-neutral-900/70 p-6 backdrop-blur-xl sm:p-8"
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
              <ul className="mt-4 space-y-1.5">
                {steps.map((s) => (
                  <li key={s} className="flex items-center gap-2 font-mono text-xs text-neutral-300">
                    <Check size={12} className="shrink-0 text-emerald-400" />
                    {s}
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-400 transition-all"
              >
                {cta}
                <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
