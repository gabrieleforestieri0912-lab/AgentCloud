import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";
import { getLocale } from "@/lib/i18n/locale";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const locale = await getLocale();
  const user = await getSessionUser();
  const hasAccess = await hasPlatformAccess();
  if (!user && !hasAccess) redirect("/login");
  const isMock = !user && hasAccess;
  const email = isMock ? "admin@agentcloud.agency" : (user?.email ?? "");

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader variant="dashboard" subtitle={email} />
      <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <SettingsClient locale={locale} isMock={isMock} email={email} />
        </div>
      </section>
      <Footer />
    </main>
  );
}
