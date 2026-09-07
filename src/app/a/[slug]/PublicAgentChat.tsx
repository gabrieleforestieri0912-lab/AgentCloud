"use client";

// Chat pubblica embeddabile di un agente (pagina /a/[slug]): streaming SSE su
// /api/agent/run, allegati (drag&drop, +, incolla) e rendering markdown.
// È il punto di prova dell'agente per i visitatori non autenticati.
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import MarkdownText from "@/components/MarkdownText";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/email-config";
import { t } from "@/lib/i18n/dictionaries";
import {
  AttachPlusButton,
  AttachmentChips,
  DropHint,
  chatAttachLabels,
  useChatAttachments,
} from "@/components/ChatAttachments";
import { composeUserContent, toFilesMap } from "@/lib/chat-attachments";
import type { ChatAttachment } from "@/lib/chat-attachments";

type Message = {
  role: "user" | "assistant";
  content: string;
  // Allegati inviati dall'utente con questo messaggio (anteprime / chip file).
  attachments?: Pick<ChatAttachment, "id" | "name" | "kind" | "previewUrl">[];
  // File prodotti dall'assistente tramite gli strumenti (es. documenti generati).
  files?: { filename: string; content: string }[];
  // Bolla di errore: mostra il testo del fallimento più un link di contatto.
  error?: boolean;
};

type Props = {
  slug: string;
  name: string;
  description: string;
};

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function PublicAgentChat({ slug, name, description }: Props) {
  const { dict } = useLanguage();
  const attachLabels = chatAttachLabels(dict);
  const attach = useChatAttachments();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Auto-scroll solo quando l'utente è in fondo: scroll diretto del contenitore
  // (istantaneo) — uno smooth scrollIntoView ripartirebbe a ogni parola in
  // streaming e combatterebbe il dito sul mobile.
  const stickToBottom = useRef(true);

  const handleMessagesScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const scrollToBottom = useCallback(() => {
    const el = messagesRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Aggiorna l'ultimo messaggio dell'assistente in modo immutabile. Mutare gli
  // oggetti messaggio dentro l'updater raddoppierebbe l'append in React
  // StrictMode (dev), che invoca gli updater due volte.
  const updateLastAssistant = (fn: (last: Message) => Message) =>
    setMessages((prev) =>
      prev.map((m, i) =>
        i === prev.length - 1 && m.role === "assistant" ? fn(m) : m,
      ),
    );

  const sendMessage = async () => {
    const pending = attach.attachments;
    if ((!input.trim() && pending.length === 0) || isRunning) return;

    // Il corpo completo (contenuti file inclusi) va all'API così l'agente può
    // leggere gli allegati; la bolla visibile conserva solo il testo più i chip
    // di anteprima compatti, non i dump grezzi dei file.
    const userContent = composeUserContent(input, pending);
    const filesMap = toFilesMap(pending);
    const displayContent =
      input.trim() || pending.map((a) => a.name).join(", ");
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

      // L'endpoint risponde in JSON per gli errori (agente non trovato,
      // abbonamento richiesto, limite mensile raggiunto, rate limit). Li
      // mostriamo invece di restare appesi a uno stream vuoto.
      if (!res.ok) {
        let message = dict.publicChat.somethingWentWrong;
        try {
          const data = await res.json();
          if (data && typeof data.error === "string") message = data.error;
        } catch {
          // ignora corpi di errore malformati
        }
        updateLastAssistant((last) => ({
          ...last,
          content: `\n\n⚠️ ${message}`,
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
              files: [
                ...(last.files || []),
                { filename: data.filename, content: data.content },
              ],
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
              content: last.content + `\n\n⚠️ ${data.message}`,
              error: true,
            }));
            setIsRunning(false);
          }
        }
      }
    } catch {
      updateLastAssistant((last) => ({
        ...last,
        content: last.content + `\n\n⚠️ ${dict.publicChat.connectionError}`,
        error: true,
      }));
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = (picked: FileList | null) => {
    void attach.addFiles(picked, attachLabels);
  };

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col">
      <header className="border-b border-white/5 bg-neutral-900/50 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-linear-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{name}</h1>
            <p className="text-xs text-neutral-500">
              {dict.publicChat.poweredBy}{" "}<span className="text-brand-400">AgentCloud</span>
            </p>
          </div>
        </div>
        <a
          href="/chat"
          className="text-xs text-neutral-500 hover:text-brand-400 transition-colors hidden sm:flex items-center gap-1.5"
        >
          <MessageSquare size={12} />
          AgentCloud
        </a>
      </header>

      <div
        ref={messagesRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 max-w-4xl mx-auto w-full"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 bg-linear-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 mb-5">
              <Bot size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{name}</h2>
            <p className="text-sm text-neutral-400 max-w-md">{description}</p>
            <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-neutral-900 rounded-full border border-white/5">
              <Sparkles size={14} className="text-brand-400" />
              <span className="text-xs text-neutral-500">
                {dict.publicChat.askMe}
              </span>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "justify-end" : ""
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/10">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] sm:max-w-[70%]`}
              >
                {msg.role === "user" && (
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="text-[10px] text-neutral-600">
                      {formatTime(new Date())}
                    </span>
                  </div>
                )}
                <div
                  className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-brand-500 text-white rounded-2xl rounded-br-md shadow-lg shadow-brand-500/20"
                      : "bg-neutral-800 border border-white/5 text-neutral-200 rounded-2xl rounded-bl-md"
                  }`}
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
                                  alt={file.name}
                                  className="max-h-28 max-w-35 rounded-lg object-cover"
                                />
                              ) : (
                                <span
                                  key={file.id}
                                  className="inline-flex items-center rounded-lg bg-white/15 px-2 py-1 text-[11px]"
                                >
                                  {file.name}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                      </>
                    )
                  ) : (isRunning && i === messages.length - 1 ? (
                    <span className="flex gap-1.5 items-center h-5">
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "400ms" }} />
                    </span>
                  ) : null)}
                  {msg.role === "assistant" && msg.error && (
                    <a
                      href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 underline decoration-brand-400/40 underline-offset-2 hover:text-brand-300 transition-colors"
                    >
                      ✉️ {dict.common.contactSupport}
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
            removeLabel={(name) =>
              dict.chat.removeAttachment.replace("{name}", name)
            }
          />
          {attach.notice && (
            <p className="mb-2 text-xs text-amber-400">{attach.notice}</p>
          )}
          <div className="flex items-end gap-2 bg-neutral-800 rounded-2xl border border-white/5 px-3 py-3 focus-within:border-brand-500/50 focus-within:shadow-lg focus-within:shadow-brand-500/5 transition-all">
            <AttachPlusButton
              labels={attachLabels}
              disabled={isRunning}
              onPick={handleFileUpload}
            />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={attach.makePaste(attachLabels)}
              placeholder={t(dict.publicChat.messagePlaceholder, { name })}
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 resize-none outline-none min-h-6 max-h-30 leading-relaxed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
              disabled={isRunning}
            />
            <button
              onClick={sendMessage}
              disabled={
                (!input.trim() && attach.attachments.length === 0) || isRunning
              }
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-500 text-white hover:bg-brand-400 disabled:bg-neutral-700 disabled:text-neutral-500 transition-all shrink-0 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <div className="flex items-center justify-end mt-2">
            <p className="text-[10px] text-neutral-600">
              {dict.publicChat.poweredBy} AgentCloud
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
