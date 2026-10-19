import type { Metadata } from "next";
import AppClientPage from "@/components/AppClientPage";
import { getLocale } from "@/lib/i18n/locale";
import { getClientPage } from "@/lib/i18n/appClients";
import { pageSeo } from "@/lib/seo";

/**
 * Pagina dedicata alla CLI: la scheda di `/install` rimanda qui invece di
 * aprire un tab nella pagina unica. Contenuti localizzati in `appClients.ts`.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = getClientPage(locale, "cli");
  return pageSeo({
    title: content.metaTitle,
    description: content.metaDescription,
    path: "/cli",
    locale,
  });
}

export default async function CliPage() {
  const locale = await getLocale();
  return <AppClientPage slug="cli" content={getClientPage(locale, "cli")} />;
}
