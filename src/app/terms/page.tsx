import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title:
      locale === "it"
        ? "Termini di Servizio | AgentCloud"
        : "Terms of Service | AgentCloud",
  };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const legal = dict.legal.terms;

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <section className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
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
