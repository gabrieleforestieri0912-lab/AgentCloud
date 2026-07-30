import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Navbar from "@/components/Navbar";
import ChatInterface from "@/components/ChatInterface";

export const metadata: Metadata = {
  title: "Chat with AI",
  description:
    "Ask our AI to automate emails, support tickets, lead generation, social media, and more. Describe what you need and we'll build it.",
};

export default async function ChatPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const searchParams = await props.searchParams;
  const initialQuery = searchParams?.q;

  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <ChatInterface initialQuery={initialQuery} />
    </main>
  );
}
