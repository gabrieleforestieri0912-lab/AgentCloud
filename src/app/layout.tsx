/**
 * Layout radice dell'app: imposta lingua, metadati SEO (title/OG/Twitter),
 * dati strutturati JSON-LD e i provider globali (LanguageProvider + ThemeProvider).
 * L'html/lang segue la locale rilevata per richiesta, così ogni pagina eredita
 * gli stessi meta e lo stesso sfondo.
 * pagina eredita gli stessi meta e lo stesso sfondo.
 */
import type { Metadata, Viewport } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { CartProvider } from "@/components/CartProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppShortcuts from "@/components/AppShortcuts";
import KeyboardShortcutsProvider from "@/components/KeyboardShortcutsProvider";
import { themeInitScript } from "@/lib/theme-script";
import { getLocale, type Locale } from "@/lib/i18n/locale";
import { LOCALE_LABELS } from "@/lib/i18n/constants";
import { getSiteUrl } from "@/lib/site-url";
import { SUPPORT_EMAIL } from "@/lib/email-config";

/** next/font: gli stessi tre family e gli stessi pesi che il vecchio link a
 * fonts.googleapis.com effettivamente serviva (Inter 400-900, JetBrains Mono
 * 400/500/700/800, Manrope 400-800; il 900 di Manrope era richiesto ma mai
 * servito). Scaricati in build, file .woff2 self-hosted con `display: swap`:
 * niente CSS esterno blocking e la famiglia di fallback è metricamente
 * modificata (size-adjust), così il testo non si sposta quando il font vero
 * è pronto. Le classi di variabile giungono su `<html>` (in basso). */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--ff-inter",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  // Niente peso 900: il vecchio URL di Google Fonts lo richiedeva ma la
  // risposta di css2 non conteneva Manrope 900 (range valido 200-800); il
  // render reale usava il 800. next/font è rigido e rifiuterebbe il peso.
  weight: ["400", "500", "600", "700", "800"],
  variable: "--ff-manrope",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--ff-jetbrains-mono",
  display: "swap",
});
const FONT_VARIABLES = `${inter.variable} ${manrope.variable} ${jetbrainsMono.variable}`;

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
  es: {
    title: "AgentCloud | Agentes IA para tu empresa",
    description:
      "AgentCloud es la plataforma que despliega agentes IA para automatizar tus flujos de trabajo, gestionar comunicaciones y escalar operaciones — sin código.",
  },
  de: {
    title: "AgentCloud | KI-Agenten für dein Unternehmen",
    description:
      "AgentCloud ist die Plattform, die KI-Agenten bereitstellt, um Workflows zu automatisieren, Kommunikation zu verwalten und Operationen zu skalieren — ohne Code.",
  },
  fr: {
    title: "AgentCloud | Agents IA pour votre entreprise",
    description:
      "AgentCloud est la plateforme qui déploie des agents IA pour automatiser vos workflows, gérer les communications et scaler les opérations — sans code.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover: le pagine si estendono sotto le "notch"/barre di
  // sistema di iPhone; senza questa direttiva tutti gli
  // env(safe-area-inset-*) usati nel sito valgono zero (input e footer
  // incollati ai bordi arrotondati).
  viewportFit: "cover",
  // La tastiera di Chrome/Android rimpicciolisce il layout invece di
  // sovrapporsi: il composer della chat si solleva sopra la tastiera senza
  // JavaScript. (iOS lo fa già di suo: gestito lato chat con visualViewport.)
  interactiveWidget: "resizes-content",
  themeColor: "#0a0a0f",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const meta = META[locale];
  // Token di verifica di Google Search Console (metodo "tag HTML").
  // Valorizzando GOOGLE_SITE_VERIFICATION (o NEXT_PUBLIC_…) con il token del
  // proprio account il meta tag viene emesso in <head> su tutte le pagine:
  // è così che Google verifica la proprietà del dominio dell'home page
  // durante la revisione OAuth. Senza la variabile non viene emesso nulla.
  const siteVerification =
    process.env.GOOGLE_SITE_VERIFICATION ||
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const title = {
    default: meta.title,
    template: "%s | AgentCloud",
  };
  const description = meta.description;
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    // Il favicon è brand/favicon.png (quadrato nero arrotondato, logo
    // bianco): la versione in public/ è ridimensionata e ottimizzata da
    // quella sorgente. È l'immagine che Google mostra accanto ai risultati
    // di ricerca (legge il <link rel="icon"> della home): per aggiornarla
    // dopo un cambio serve un re-crawl della home da Search Console.
    icons: {
      icon: [
        { url: "/favicon.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      type: "website",
      siteName: "AgentCloud",
      title: meta.title,
      description,
      url: BASE_URL,
      locale: LOCALE_LABELS[locale]?.og ?? "en_US",
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
    ...(siteVerification
      ? { verification: { google: siteVerification } }
      : {}),
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
      email: SUPPORT_EMAIL,
      areaServed: [
        { "@type": "Country", name: "Italy" },
        "Worldwide",
      ],
      address: {
        "@type": "PostalAddress",
        addressCountry: "IT",
      },
      availableLanguage: ["it", "en", "es", "de", "fr"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        email: SUPPORT_EMAIL,
        areaServed: "Worldwide",
        availableLanguage: ["it", "en", "es", "de", "fr"],
      },
      // SameAs ancora l'entità per i motori generativi (ChatGPT, Perplexity,
      // Claude) e i knowledge graph tradizionali. Elencati solo profili reali
      // e verificabili.
      sameAs: [
        "https://github.com/gabrieleforestieri0912-lab/AgentCloud",
        "https://x.com/AgentCloud2k",
        "https://www.instagram.com/_agentcloud/",
        "https://www.linkedin.com/in/agent-cloud-323218431/",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "AgentCloud",
      description:
        "Piattaforma di agenti AI che automatizza workflow aziendali, supporto, vendite e operazioni.",
      inLanguage: ["it", "en", "es", "de", "fr"],
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
      availableLanguage: ["it", "en", "es", "de", "fr"],
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
    // `suppressHydrationWarning` è necessario: `themeInitScript` scrive la
    // classe del tema su <html> prima dell'idratazione, quindi il DOM non
    // coincide con il markup del server. Senza il flag React recupera
    // ri-renderizzando l'albero dal boundary, causando un lampo di tema
    // sbagliato e la perdita dello stato client. Vedi
    // node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={FONT_VARIABLES}
    >
      <head>
        {/* I font NON arrivano più dal CSS esterno di Google Fonts: era una
            risorsa render-blocking su ogni pagina. Ora sono self-hosted via
            next/font (le variabili --ff-* sono sul <html>, usate in
            globals.css): niente richiesta cross-origin bloccante e il
            fallback ha le metriche corrette, quindi niente rimescolamento
            al rilascio. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-black text-neutral-900 overflow-x-hidden">
        {/* Niente `key={locale}`: rimontare il provider a ogni cambio lingua
            azzererebbe lo stato client (conversazioni chat, scroll, menu) e
            ri-renderizzerebbe l'intero albero. Il provider cambia sul posto e
            chiama router.refresh() così i contenuti server si aggiornano. */}
        <LanguageProvider initialLocale={locale}>
          <ThemeProvider>
            <KeyboardShortcutsProvider>
              <CartProvider>{children}</CartProvider>
            </KeyboardShortcutsProvider>
          </ThemeProvider>
        </LanguageProvider>
        <AppShortcuts />
      </body>
    </html>
  );
}
