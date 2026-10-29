import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Eye, Link2Off } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarkdownText from "@/components/MarkdownText";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidShareToken, type SharedSnapshot } from "@/lib/chat-share";
import { pageSeo } from "@/lib/seo";

// Pagina pubblica /chat/shared/[token]: la conversazione condivisa in SOLA
// LETTURA. Niente input, niente azioni, niente login richiesto: solo il testo
// congelato al momento della condivisione. I link condivisi non devono finire
// nei motori di ricerca (noindex).
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    ...pageSeo({ title: dict.chat.shareSharedTitle, description: dict.chat.shareSharedSubtitle, path: "/chat", locale }),
    robots: { index: false, follow: false },
  };
}

function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default async function SharedChatPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);

  // Link revocato o mai esistito: stessa pagina di cortesia in entrambi i casi
  // (non si rivela quali token sono esistiti).
  const expired = (
    <main className="relative min-h-dvh bg-neutral-950">
      <Navbar />
      <section className="mx-auto max-w-md px-4 pb-20 pt-32 text-center sm:px-6">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-neutral-500">
          <Link2Off size={20} />
        </span>
        <h1 className="mt-4 text-xl font-bold text-white">{dict.chat.shareSharedTitle}</h1>
        <p className="mt-2 text-sm text-neutral-400">{dict.chat.shareExpired}</p>
        <Link
          href="/agents"
          className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100 transition-all"
        >
          {dict.chat.shareCta}
        </Link>
      </section>
      <Footer />
    </main>
  );

  if (!isValidShareToken(token)) return expired;

  const admin = createAdminClient();
  const { data } = admin
    ? await admin
        .from("shared_chats")
        .select("title, snapshot")
        .eq("token", token)
        .maybeSingle()
    : { data: null };
  if (!data) return expired;

  const snapshot = (data as { title: string; snapshot: SharedSnapshot }).snapshot;
  const messages = Array.isArray(snapshot?.messages) ? snapshot.messages : [];
  const title = typeof snapshot?.title === "string" && snapshot.title
    ? snapshot.title
    : (data as { title: string }).title;

  return (
    <main className="relative min-h-dvh bg-neutral-950">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <div className="mb-6 text-center">
          <div className="mb-4 flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/5">
            <Image src="/agentcloud.png" alt="AgentCloud" width={28} height={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-neutral-300">
            <Eye size={12} />
            {dict.chat.shareReadOnly} · {messages.length} {dict.chat.shareMessageCount}
          </p>
        </div>

        <div className="space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <Image
                  src="/agentcloud.png"
                  alt=""
                  width={28}
                  height={28}
                  className="mt-0.5 h-7 w-7 shrink-0"
                />
              )}
              <div className={msg.role === "user" ? "order-1 max-w-[85%]" : "max-w-[85%] w-full"}>
                {msg.role === "assistant" && msg.agentName && (
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    {msg.agentName}
                  </p>
                )}
                <div
                  className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "whitespace-pre-wrap bg-white/5 text-white rounded-2xl rounded-br-md border border-white/5"
                      : "text-neutral-200"
                  }`}
                >
                  {msg.role === "assistant" ? <MarkdownText text={msg.content} /> : msg.content}
                </div>
                {msg.created_at && (
                  <p className={`text-[10px] text-neutral-600 mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                    {formatTime(msg.created_at)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-neutral-400">{dict.chat.shareSharedSubtitle}</p>
          <Link
            href="/agents"
            className="mt-4 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100 transition-all"
          >
            {dict.chat.shareCta}
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
