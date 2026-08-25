/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getLocale, type Locale } from "@/lib/i18n/locale";
import { getSiteUrl } from "@/lib/site-url";

const BASE_URL = getSiteUrl();

const META: Record<Locale, { title: string; description: string }> = {
  it: {
    title: "AgentCloud | Agenti AI per la tua azienda",
    description:
      "AgentCloud è la piattaforma che distribuisce agenti AI per automatizzare i tuoi workflow, gestire le comunicazioni e far crescere le operazioni — senza codice.",
  },
  en: {
    title: "AgentCloud | AI Agents for Your Business",
    description:
      "AgentCloud is the intelligent platform that deploys AI agents to automate your workflows, manage communications, and scale your operations — no code required.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const meta = META[locale];
  const title = {
    default: meta.title,
    template: "%s | AgentCloud",
  };
  const description = meta.description;
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    icons: {
      icon: "/agentcloud.png",
      apple: "/agentcloud.png",
    },
    openGraph: {
      type: "website",
      siteName: "AgentCloud",
      title: meta.title,
      description,
      url: BASE_URL,
      locale: locale === "it" ? "it_IT" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: BASE_URL,
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "AgentCloud",
      url: BASE_URL,
      logo: `${BASE_URL}/agentcloud.png`,
      image: `${BASE_URL}/opengraph-image`,
      slogan: "Agenti AI che automatizzano la tua azienda",
      description:
        "AgentCloud è la piattaforma che distribuisce agenti AI per automatizzare i tuoi workflow, gestire le comunicazioni e far crescere le operazioni — senza codice.",
      email: "info@agentcloud.io",
      areaServed: [
        { "@type": "Country", name: "Italy" },
        "Worldwide",
      ],
      address: {
        "@type": "PostalAddress",
        addressCountry: "IT",
      },
      availableLanguage: ["it", "en"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "info@agentcloud.io",
        areaServed: "Worldwide",
        availableLanguage: ["it", "en"],
      },
      // SameAs anchors the entity for generative engines (ChatGPT, Perplexity,
      // Gemini) and traditional knowledge graphs. Only real, verifiable
      // profiles are listed.
      sameAs: ["https://github.com/gabrieleforestieri0912-lab/AgentCloud"],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "AgentCloud",
      description:
        "Piattaforma di agenti AI che automatizza workflow aziendali, supporto, vendite e operazioni.",
      inLanguage: ["it", "en"],
      publisher: { "@id": `${BASE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/agents?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "AgentCloud",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: BASE_URL,
      description:
        "Piattaforma no-code di agenti AI per automatizzare workflow, supporto clienti, vendite e operazioni aziendali.",
      availableLanguage: ["it", "en"],
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        url: `${BASE_URL}/agents`,
        availability: "https://schema.org/InStock",
      },
      provider: { "@id": `${BASE_URL}/#organization` },
    },
    {
      "@type": "Service",
      name: "Agenti AI per le aziende",
      serviceType: "AI agent automation",
      areaServed: [
        { "@type": "Country", name: "Italy" },
        "Worldwide",
      ],
      availableLanguage: ["it", "en"],
      provider: { "@id": `${BASE_URL}/#organization` },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Agenti AI AgentCloud",
        itemListElement: {
          "@type": "Offer",
          itemOffered: {
            "@type": "SoftwareApplication",
            name: "AgentCloud",
            applicationCategory: "BusinessApplication",
          },
          url: `${BASE_URL}/agents`,
        },
      },
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Manrope:wght@400;500;600;700;800;900&display=swap"
            rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-black text-neutral-900">
        <LanguageProvider key={locale} initialLocale={locale}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
