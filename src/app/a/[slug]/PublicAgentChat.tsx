"use client";

// Chat pubblica embeddabile di un agente (pagina /a/[slug]): streaming SSE su
// /api/agent/run, allegati (drag&drop, +, incolla) e rendering markdown.
// Ora con anteprima densa (marketplace pro): header info, KPI, transcript
// preview e prompt di esempio quando non ci sono messaggi.
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  FileText,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Plug,
  ShieldCheck,
  ArrowRight,
  Clock3,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import MarkdownText from "@/components/MarkdownText";
import AgentIcon from "@/components/AgentIcon";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/email-config";
import { t } from "@/lib/i18n/dictionaries";
import {
  AttachPlusButton,
  AttachmentChips,
  DropHint,
  chatAttachLabels,
  useChatAttachments,
} from "@/components/ChatAttachments";
import { buildVisionText, composeUserContent, toFilesMap, toVisionBlocks } from "@/lib/chat-attachments";
import type { ChatAttachment } from "@/lib/chat-attachments";
import SubscribePaywallModal from "@/components/SubscribePaywallModal";
import type { Agent } from "@/lib/agents";
import type { getDetailEnrichment } from "@/lib/agents/agent-detail-enrichment";

type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: Pick<ChatAttachment, "id" | "name" | "kind" | "previewUrl">[];
  files?: { filename: string; content: string }[];
  error?: boolean;
};

type Props = {
  slug: string;
  name: string;
  description: string;
  agent?: Agent | null;
  enrichment?: ReturnType<typeof getDetailEnrichment> | null;
};

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function PublicAgentChat({ slug, name, description, agent, enrichment }: Props) {
  const { dict, locale } = useLanguage();
  const attachLabels = chatAttachLabels(dict);
  const attach = useChatAttachments();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const isIt = locale === "it";

  const handleMessagesScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const scrollToBottom = useCallback(() => {
    const el = messagesRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const updateLastAssistant = (fn: (last: Message) => Message) =>
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 && m.role === "assistant" ? fn(m) : m)));

  const FREE_LIMIT = 4;
  const usedCount = messages.filter((m) => m.role === "user").length;
  const isLimitReached = usedCount >= FREE_LIMIT;

  const sendMessage = async (overrideText?: string) => {
    const text = overrideText ?? input;
    const pending = attach.attachments;
    if ((!text.trim() && pending.length === 0) || isRunning) return;
    if (isLimitReached) {
      setPaywallOpen(true);
      return;
    }

    const apiText = composeUserContent(text, pending);
    const visionBlocks = toVisionBlocks(pending);
    const hasImages = visionBlocks.length > 0;
    const visionText = buildVisionText(apiText, hasImages);
    const userContent: unknown = hasImages
      ? ([{ type: "text" as const, text: visionText }, ...visionBlocks] as unknown)
      : apiText;
    const displayContent =
      text.trim() || (pending.length > 0 ? (pending.some((a) => a.kind === "image") ? "Immagine allegata" : "File allegato") : "");
    const filesMap = toFilesMap(pending.filter((a) => a.kind !== "image"));
    setInput("");
    attach.clear();
    setIsRunning(true);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: displayContent,
        attachments: pending.map((a) => ({
          id: a.id,
          name: a.name,
          kind: a.kind,
          previewUrl: a.previewUrl,
        })),
      },
      { role: "assistant", content: "", files: [] },
    ]);

    const apiMessages = [
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: userContent },
    ];

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: slug,
          messages: apiMessages,
          files: Object.keys(filesMap).length > 0 ? filesMap : undefined,
        }),
      });

      if (!res.ok) {
        let message = dict.publicChat.somethingWentWrong;
        let code: string | null = null;
        try {
          const data = await res.json();
          if (data && typeof data.error === "string") message = data.error;
          if (data && typeof data.code === "string") code = data.code;
        } catch {}
        if (code === "FREE_LIMIT_REACHED") setPaywallOpen(true);
        updateLastAssistant((last) => ({
          ...last,
          content: `\n\n${message}`,
          error: true,
        }));
        setIsRunning(false);
        return;
      }

      if (!res.body) {
        setIsRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.type === "text") {
            updateLastAssistant((last) => ({
              ...last,
              content: last.content + data.content,
            }));
          }
          if (data.type === "file") {
            updateLastAssistant((last) => ({
              ...last,
              files: [...(last.files || []), { filename: data.filename, content: data.content }],
            }));
          }
          if (data.type === "done") {
            setIsRunning(false);
            try {
              window.dispatchEvent(new CustomEvent("agentcloud:notifications-refresh"));
            } catch {}
          }
          if (data.type === "error") {
            updateLastAssistant((last) => ({
              ...last,
              content: last.content + `\n\n${data.message}`,
              error: true,
            }));
            setIsRunning(false);
          }
        }
      }
    } catch {
      updateLastAssistant((last) => ({
        ...last,
        content: last.content + `\n\n${dict.publicChat.connectionError}`,
        error: true,
      }));
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handleFileUpload = (picked: FileList | null) => {
    void attach.addFiles(picked, attachLabels);
  };

  const samplePrompts = enrichment?.transcript.filter((t) => t.role === "user").map((t) => t.text).slice(0, 3) ?? [];
  const kpis = enrichment?.kpis.slice(0, 4) ?? [];

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col">
      <header className="border-b border-white/5 bg-neutral-900/50 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{name}</h1>
            <p className="text-xs text-neutral-500">
              {dict.publicChat.poweredBy} <span className="text-brand-400">AgentCloud</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {agent && (
            <Link
              href={`/agents/${slug}`}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 hover:bg-white/10"
            >
              {isIt ? "Scheda completa" : "View details"} <ArrowRight size={12} />
            </Link>
          )}
          <a
            href="/chat"
            className="text-xs text-neutral-500 hover:text-brand-400 transition-colors hidden sm:flex items-center gap-1.5"
          >
            <MessageSquare size={12} />
            AgentCloud
          </a>
        </div>
      </header>

      {/* Agent rail — sempre visibile quando abbiamo dati, così la pagina non è mai vuota */}
      {agent && enrichment && (
        <div className="border-b border-white/5 bg-neutral-900/30 px-4 sm:px-6 py-4">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3 min-w-0">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${agent.accent}`}>
                  <AgentIcon icon={agent.icon} brand={agent.brand} size={22} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-300">{agent.category}</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-semibold text-neutral-400">{agent.badgeLabel ?? agent.badge}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500">
                      <Clock3 size={11} /> {agent.setupTime}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-5 text-neutral-300 line-clamp-2 max-w-xl">{description}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {agent.integrations.map((l) => (
                      <span key={l} className="rounded-full border border-white/10 bg-neutral-900 px-2 py-0.5 text-xs font-semibold text-neutral-400">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="text-lg font-bold leading-none text-white">{agent.price}<span className="text-xs font-semibold text-neutral-500">/mo</span></p>
                <Link href={`/agents/${slug}`} className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-400">
                  {isIt ? "Vedi prezzo & dettagli" : "See pricing"}
                </Link>
              </div>
            </div>
            {kpis.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {kpis.map((k) => (
                  <div key={k.label} className="rounded-xl border border-white/5 bg-neutral-900 px-3 py-2.5">
                    <p className="text-sm font-bold leading-none text-white">{k.value}</p>
                    <p className="text-xs font-bold text-neutral-300">{k.label}</p>
                    <p className="text-[11px] font-semibold text-neutral-500">{k.sub}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        ref={messagesRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 max-w-4xl mx-auto w-full"
      >
        {messages.length === 0 ? (
          <div className="space-y-6 py-2">
            {/* Hero vuoto — non solo icona */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Bot size={28} className="text-white" />
              </div>
              <h2 className="mt-3 text-lg font-bold text-white">{name}</h2>
              <p className="mt-1 text-sm text-neutral-400 max-w-md">{description}</p>
              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-neutral-900 rounded-full border border-white/5">
                <Sparkles size={12} className="text-brand-400" />
                <span className="text-xs font-semibold text-neutral-500">{dict.publicChat.askMe}</span>
              </div>
            </div>

            {/* Sample prompts — riempie lo spazio, rende marketplace usabile */}
            {samplePrompts.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">
                  {isIt ? "Prova questi prompt" : "Try these prompts"}
                </p>
                <div className="grid gap-2 sm:grid-cols-1">
                  {samplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => void sendMessage(prompt)}
                      className="text-left rounded-xl border border-white/5 bg-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-200 hover:border-brand-500/30 hover:bg-neutral-800 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare size={13} className="text-brand-400 shrink-0" />
                        {prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Capabilities + integrations side-by-side */}
            {agent && enrichment && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-neutral-900 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-neutral-500">
                    <CheckCircle2 size={12} className="text-brand-400" /> {isIt ? "Cosa fa" : "What it does"}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {agent.tasks.slice(0, 4).map((t) => (
                      <li key={t} className="flex gap-2 text-sm font-semibold text-neutral-300">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/agents/${slug}`} className="mt-3 inline-flex text-xs font-bold text-brand-400 hover:text-brand-300">
                    {isIt ? "Tutto su questo agente →" : "Full details →"}
                  </Link>
                </div>
                <div className="rounded-xl border border-white/5 bg-neutral-900 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-neutral-500">
                    <Plug size={12} className="text-purple-400" /> {isIt ? "Integrazioni" : "Integrations"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {agent.integrations.map((l) => (
                      <span key={l} className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-neutral-300">
                        {l}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
                    <ShieldCheck size={12} className="text-emerald-400" /> {isIt ? "OAuth sicuro · revoca 1-click" : "Secure OAuth · 1-click revoke"}
                  </p>
                  <p className="mt-1 text-xs leading-4 text-neutral-500">
                    {isIt ? "Token cifrati, nessun segreto nel client. Log auditabili." : "Encrypted tokens, no secrets in client. Auditable logs."}
                  </p>
                </div>
              </div>
            )}

            {/* Mini transcript preview — mostra come lavora */}
            {enrichment?.transcript && enrichment.transcript.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-neutral-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">{isIt ? "Anteprima conversazione" : "Conversation preview"}</p>
                  <span className="text-xs font-semibold text-neutral-500">{isIt ? "Esempio reale" : "Real example"}</span>
                </div>
                <div className="p-4 space-y-2 bg-neutral-950/50">
                  {enrichment.transcript.slice(0, 2).map((turn, i) => (
                    <div key={i} className={`flex gap-2 ${turn.role === "user" ? "justify-end" : ""}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${turn.role === "user" ? "bg-brand-500 text-white rounded-br-md" : "bg-neutral-800 border border-white/5 text-neutral-200 rounded-bl-md"}`}
                      >
                        {turn.text}
                        {turn.meta && <p className="mt-1 font-mono text-[11px] opacity-60">↳ {turn.meta}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security strip */}
            <div className="rounded-xl border border-white/5 bg-neutral-900 px-4 py-3 flex flex-wrap gap-3 text-xs font-semibold text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" /> GDPR
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" /> AES-256-GCM
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" /> SOC 2
              </span>
              <span className="ml-auto">
                <Link href="/privacy" className="underline decoration-white/20 underline-offset-2">
                  Privacy
                </Link>{" "}
                ·{" "}
                <Link href="/terms" className="underline decoration-white/20 underline-offset-2">
                  Termini
                </Link>
              </span>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/10">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div className={`max-w-[80%] sm:max-w-[70%]`}>
                {msg.role === "user" && (
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="text-[10px] text-neutral-600">{formatTime(new Date())}</span>
                  </div>
                )}
                <div
                  className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-brand-500 text-white rounded-2xl rounded-br-md shadow-lg shadow-brand-500/20" : "bg-neutral-800 border border-white/5 text-neutral-200 rounded-2xl rounded-bl-md"}`}
                >
                  {msg.content ? (
                    msg.role === "assistant" ? (
                      <MarkdownText text={msg.content} />
                    ) : (
                      <>
                        {msg.content}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.attachments.map((file) =>
                              file.kind === "image" && file.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={file.id}
                                  src={file.previewUrl}
                                  alt={file.name || "Immagine allegata"}
                                  className="max-h-28 max-w-[140px] rounded-lg object-cover border border-white/10"
                                  loading="lazy"
                                />
                              ) : (
                                <span key={file.id} className="inline-flex items-center rounded-lg bg-white/15 px-2 py-1 text-[11px]">
                                  {file.name}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                      </>
                    )
                  ) : isRunning && i === messages.length - 1 ? (
                    <span className="flex gap-1.5 items-center h-5">
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "400ms" }} />
                    </span>
                  ) : null}
                  {msg.role === "assistant" && msg.error && (
                    <a
                      href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 underline decoration-brand-400/40 underline-offset-2 hover:text-brand-300 transition-colors"
                    >
                      {dict.common.contactSupport}
                    </a>
                  )}
                  {msg.files && msg.files.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                      {msg.files.map((file, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <FileText size={12} className="text-brand-400" />
                          <span className="text-neutral-300">{file.filename}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-neutral-700 flex items-center justify-center shrink-0">
                  <User size={14} className="text-white" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div
        className="border-t border-white/5 bg-neutral-900/80 backdrop-blur-sm px-4 sm:px-6 py-4"
        onDragEnter={attach.onDragEnter}
        onDragOver={attach.onDragOver}
        onDragLeave={attach.onDragLeave}
        onDrop={attach.makeDrop(attachLabels)}
      >
        <div className="max-w-4xl mx-auto relative">
          <DropHint visible={attach.dragOver} text={attachLabels.dropHint} />
          <AttachmentChips
            items={attach.attachments}
            onRemove={attach.remove}
            removeLabel={(name) => dict.chat.removeAttachment.replace("{name}", name)}
          />
          {attach.notice && <p className="mb-2 text-xs text-amber-400">{attach.notice}</p>}
          {isLimitReached ? (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
              <p className="text-xs font-semibold text-amber-300">
                {t(dict.paywallModal.remaining, { count: String(usedCount) })} — {dict.paywallModal.limitReached}
              </p>
              <button onClick={() => setPaywallOpen(true)} className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white hover:bg-amber-400">
                {dict.paywallModal.subscribe}
              </button>
            </div>
          ) : usedCount > 0 ? (
            <p className="mb-2 text-xs text-neutral-500">{t(dict.paywallModal.remaining, { count: String(usedCount) })}</p>
          ) : null}
          <div className="flex items-end gap-2 bg-neutral-800 rounded-2xl border border-white/5 px-3 py-3 focus-within:border-brand-500/50 focus-within:shadow-lg focus-within:shadow-brand-500/5 transition-all">
            <AttachPlusButton labels={attachLabels} disabled={isRunning || isLimitReached} onPick={handleFileUpload} />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={attach.makePaste(attachLabels)}
              placeholder={isLimitReached ? dict.paywallModal.limitReached : t(dict.publicChat.messagePlaceholder, { name })}
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 resize-none outline-none min-h-6 max-h-30 leading-relaxed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
              disabled={isRunning || isLimitReached}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={(!input.trim() && attach.attachments.length === 0) || isRunning || isLimitReached}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-500 text-white hover:bg-brand-400 disabled:bg-neutral-700 disabled:text-neutral-500 transition-all shrink-0 disabled:cursor-not-allowed"
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <div className="flex items-center justify-end mt-2">
            <p className="text-[10px] text-neutral-600">{dict.publicChat.poweredBy} AgentCloud</p>
          </div>
        </div>
      </div>
      <SubscribePaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} agentName={name} agentSlug={slug} />
    </div>
  );
}
