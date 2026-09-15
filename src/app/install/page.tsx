import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstallClient from "./InstallClient";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Installa l'Ecosistema AgentCloud | CLI, Estensione Chrome e Mobile";
  const description =
    "Scarica e installa la CLI di AgentCloud per il terminale, aggiungi l'estensione Chrome per le automazioni browser o esegui l'app mobile Flutter.";
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
      <main className="min-h-screen">
        <InstallClient />
      </main>
      <Footer />
    </>
  );
}
