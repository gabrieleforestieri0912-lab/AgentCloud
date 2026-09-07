import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { hasPlatformAccess } from "@/lib/access-code";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SettingsClient from "./settings-client";

// Pagina impostazioni: server component che protegge la rotta (sessione o
// codice di accesso), distingue l'utente mock (admin via codice) da quello
// reale e delega la UI interattiva a SettingsClient.
export default async function SettingsPage() {
  const user = await getSessionUser();
  const hasAccess = await hasPlatformAccess();
  if (!user && !hasAccess) redirect("/login");
  const isMock = !user && hasAccess;
  const email = isMock ? "admin@agentcloud.agency" : (user?.email ?? "");

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <section className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <SettingsClient isMock={isMock} email={email} />
        </div>
      </section>
      <Footer />
    </main>
  );
}
