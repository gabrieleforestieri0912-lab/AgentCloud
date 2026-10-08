import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { AGENTS } from "@/lib/agents";
import { SKILL_PLUGINS } from "@/lib/skills/catalog";
import { hasLaunched } from "@/lib/waitlist-constants";

const BASE_URL = getSiteUrl();

// Sitemap.xml generato a runtime: elenca le rotte statiche principali più una
// voce per ogni agente pubblicato, così ogni pagina prodotto è indicizzabile.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/agents`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/chat`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // La waitlist va indicizzata solo prima del lancio: dopo, /waitlist
    // reindirizza alla home e non deve più comparire nel sitemap.
    ...(!hasLaunched()
      ? [
          {
            url: `${BASE_URL}/waitlist`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.6,
          },
        ]
      : []),
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/integrations`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/skills`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      // Guida "Crea la tua competenza": arriva dal catalogo, quindi è
      // indicizzabile insieme a `/skills`.
      url: `${BASE_URL}/docs/skills`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/mobile`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/install`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.1,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.1,
    },
    {
      url: `${BASE_URL}/refunds`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.1,
    },
  ];

  // Ogni agente pubblicato ha la propria URL canonica indicizzabile.
  const agentRoutes: MetadataRoute.Sitemap = AGENTS.map((agent) => ({
    url: `${BASE_URL}/agents/${agent.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Ogni pagina plugin è una URL autonoma: il catalogo è parte dell'offerta
  // e va indicizzato, non nascosto dietro la griglia.
  const skillPluginRoutes: MetadataRoute.Sitemap = SKILL_PLUGINS.map((plugin) => ({
    url: `${BASE_URL}/skills/${plugin.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Le pagine agente espongono la tab Competenze: già coperte dalle rotte
  // agente qui sotto, quindi nessuna voce aggiuntiva.

  return [...staticRoutes, ...agentRoutes, ...skillPluginRoutes];
}
