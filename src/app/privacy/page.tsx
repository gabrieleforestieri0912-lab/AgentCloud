import type { Metadata } from "next";
import Link from "next/link";

// Pagina Privacy Policy: contenuto statico localizzato (dizionario i18n) con
// metadati generati per lingua. Nessuna logica applicativa.

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroBubbles from "@/components/HeroBubbles";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title:
      locale === "it"
        ? "Informativa Privacy | AgentCloud"
        : "Privacy Policy | AgentCloud",
  };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const legal = dict.legal.privacy;

  return (
    <main className="relative min-h-screen overflow-x-hidden dark-gradient-main">
      {/* Sfondo decorativo — stesso linguaggio visivo dell'hero */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(3,139,254,.15), transparent 30%), radial-gradient(circle at 90% 16%, rgba(234,67,53,.15), transparent 26%)",
        }}
      />

      {/* Costellazioni fluttuanti di app e agenti ai lati */}
      <HeroBubbles />

      <Navbar />
      <section className="relative z-10 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-8 inline-flex text-sm font-semibold text-neutral-400 hover:text-white"
          >
            &larr; {legal.backHome}
          </Link>
          <h1 className="mb-8 text-4xl font-bold tracking-tight text-white">
            {legal.title}
          </h1>
          <div className="prose prose-invert max-w-none space-y-6 text-neutral-400">
            <p>{legal.lastUpdated}</p>

            {legal.sections.map((section) => (
              <div key={section.heading}>
                <h2 className="text-xl font-bold text-white">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
