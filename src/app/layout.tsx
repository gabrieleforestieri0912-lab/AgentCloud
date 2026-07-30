/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://agentcloud.io";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "AgentCloud | AI Agents for Your Business",
    template: "%s | AgentCloud",
  },
  description:
    "AgentCloud is the intelligent platform that deploys AI agents to automate your workflows, manage communications, and scale your operations — no code required.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    siteName: "AgentCloud",
    title: "AgentCloud | AI Agents for Your Business",
    description:
      "Deploy AI agents to automate your workflows, manage communications, and scale your operations — no code required.",
    url: BASE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentCloud | AI Agents for Your Business",
    description:
      "Deploy AI agents to automate your workflows, manage communications, and scale your operations — no code required.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" data-scroll-behavior="smooth">
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
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
