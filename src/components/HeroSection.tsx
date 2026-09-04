"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";
import HeroBubbles from "./HeroBubbles";
import MarkdownText from "./MarkdownText";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/email-config";

type HeroMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  // Error bubble: shows the failure text plus a contact link.
  error?: boolean;
};

function heroId() {
  return Math.random().toString(36).substring(2, 11);
}

// ─── Component ────────────────────────────────────────────────────────────
export default function HeroSection() {
  const { dict } = useLanguage();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<HeroMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0 || isTyping;

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  // Keep the newest message in view inside the chat's scrollable area.
  const scrollToBottom = useCallback(() => {
    const container = chatBodyRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: HeroMessage = { id: heroId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const aiMsgId = heroId();

    // Try the Claude-backed chat endpoint first, fall back to local responses.
    try {
      const controller = new AbortController();
      // Generous guard: the endpoint streams headers immediately, but the
      // first token can take a while on cold starts (route compilation,
      // serverless boot, live platform-data query). 45s covers those without
      // hanging forever on a truly dead backend.
      const timeout = setTimeout(() => controller.abort(), 45000);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok || !res.body) throw new Error("AI backend unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let aiText = "";
      let assistantAppended = false;

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
            aiText += json.content;
            if (!assistantAppended) {
              assistantAppended = true;
              setMessages((prev) => [
                ...prev,
                { id: aiMsgId, role: "assistant", content: aiText },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId ? { ...msg, content: aiText } : msg,
                ),
              );
            }
          }

          if (json.type === "done") break;
        }
      }

      // Stream ended without any content — treat as backend failure.
      if (!aiText.trim()) throw new Error("Empty response");
      setIsTyping(false);
    } catch {
      // No canned answers: the hero chat uses the live AI backend. When the AI backend
      // is unreachable (timeout, missing API key, provider error), show an
      // honest error instead of a pre-made response.
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          role: "assistant",
          content: dict.hero.aiError,
          error: true,
        },
      ]);
      setIsTyping(false);
    }

    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChipClick(text: string) {
    setInput(text);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  const chips = dict.hero.chips;

  const hasStreamedContent = messages.some(
    (m) => m.role === "assistant" && m.content.length > 0,
  );

  // At rest the hero stays locked to the viewport — identical to the original
  // layout (`h-dvh`). When the chat opens the padding tightens and the section
  // may grow (`min-h-dvh`) so the whole chat stays reachable on short screens;
  // the chat box itself is capped to the viewport and scrolls internally, so
  // any number of messages stays contained and the page keeps a single
  // scrollbar.
  return (
    <section
      className={`relative overflow-hidden px-4 flex items-center justify-center ${
        hasMessages
          ? "min-h-dvh pt-8 sm:pt-16 lg:pt-24 pb-20 sm:pb-28 lg:pb-36"
          : "h-dvh pt-36 sm:pt-48 lg:pt-64 pb-12 sm:pb-20 lg:pb-28"
      }`}
    >
      {/* Float keyframes live in globals.css (shared with the waitlist page). */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in-up 0.5s ease-out both;
        }
      `}</style>

      {/* Decorative top hairline */}
      <div className="absolute inset-x-0 top-16 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />

      {/* Floating constellations flanking the hero: companies/apps on the
          left, agent avatars on the right (hidden below lg). */}
      <HeroBubbles />

      {/* Outer Wide Screen Flex Wrapper */}
      <div className="w-full max-w-7xl 3xl:max-w-[1720px] mx-auto flex items-center justify-between relative">
        {/* CENTER HERO CONTENT */}
        <motion.div
          className="relative z-10 mx-auto max-w-4xl text-center px-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          <motion.h1
            className="text-[2.25rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[76px]"
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
              },
            }}
          >
            {dict.hero.titleA}
            <br />
            {dict.hero.titleConnector}{" "}
            <span className="relative inline-block px-6 py-2.5 text-white bg-linear-to-r from-orange-500 to-pink-500 rounded-[28px] rounded-bl-sm shadow-lg shadow-orange-500/25 select-none leading-none align-middle mt-2">
              {dict.hero.titleB}
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-5 sm:mt-7 max-w-xl text-base sm:text-lg font-medium leading-relaxed text-neutral-400"
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
              },
            }}
          >
            {dict.hero.subtitle}
          </motion.p>

          {/* ── Inline Mini-Chat Box ── */}
          <motion.div
            className="mx-auto mt-10 max-w-xl"
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
              },
            }}
          >
            {/* The box grows with the content up to a viewport-aware cap
                (min(400px, 50dvh)); beyond that the messages area scrolls
                internally, so the hero never explodes with the conversation. */}
            <div
              className={`bg-neutral-900 rounded-3xl border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.4)] transition-all duration-500 ease-out flex flex-col`}
              style={hasMessages ? { maxHeight: "min(400px, 50dvh)" } : undefined}
            >
              {/* ── Messages area ── */}
              {hasMessages && (
                <div
                  ref={chatBodyRef}
                  className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-2 space-y-3 text-left"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-full bg-linear-to-br from-brand-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md shadow-brand-500/20">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-3.5 h-3.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 5v5l3 3" />
                          </svg>
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "text-white font-medium whitespace-pre-wrap"
                            : "text-neutral-200"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <>
                            <MarkdownText text={msg.content} />
                            {msg.error && (
                              <a
                                href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
                                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 underline decoration-brand-400/40 underline-offset-2 hover:text-brand-300 transition-colors"
                              >
                                ✉️ {dict.common.contactSupport}
                              </a>
                            )}
                          </>
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                          <span className="text-neutral-300 text-[10px] font-bold">
                            U
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && !hasStreamedContent && (
                    <div className="flex items-end gap-2.5 justify-start">
                      <div className="w-7 h-7 rounded-full bg-linear-to-br from-brand-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md shadow-brand-500/20">
                        <svg
                          viewBox="0 0 24 24"
                          className="w-3.5 h-3.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm0 5v5l3 3" />
                        </svg>
                      </div>
                      <div className="bg-neutral-800 border border-white/5 rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex gap-1 items-center">
                          <span
                            className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* ── Input row ── */}
              <div
                className={`flex items-center gap-3 px-5 ${hasMessages ? "py-3 border-t border-white/10" : "py-4"}`}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    hasMessages
                      ? dict.hero.placeholderContinued
                      : dict.hero.placeholderEmpty
                  }
                  rows={1}
                  className="flex-1 bg-transparent text-base text-white placeholder-neutral-500 outline-none resize-none leading-relaxed font-medium py-2.5"
                  style={{ minHeight: "44px", maxHeight: "140px" }}
                />
                <button
                  id="hero-send-btn"
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  aria-label={dict.hero.sendMessage}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white text-neutral-900 hover:bg-brand-500 hover:text-white transition-all disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed shadow-sm"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Open full chat CTA ── */}
            {hasMessages && (
              <div className="mt-3 text-center">
                <a
                  href={`/chat?q=${encodeURIComponent(
                    messages.find((m) => m.role === "user")?.content ?? "",
                  )}`}
                  className="text-xs font-semibold text-neutral-500 hover:text-brand-400 transition-colors inline-flex items-center gap-1.5"
                >
                  {dict.hero.openFullChat}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17 17 7M17 7H7M17 7v10" />
                  </svg>
                </a>
              </div>
            )}
          </motion.div>

          {/* ── Pill Buttons ── */}
          {!hasMessages && (
            <div className="mt-8 flex flex-col items-center gap-3.5">
              <div className="flex flex-wrap justify-center gap-3">
                {chips.slice(0, 3).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleChipClick(chip)}
                    className="px-4.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 hover:border-brand-500/50 text-sm font-semibold text-neutral-300 hover:text-white rounded-full shadow-sm transition-all cursor-pointer animate-fade-in"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {chips.slice(3).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleChipClick(chip)}
                    className="px-4.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 hover:border-brand-500/50 text-sm font-semibold text-neutral-300 hover:text-white rounded-full shadow-sm transition-all cursor-pointer animate-fade-in"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

    </section>
  );
}
