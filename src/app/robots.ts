import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

// robots.txt generato dinamicamente: permette l'indicizzazione del sito
// pubblico ma esclude le aree private (dashboard e API) dai motori di ricerca,
// e segnala la posizione della sitemap.


const BASE_URL = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
