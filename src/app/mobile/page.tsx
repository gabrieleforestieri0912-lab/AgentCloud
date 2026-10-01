import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Bell, RefreshCw, Smartphone, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSiteUrl } from "@/lib/site-url";

// Pagina di sponsorizzazione dell'app mobile (ancora in sviluppo).
// Server Component: metadati localizzati + JSON-LD (SoftwareApplication in
// pre-ordine) + contenuti dal dizionario i18n della lingua attiva, coerente
// con le altre pagine marketing (/about, /integrations).

const FEATURE_ICONS = [Smartphone, Bell, Zap, RefreshCw];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { mobile } = getDictionary(locale);
  return {
    title: mobile.metaTitle,
    description: mobile.metaDescription,
    alternates: {
      canonical: `${getSiteUrl()}/mobile`,
    },
  };
}

export default async function MobileAppPage() {
  const locale = await getLocale();
  const { mobile } = getDictionary(locale);
  const BASE_URL = getSiteUrl();

  const mobileJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: mobile.jsonLdName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "iOS, Android",
    url: `${BASE_URL}/mobile`,
    description: mobile.metaDescription,
    publisher: { "@id": `${BASE_URL}/#organization` },
    // Pre-ordine: l'app è annunciata ma non ancora pubblicata sugli store.
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      availability: "https://schema.org/PreOrder",
      url: `${BASE_URL}/mobile`,
    },
  };

  return (
    <main className="min-h-dvh bg-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mobileJsonLd) }}
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
            &larr; {mobile.backHome}
          </Link>

          <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-brand-300">
                <Smartphone size={14} />
                {mobile.badge}
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {mobile.titleA}{" "}
                <span className="bg-linear-to-r from-brand-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {mobile.titleB}
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-semibold text-neutral-300">
                {mobile.subtitle}
              </p>
            </div>

            {/* Mockup dispositivo: cornice + logo, ancora nessuno store link. */}
            <div className="mx-auto sm:mx-0">
              <div className="relative h-[320px] w-[168px] rounded-[2rem] border border-white/10 bg-neutral-900 p-2.5 shadow-2xl shadow-brand-500/10">
                <div className="absolute left-1/2 top-2.5 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/10" />
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-[1.6rem] bg-gradient-to-br from-brand-500/15 to-purple-500/15">
                  <Image
                    src="/agentcloud.png"
                    alt="AgentCloud"
                    width={72}
                    height={72}
                    className="rounded-2xl"
                  />
                  <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/80">
                    {mobile.comingSoon}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Banner "prossimamente" + piattaforme */}
          <div className="mt-14 rounded-3xl border border-brand-500/20 bg-brand-500/[0.04] p-6 sm:p-8">
            <span className="inline-block rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-300">
              {mobile.comingSoon}
            </span>
            <h2 className="mt-4 text-2xl font-bold text-white">
              {mobile.comingSoonTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-neutral-400">{mobile.comingSoonText}</p>

            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                {mobile.platformsTitle}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {[mobile.ios, mobile.android].map((platform) => (
                  <span
                    key={platform}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-bold text-white"
                  >
                    <Smartphone size={16} className="text-brand-400" />
                    {platform}
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-300">
                      {mobile.comingSoon}
                    </span>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-neutral-500">{mobile.storesNote}</p>
            </div>
          </div>

          {/* Cosa potrai fare */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-white">{mobile.featuresTitle}</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {mobile.features.map((feature, i) => {
                const Icon = FEATURE_ICONS[i] ?? Smartphone;
                return (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-white/5 bg-white/[0.02] p-6"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                      <Icon size={18} />
                    </span>
                    <h3 className="mt-4 text-base font-bold text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-400">{feature.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA piattaforma web */}
          <div className="mt-16 rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center sm:p-8">
            <h2 className="text-2xl font-bold text-white">{mobile.webCtaTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-neutral-400">{mobile.webCtaText}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-400"
              >
                {mobile.webCta}
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full border border-white/10 bg-neutral-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white/20"
              >
                {mobile.updatesCta}
              </Link>
            </div>
            <p className="mt-5 text-sm text-neutral-500">
              {mobile.updatesText}
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
