import type { Metadata } from "next";
import AppClientPage from "@/components/AppClientPage";
import { getLocale } from "@/lib/i18n/locale";
import { getClientPage } from "@/lib/i18n/appClients";
import { pageSeo } from "@/lib/seo";

/**
 * Pagina dedicata alla CLI: è lei a contenere installazione, login e comandi.
 * L'indice "App ed estensioni" (/apps) e le card della home rimandano qui.
 * Contenuti localizzati in `appClients.ts`.
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
