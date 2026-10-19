import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstallClient from "./InstallClient";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Installa la CLI di AgentCloud | Estensione, desktop e mobile in arrivo";
  const description =
    "Installa la CLI di AgentCloud con npm o curl e automatizza gli agenti da terminale. Estensione Chrome, app desktop e app mobile: l'anteprima di cosa arriverà.";
  const url = `${getSiteUrl()}/install`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
  };
}

export default function InstallPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-dvh">
        <InstallClient />
      </main>
      <Footer />
    </>
  );
}
