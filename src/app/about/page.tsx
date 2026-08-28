import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title:
      locale === "it"
        ? "Chi siamo | AgentCloud — il team che porta gli agenti cloud a lavoro e studio"
        : "About | AgentCloud — the team bringing cloud agents to work and study",
    description:
      locale === "it"
        ? "Siamo un team di giovani intraprendenti che aiuta le persone a risparmiare tempo su lavoro e studio grazie agli agenti cloud."
        : "We are a team of enterprising young people helping others save time on work and study through cloud agents.",
    alternates: {
      canonical: `${getSiteUrl()}/about`,
    },
  };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const about = dict.about;
  const BASE_URL = getSiteUrl();

  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name:
      locale === "it"
        ? "Chi siamo | AgentCloud"
        : "About | AgentCloud",
    description: about.subtitle,
    url: `${BASE_URL}/about`,
    mainEntity: { "@id": `${BASE_URL}/#organization` },
    isPartOf: { "@id": `${BASE_URL}/#website` },
  };

  return (
    <main className="min-h-screen bg-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <Navbar />
      <section className="relative overflow-hidden px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        <div
          className="pointer-events-none absolute inset-0 select-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, rgba(3,139,254,0.10), transparent 45%), radial-gradient(circle at 85% 10%, rgba(217,70,239,0.06), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl">
          <Link
            href="/"
            className="mb-8 inline-flex text-sm font-semibold text-neutral-400 hover:text-white"
          >
            &larr; {about.backHome}
          </Link>

          <span className="inline-block rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-300">
            {about.badge}
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {about.titleA}{" "}
            <span className="bg-linear-to-r from-brand-400 to-fuchsia-400 bg-clip-text text-transparent">
              {about.titleB}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold text-neutral-300">
            {about.subtitle}
          </p>

          {/* Mission */}
          <div className="mt-14 rounded-2xl border border-white/5 bg-white/[0.02] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white">
              {about.missionTitle}
            </h2>
            <p className="mt-3 text-neutral-400">{about.missionText}</p>
          </div>

          {/* Team */}
          <div className="mt-16">
            <p className="text-neutral-400">{about.teamIntro}</p>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {about.members.map((member) => (
                <div
                  key={member.name + member.role}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center"
                >
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-fuchsia-500 text-2xl font-bold text-white">
                    {member.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-brand-300">
                    {member.role}
                  </p>
                  <p className="mt-3 text-sm text-neutral-400">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Values */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-white">
              {about.valuesTitle}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {about.values.map((value) => (
                <div
                  key={value.title}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-6"
                >
                  <h3 className="text-base font-bold text-white">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-400">{value.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl border border-brand-500/20 bg-brand-500/[0.04] p-6 sm:p-8 text-center">
            <h2 className="text-2xl font-bold text-white">{about.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-neutral-400">
              {about.ctaText}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/demo"
                className="rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400"
              >
                {about.ctaDemo}
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-white/10 px-6 py-3 text-sm font-bold text-neutral-200 transition-colors hover:bg-white/5"
              >
                {about.ctaContact}
              </Link>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap gap-4 text-sm font-semibold text-neutral-400">
            <Link href="/agents" className="hover:text-brand-300">
              AgentCloud → {dict.navbar.marketplace}
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
