/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  PanelLeftOpen,
  PanelLeftClose,
  Send,
  Sparkles,
  Cloud,
  Home,
  Wrench,
  Bot,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { getLocalChatResponse } from "@/lib/chat-responses";
import { useLanguage } from "./LanguageProvider";
import MarkdownText from "./MarkdownText";
import ShopifyConnectionPrompt from "@/components/ShopifyConnectionPrompt";
import { SHOPIFY_AGENT_SLUG } from "@/lib/shopify/oauth";

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type LocalConversation = {
  id: string;
  title: string;
  messages: LocalMessage[];
  created_at: string;
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getConvTitle(messages: LocalMessage[], fallback: string): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return fallback;
  return first.content.length > 36
    ? first.content.substring(0, 36) + "..."
    : first.content;
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function ChatInterface({
  initialQuery,
  agentId,
  availableAgents = [],
}: {
  initialQuery?: string;
  agentId?: string;
  availableAgents?: { slug: string; name: string }[];
}) {
  const { dict, locale } = useLanguage();
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [activeAgentId, setActiveAgentId] = useState(agentId || "");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState(initialQuery || "");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const initializedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId);
  const messages = useMemo(() => activeConv?.messages ?? [], [activeConv]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (initialQuery && !initializedRef.current) {
      initializedRef.current = true;
      const conv: LocalConversation = {
        id: generateId(),
        title: dict.chat.newChat,
        messages: [],
        created_at: new Date().toISOString(),
      };
      setConversations([conv]);
      setActiveId(conv.id);
      setTimeout(() => handleSendWithText(initialQuery, conv.id), 100);
    }
  }, [initialQuery]);

  function switchConversation(id: string) {
    setActiveId(id);
    setMobileSidebarOpen(false);
  }

  function handleNewChat() {
    const conv: LocalConversation = {
      id: generateId(),
      title: dict.chat.newChat,
      messages: [],
      created_at: new Date().toISOString(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMobileSidebarOpen(false);
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {
      setActiveId(null);
    }
  }

  async function handleSendWithText(text: string, convId: string) {
    if (!text.trim() || !convId) return;
    await sendMessage(text, convId);
  }

  async function sendMessage(text: string, convId: string) {
    if (isTyping) return;

    const userMsg: LocalMessage = {
      id: generateId(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, userMsg],
              title: getConvTitle([...c.messages, userMsg], dict.chat.newChat),
            }
          : c,
      ),
    );

    setIsTyping(true);

    // Update a single assistant message in place as the stream arrives.
    // Returns the stable id so later chunks update the same bubble.
    const patchAssistant = (assistantId: string, content: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.some((m) => m.id === assistantId)
                  ? c.messages.map((m) =>
                      m.id === assistantId ? { ...m, content } : m,
                    )
                  : [
                      ...c.messages,
                      {
                        id: assistantId,
                        role: "assistant",
                        content,
                        created_at: new Date().toISOString(),
                      },
                    ],
              }
            : c,
        ),
      );
    };

    // Try the Gemini-backed chat endpoint, fallback to local responses on failure.
    let responseText = "";
    try {
      // Send the full conversation history so the AI stays coherent across
      // follow-ups (and always answers against the latest platform data).
      const history =
        conversations.find((c) => c.id === convId)?.messages ?? [];
      const apiMessages = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      const providerRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          agentId: activeAgentId || undefined,
        }),
      });

      if (providerRes.ok && providerRes.body) {
        const reader = providerRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantId = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            let json: { type?: string; content?: string };
            try {
              json = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            if (json.type === "text" && typeof json.content === "string") {
              responseText += json.content;
              if (!assistantId) assistantId = generateId();
              patchAssistant(assistantId, responseText);
            }

            if (json.type === "done") break;
          }
        }

        // Stream ended without any content — treat as backend failure.
        if (!responseText.trim()) throw new Error("Empty response");
      } else {
        throw new Error("AI backend unavailable");
      }
    } catch {
      // Fallback to local responses, typed out word by word for consistency.
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 1200));
      responseText = getLocalChatResponse(text, locale);

      const assistantId = generateId();
      const words = responseText.split(/(\s+)/);
      let emitted = "";
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          emitted += words.shift() ?? "";
          patchAssistant(assistantId, emitted);
          if (words.length === 0) {
            clearInterval(timer);
            resolve();
          }
        }, 30);
      });
    }

    setIsTyping(false);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !activeId) return;
    setInput("");
    inputRef.current?.focus();
    await sendMessage(text, activeId);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] pt-16 relative">
      {/* Desktop sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hidden lg:flex absolute left-4 top-4 z-30 w-8 h-8 items-center justify-center rounded-lg bg-neutral-800 border border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-all"
        title={sidebarOpen ? dict.chat.closeSidebar : dict.chat.openSidebar}
        aria-label={sidebarOpen ? dict.chat.closeSidebar : dict.chat.openSidebar}
      >
        {sidebarOpen ? (
          <PanelLeftClose size={16} />
        ) : (
          <PanelLeftOpen size={16} />
        )}
      </button>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-20"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 pt-16 lg:pt-0
          w-72 bg-neutral-950 border-r border-white/5
          flex flex-col transition-transform duration-300
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarOpen ? "lg:w-72" : "lg:w-0 lg:overflow-hidden lg:border-0"}
        `}
      >
        <div className="flex items-center gap-2 p-4 border-b border-white/5">
          <button
            onClick={handleNewChat}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus size={16} />
            {dict.chat.newChat}
          </button>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            aria-label={dict.chat.closeSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        <nav className="px-3 pt-3 pb-1">
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors">
            <Home size={16} />
            {dict.chat.home}
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-brand-400 bg-brand-500/10 border border-brand-500/20">
            <MessageSquare size={16} />
            {dict.chat.chat}
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors">
            <Wrench size={16} />
            {dict.chat.tools}
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors">
            <Bot size={16} />
            {dict.chat.agents}
          </button>
        </nav>

        {availableAgents.length > 0 && (
          <div className="px-3 pt-1 pb-1">
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-widest px-3 py-2">
              {dict.chat.agents}
            </p>
            <div className="space-y-1">
              <button
                onClick={() => setActiveAgentId("")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  activeAgentId === ""
                    ? "bg-white/5 text-white border border-white/5"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Bot size={14} className="shrink-0" />
                <span className="truncate">Assistente personale</span>
              </button>
              {availableAgents.map((a) => (
                <button
                  key={a.slug}
                  onClick={() => setActiveAgentId(a.slug)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    activeAgentId === a.slug
                      ? "bg-brand-500/10 text-brand-300 border border-brand-500/20"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Bot size={14} className="shrink-0" />
                  <span className="truncate">{a.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-widest px-3 py-2">
            {dict.chat.conversations}
          </p>
          {conversations.length === 0 ? (
            <p className="text-xs font-semibold text-neutral-600 px-3 py-4 text-center">
              {dict.chat.noConversations}
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => switchConversation(conv.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors group ${
                  conv.id === activeId
                    ? "bg-white/5 text-white border border-white/5"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <MessageSquare
                  size={14}
                  className={`shrink-0 ${
                    conv.id === activeId ? "text-brand-400" : "text-neutral-600"
                  }`}
                />
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 transition-all shrink-0"
                  title={dict.chat.deleteConversation}
                  aria-label={dict.chat.deleteConversation}
                >
                  <Trash2 size={12} />
                </button>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-neutral-900/50">
            <Image
              src="/agentcloud.png"
              alt="AgentCloud"
              width={14}
              height={14}
              className="text-brand-400"
            />
            <span className="text-xs font-semibold text-neutral-500">
              AgentCloud <span className="text-purple-400">v2.1</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar trigger */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden fixed bottom-6 left-4 z-10 w-11 h-11 bg-brand-500 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 hover:bg-brand-400 transition-all"
        title="Open sidebar"
      >
        <MessageSquare size={18} className="text-white" />
      </button>

      {/* Main chat area */}
      <main
        className={`flex-1 flex flex-col bg-neutral-900 transition-all duration-300 ${
          sidebarOpen ? "lg:ml-0" : ""
        }`}
      >
        {/* Chat header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-neutral-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-linear-to-br from-brand-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Image
                src="/agentcloud.png"
                alt="AgentCloud"
                width={14}
                height={14}
                className="text-white"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AgentCloud AI</p>
              <p className="text-xs font-semibold text-neutral-500">
                {isTyping ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                    {dict.chat.thinking}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                    {dict.chat.online}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all">
              <Sparkles size={16} />
            </button>
            <button className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all">
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {activeAgentId === SHOPIFY_AGENT_SLUG && <ShopifyConnectionPrompt />}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
          {messages.length === 0 && !isTyping ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 bg-linear-to-br from-brand-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 mb-4">
                <Image
                  src="/agentcloud.png"
                  alt="AgentCloud"
                  width={28}
                  height={28}
                  className="text-white"
                />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {dict.chat.emptyTitle}
              </h2>
              <p className="text-sm font-semibold text-neutral-400 max-w-sm">
                {dict.chat.emptySubtitle}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-linear-to-br from-brand-500 to-pink-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/10">
                    <Image
                      src="/agentcloud.png"
                      alt="AgentCloud"
                      width={14}
                      height={14}
                      className="text-white"
                    />
                  </div>
                )}
                <div
                  className={`max-w-[75%] sm:max-w-[65%] ${msg.role === "user" ? "order-1" : ""}`}
                >
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "whitespace-pre-wrap bg-brand-500 text-white rounded-2xl rounded-br-md shadow-lg shadow-brand-500/20"
                        : "bg-neutral-800 border border-white/5 text-neutral-200 rounded-2xl rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <MarkdownText text={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                  <p
                    className={`text-[10px] text-neutral-600 mt-1 ${
                      msg.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-neutral-700 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">U</span>
                  </div>
                )}
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-brand-500 to-pink-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/10">
                <Image
                  src="/agentcloud.png"
                  alt="AgentCloud"
                  width={14}
                  height={14}
                  className="text-white"
                />
              </div>
              <div className="bg-neutral-800 border border-white/5 rounded-2xl rounded-bl-md px-4 py-3.5">
                <div className="flex gap-1.5 items-center h-4">
                  <span
                    className="w-2 h-2 bg-neutral-400 rounded-full animate-typing-pulse"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-neutral-400 rounded-full animate-typing-pulse"
                    style={{ animationDelay: "200ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-neutral-400 rounded-full animate-typing-pulse"
                    style={{ animationDelay: "400ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 sm:px-6 py-4 bg-neutral-900/80 backdrop-blur-sm border-t border-white/5">
          <div className="max-w-4xl mx-auto flex items-end gap-3 bg-neutral-800 rounded-2xl border border-white/5 px-4 py-3 focus-within:border-brand-500/50 focus-within:shadow-lg focus-within:shadow-brand-500/5 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={dict.chat.placeholder}
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 resize-none outline-none min-h-6 max-h-30 leading-relaxed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping || !activeId}
              aria-label={dict.chat.sendMessage}
              title={dict.chat.sendMessage}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-500 text-white hover:bg-brand-400 disabled:bg-neutral-700 disabled:text-neutral-500 transition-all shrink-0 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-neutral-600 text-center mt-2">
            {dict.chat.disclaimer}
          </p>
        </div>
      </main>
    </div>
  );
}
