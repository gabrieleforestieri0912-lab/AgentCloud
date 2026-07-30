"use client";

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

type Message = {
  role: "user" | "assistant";
  content: string;
  files?: { filename: string; content: string }[];
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [files, setFiles] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!input.trim() || isRunning) return;

    const userContent = input;
    setInput("");
    setIsRunning(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userContent },
      { role: "assistant", content: "", files: [] },
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
          agentId: slug,
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
          const data = JSON.parse(line.slice(6));

          if (data.type === "text") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                last.content += data.content;
              }
              return updated;
            });
          }

          if (data.type === "file") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                last.files = [
                  ...(last.files || []),
                  { filename: data.filename, content: data.content },
                ];
              }
              return updated;
            });
          }

          if (data.type === "done") {
            setIsRunning(false);
          }

          if (data.type === "error") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                last.content += `\n\n⚠️ ${data.message}`;
              }
              return updated;
            });
            setIsRunning(false);
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          last.content += "\n\n⚠️ Connection error. Please try again.";
        }
        return updated;
      });
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <header className="border-b border-white/5 bg-neutral-900/50 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-linear-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{name}</h1>
            <p className="text-xs text-neutral-500">
              Powered by <span className="text-brand-400">AgentCloud</span>
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

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 max-w-4xl mx-auto w-full">
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
                Ask me anything — I&apos;m here to help
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
                  {msg.content || (isRunning && i === messages.length - 1 ? (
                    <span className="flex gap-1.5 items-center h-5">
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "400ms" }} />
                    </span>
                  ) : null)}
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
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/5 bg-neutral-900/80 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3 bg-neutral-800 rounded-2xl border border-white/5 px-4 py-3 focus-within:border-brand-500/50 focus-within:shadow-lg focus-within:shadow-brand-500/5 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${name}...`}
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
              Attach file
            </label>
            <p className="text-[10px] text-neutral-600">
              Powered by AgentCloud
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
