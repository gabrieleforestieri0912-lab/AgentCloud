import type { Metadata } from "next";
import EmbeddedApp from "./embedded-app";
import { getLocale } from "@/lib/i18n/locale";
import { getShopifyAppContent } from "@/lib/i18n/shopifyApp";
import { pageSeo } from "@/lib/seo";

/**
 * `/shopify` — il pannello dell'app dentro l'amministratore Shopify.
 *
 * Perché una rotta dedicata: `application_url` in `shopify.app.toml` è
 * l'URL che Shopify incapsula in un iframe nell'admin. Serviva quindi
 * l'interfaccia dell'app (non la landing di marketing): qui il merchant
 * vede il suo negozio verificato e i passi per attivare l'embed.
 *
 * Shopify aggiunge ai parametri `shop`, `host`, `embedded=1` e `id_token`.
 * Il pannello usa `embedded` per capire se è dentro l'admin e chiede un
 * **session token** ad App Bridge: quello, e non i parametri, è ciò che
 * il server verifica.
 *
 * Server component: i testi arrivano localizzati e passati al client come
 * props, così nel bundle non finisce nessun dizionario.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = getShopifyAppContent(locale);
  return pageSeo({
    title: content.metaTitle,
    description: content.metaDescription,
    path: "/shopify",
    locale,
  });
}

export default async function ShopifyAppPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const params = (await searchParams) ?? {};
  const embeddedParam = params.embedded;
  const shopParam = params.shop;

  return (
    <EmbeddedApp
      content={getShopifyAppContent(locale)}
      embedded={
        embeddedParam === "1" ||
        embeddedParam === "true" ||
        (Array.isArray(embeddedParam) &&
          (embeddedParam[0] === "1" || embeddedParam[0] === "true"))
      }
      shopParam={typeof shopParam === "string" ? shopParam : ""}
    />
  );
}
