import type { Metadata } from "next";
import AppClientPage from "@/components/AppClientPage";
import { getLocale } from "@/lib/i18n/locale";
import { getClientPage } from "@/lib/i18n/appClients";
import { pageSeo } from "@/lib/seo";

/**
 * Pagina dedicata all'estensione browser. Il client non è ancora sugli store:
 * la pagina descrive come funzionerà e non offre download.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = getClientPage(locale, "extension");
  return pageSeo({
    title: content.metaTitle,
    description: content.metaDescription,
    path: "/extension",
    locale,
  });
}

export default async function ExtensionPage() {
  const locale = await getLocale();
  return (
    <AppClientPage
      slug="extension"
      content={getClientPage(locale, "extension")}
    />
  );
}
