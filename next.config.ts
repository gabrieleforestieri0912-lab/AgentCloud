import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  images: {
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
};

export default nextConfig;
