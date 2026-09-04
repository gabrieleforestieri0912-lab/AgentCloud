"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Send,
  Bot,
  User,
  Cloud,
  Sparkles,
  Loader2,
  FileText,
} from "lucide-react";
import { getAgentRuntimeConfig } from "@/lib/agents/registry";
import { useLanguage } from "@/components/LanguageProvider";
import MarkdownText from "@/components/MarkdownText";
import { t } from "@/lib/i18n/dictionaries";

type StreamEvent =
  | { type: "text"; content: string }
  | { type: "tool_start"; toolName: string; toolInput: Record<string, string> }
  | { type: "tool_done"; toolName: string }
  | { type: "file"; filename: string; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

type Message = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; status: "running" | "done" }[];
  files?: { filename: string; content: string }[];
};

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AgentChatPage() {
  const params = useParams<{ id: string }>();
  const { dict } = useLanguage();
  const agent = getAgentRuntimeConfig(params.id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [files, setFiles] = useState<Record<string, string>>({});
  const messagesRef = useRef<HTMLDivElement>(null);
  // Auto-scroll only while the user is at the bottom, scrolling the container
  // directly (instant) — smooth scrollIntoView restarts on every streamed
  // word and fights the finger on mobile.
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

  // Append to the last assistant message with an immutable update. Mutating
  // the stored message objects inside the updater would double-append under
  // React StrictMode (dev), which invokes updater functions twice.
  const updateLastAssistant = (fn: (last: Message) => Message) =>
    setMessages((prev) =>
      prev.map((m, i) =>
        i === prev.length - 1 && m.role === "assistant" ? fn(m) : m,
      ),
    );

  const sendMessage = async () => {
    if (!input.trim() || isRunning || !agent) return;

    const userContent = input;
    setInput("");
    setIsRunning(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userContent },
      { role: "assistant", content: "", toolCalls: [] },
    ]);

    const apiMessages = [
      ...messages,
      { role: "user" as const, content: userContent },
    ].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: params.id,
          messages: apiMessages,
          files: Object.keys(files).length > 0 ? files : undefined,
          userId: "anonymous",
        }),
      });

      if (!res.body) return;

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
          const data: StreamEvent = JSON.parse(line.slice(6));

          if (data.type === "text") {
            updateLastAssistant((last) => ({
              ...last,
              content: last.content + data.content,
            }));
          }

          if (data.type === "tool_start") {
            updateLastAssistant((last) => ({
              ...last,
              toolCalls: [
                ...(last.toolCalls || []),
                { name: data.toolName, status: "running" },
              ],
            }));
          }

          if (data.type === "tool_done") {
            updateLastAssistant((last) => ({
              ...last,
              toolCalls: last.toolCalls?.map((t) =>
                t.name === data.toolName ? { ...t, status: "done" } : t,
              ),
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
          }

          if (data.type === "error") {
            updateLastAssistant((last) => ({
              ...last,
              content: last.content + `\n\n⚠️ ${data.message}`,
            }));
            setIsRunning(false);
          }
        }
      }
    } catch {
      updateLastAssistant((last) => ({
        ...last,
        content: last.content + `\n\n⚠️ ${dict.agentChat.connectionError}`,
      }));
      setIsRunning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setFiles((prev) => ({ ...prev, [file.name]: content }));
    };
    reader.readAsText(file);
  };

  if (!agent) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Bot size={48} className="mx-auto text-neutral-600 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {dict.agentChat.notFoundTitle}
          </h1>
          <p className="text-neutral-400">
            {dict.agentChat.notFoundSubtitle}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-neutral-950 flex flex-col">
      <header className="border-b border-white/5 bg-neutral-900/50 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-linear-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{agent.name}</h1>
            <p className="text-xs text-neutral-500">{agent.model}</p>
          </div>
        </div>
      </header>

      <div
        ref={messagesRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 max-w-4xl mx-auto w-full"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 bg-linear-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 mb-5">
              <Cloud size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{agent.name}</h2>
            <p className="text-sm text-neutral-400 max-w-md">
              {agent.description}
            </p>
            <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-neutral-900 rounded-full border border-white/5">
              <Sparkles size={14} className="text-brand-400" />
              <span className="text-xs text-neutral-500">
                {dict.agentChat.startTyping}
              </span>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/10">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] sm:max-w-[70%] ${msg.role === "user" ? "" : ""}`}
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
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {msg.toolCalls.map((tool, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-2 text-xs text-neutral-400"
                        >
                          {tool.status === "running" ? (
                            <Loader2
                              size={12}
                              className="animate-spin text-brand-400"
                            />
                          ) : (
                            <span className="text-green-400">✓</span>
                          )}
                          <span>{dict.agentChat.using} {tool.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.content ? (
                    msg.role === "assistant" ? (
                      <MarkdownText text={msg.content} />
                    ) : (
                      msg.content
                    )
                  ) : (isRunning && i === messages.length - 1 ? (
                      <span className="flex gap-1.5 items-center h-5">
                        <span
                          className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-typing-pulse"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-typing-pulse"
                          style={{ animationDelay: "200ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-typing-pulse"
                          style={{ animationDelay: "400ms" }}
                        />
                      </span>
                    ) : null)}
                  {msg.files && msg.files.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                      {msg.files.map((file, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-2 text-xs"
                        >
                          <FileText size={12} className="text-brand-400" />
                          <span className="text-neutral-300">
                            {file.filename}
                          </span>
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

      <div className="border-t border-white/5 bg-neutral-900/80 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3 bg-neutral-800 rounded-2xl border border-white/5 px-4 py-3 focus-within:border-brand-500/50 focus-within:shadow-lg focus-within:shadow-brand-500/5 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={t(dict.agentChat.messagePlaceholder, { name: agent.name })}
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 resize-none outline-none min-h-6 max-h-30 leading-relaxed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
              disabled={isRunning}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isRunning}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-500 text-white hover:bg-brand-400 disabled:bg-neutral-700 disabled:text-neutral-500 transition-all shrink-0 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <label className="text-xs text-neutral-600 cursor-pointer hover:text-neutral-400 transition-colors">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt,.csv,.md,.json,.html"
              />
              {dict.agentChat.attachFile}
            </label>
            <p className="text-[10px] text-neutral-600">
              {dict.agentChat.disclaimer}
            </p>
          </div>
          {Object.keys(files).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(files).map(([name]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 rounded-full text-xs text-neutral-300 border border-white/5"
                >
                  <FileText size={10} />
                  {name}
                  <button
                    onClick={() =>
                      setFiles((prev) => {
                        const next = { ...prev };
                        delete next[name];
                        return next;
                      })
                    }
                    className="text-neutral-500 hover:text-red-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
