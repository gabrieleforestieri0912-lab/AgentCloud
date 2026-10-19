import type { Metadata } from "next";
import AppClientPage from "@/components/AppClientPage";
import { getLocale } from "@/lib/i18n/locale";
import { getClientPage } from "@/lib/i18n/appClients";
import { pageSeo } from "@/lib/seo";

/**
 * Pagina dedicata all'app desktop. Ancora in sviluppo: nessun download
 * pubblicato finché la build non è firmata, quindi la pagina si limita a
 * spiegare come arriverà.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = getClientPage(locale, "desktop");
  return pageSeo({
    title: content.metaTitle,
    description: content.metaDescription,
    path: "/desktop",
    locale,
  });
}

export default async function DesktopPage() {
  const locale = await getLocale();
  return (
    <AppClientPage slug="desktop" content={getClientPage(locale, "desktop")} />
  );
}
