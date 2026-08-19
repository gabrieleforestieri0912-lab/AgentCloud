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
      icon: "/favicon.png",
      apple: "/favicon.png",
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
      name: "AgentCloud",
      url: BASE_URL,
      logo: `${BASE_URL}/agentcloud.png`,
      description:
        "Deploy AI agents to automate your workflows, manage communications, and scale your operations — no code required.",
    },
    {
      "@type": "WebSite",
      url: BASE_URL,
      name: "AgentCloud",
      description:
        "AI agent platform that automates business workflows, support, sales, and operations.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/agents?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
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
