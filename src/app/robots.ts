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
      // /shopify è il pannello incapsulato nell'admin Shopify: non ha senso
      // indicizzarlo (si vede solo dentro l'amministratore).
      disallow: ["/dashboard", "/shopify", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
