import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    // Su Cloudflare Workers (OpenNext) l'ottimizzazione immagini di Next
    // girerebbe nel Worker: ogni `/_next/image` brucia CPU di ridimensionamento
    // sul piano free (limite 10 ms) e causa il 1102. Serviamo le immagini
    // originali: la resa visiva è identica e gli host listati sotto sono tutti
    // già ottimizzati alla fonte.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async redirects() {
    return [
      // La pagina "generale" /install è stata eliminata: le informazioni di
      // ogni client stanno nella sua pagina dedicata. I vecchi link finiscono
      // sull'indice "App ed estensioni" invece di diventare un 404.
      { source: "/install", destination: "/apps", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Il pannello dell'app Shopify gira in un iframe dell'amministratore:
        // solo l'admin Shopify (e il negozio stesso) può incapsularlo.
        // Solo `frame-ancestors`: non limitiamo gli script, altrimenti
        // bloccherei l'idratazione di Next.js.
        source: "/shopify",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors https://admin.shopify.com https://*.myshopify.com",
          },
        ],
      },
      {
        source: "/shopify/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors https://admin.shopify.com https://*.myshopify.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
