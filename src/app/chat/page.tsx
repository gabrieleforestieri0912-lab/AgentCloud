import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChatInterface from "@/components/ChatInterface";
import { getLocale } from "@/lib/i18n/locale";
import { getSessionUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "it"
    ? {
        title: "Chatta con l'AI",
        description:
          "Chiedi alla nostra AI di automatizzare email, ticket di supporto, generazione lead, social media e altro. Descrivi cosa ti serve e lo costruiremo.",
      }
    : {
        title: "Chat with AI",
        description:
          "Ask our AI to automate emails, support tickets, lead generation, social media, and more. Describe what you need and we'll build it.",
      };
}

export default async function ChatPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const searchParams = await props.searchParams;
  const initialQuery = searchParams?.q;

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <ChatInterface initialQuery={initialQuery} />
    </main>
  );
}
