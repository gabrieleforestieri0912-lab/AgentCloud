"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo";
import { BRANDS } from "@/lib/brands";
import { getLocalChatResponse } from "@/lib/chat-responses";
import { useLanguage } from "./LanguageProvider";

// Brand slugs reference the central BRANDS registry (src/lib/brands.ts) so the
// hero uses the same original brand marks as the integrations section.
const LEFT_BUBBLES = [
  { top: "12%", left: "10%", size: "w-10 h-10", brand: "google", delay: "0s", anim: "animate-float-gentle" },
  { top: "8%", left: "48%", size: "w-14 h-14", brand: "googledrive", delay: "0.4s", anim: "animate-float-reverse" },
  { top: "10%", left: "76%", size: "w-9 h-9", brand: "apple", delay: "1.3s", anim: "animate-float-gentle" },
  { top: "25%", left: "18%", size: "w-14 h-14", brand: "facebook", delay: "2.0s", anim: "animate-float-gentle" },
  { top: "22%", left: "68%", size: "w-10 h-10", brand: "github", delay: "0.7s", anim: "animate-float-reverse" },
  { top: "38%", left: "3%", size: "w-11 h-11", brand: "stripe", delay: "1.8s", anim: "animate-float-reverse" },
  { top: "40%", left: "42%", size: "w-14 h-14", brand: "instagram", delay: "1.1s", anim: "animate-float-gentle" },
  { top: "36%", left: "80%", size: "w-10 h-10", brand: "tiktok", delay: "2.5s", anim: "animate-float-gentle" },
  { top: "54%", left: "24%", size: "w-14 h-14", brand: "discord", delay: "0.3s", anim: "animate-float-reverse" },
  { top: "56%", left: "66%", size: "w-12 h-12", brand: "whatsapp", delay: "1.5s", anim: "animate-float-gentle" },
  { top: "72%", left: "8%", size: "w-11 h-11", brand: "gmail", delay: "2.2s", anim: "animate-float-gentle" },
  { top: "68%", left: "50%", size: "w-12 h-12", brand: "trello", delay: "0.9s", anim: "animate-float-reverse" },
  { top: "70%", left: "84%", size: "w-9 h-9", brand: "android", delay: "0.5s", anim: "animate-float-gentle" },
  { top: "86%", left: "18%", size: "w-13 h-13", brand: "dropbox", delay: "1.6s", anim: "animate-float-gentle" },
  { top: "84%", left: "56%", size: "w-12 h-12", brand: "hubspot", delay: "2.8s", anim: "animate-float-reverse" },
  { top: "90%", left: "35%", size: "w-13 h-13", brand: "shopify", delay: "1.9s", anim: "animate-float-gentle" },
];

const RIGHT_BUBBLES = [
  { top: "12%", left: "48%", size: "w-14 h-14", role: "Product Manager", initials: "PM", avatarBg: "bg-blue-500", delay: "0.2s", anim: "animate-float-gentle" },
  { top: "14%", left: "76%", size: "w-10 h-10", role: "Developer", initials: "DE", avatarBg: "bg-cyan-500", delay: "1.5s", anim: "animate-float-reverse" },
  { top: "26%", left: "8%", size: "w-14 h-14", role: "Marketer", initials: "MA", avatarBg: "bg-purple-500", delay: "0.8s", anim: "animate-float-gentle" },
  { top: "24%", left: "60%", size: "w-10 h-10", role: "Sales Rep", initials: "SR", avatarBg: "bg-amber-500", delay: "2.3s", anim: "animate-float-gentle" },
  { top: "38%", left: "30%", size: "w-12 h-12", role: "Solo Founder", initials: "SF", avatarBg: "bg-orange-500", delay: "1.7s", anim: "animate-float-reverse" },
  { top: "40%", left: "76%", size: "w-10 h-10", role: "Designer", initials: "DS", avatarBg: "bg-pink-500", delay: "0.5s", anim: "animate-float-gentle" },
  { top: "52%", left: "16%", size: "w-11 h-11", role: "Data Analyst", initials: "DA", avatarBg: "bg-indigo-500", delay: "1.2s", anim: "animate-float-reverse" },
  { top: "54%", left: "52%", size: "w-12 h-12", role: "Customer Success", initials: "CS", avatarBg: "bg-emerald-500", delay: "0.4s", anim: "animate-float-gentle" },
  { top: "68%", left: "24%", size: "w-14 h-14", role: "Community Lead", initials: "CL", avatarBg: "bg-red-500", delay: "1.1s", anim: "animate-float-gentle" },
  { top: "66%", left: "72%", size: "w-10 h-10", role: "Finance Ops", initials: "FO", avatarBg: "bg-teal-500", delay: "2.8s", anim: "animate-float-reverse" },
  { top: "82%", left: "8%", size: "w-11 h-11", role: "Operations", initials: "OP", avatarBg: "bg-neutral-600", delay: "0.6s", anim: "animate-float-gentle" },
  { top: "84%", left: "48%", size: "w-14 h-14", role: "Course Creator", initials: "CC", avatarBg: "bg-blue-600", delay: "1.6s", anim: "animate-float-reverse" },
];

type HeroMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  displayedContent?: string;
};

function heroId() {
  return Math.random().toString(36).substring(2, 11);
}

// ─── Component ────────────────────────────────────────────────────────────
export default function HeroSection() {
  const { dict, locale } = useLanguage();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<HeroMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasMessages = messages.length > 0 || isTyping;

  // Clean up any running typewriter when the component unmounts.
  useEffect(() => {
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  // Scroll chat to bottom on new messages
  const scrollToBottom = useCallback(() => {
    const container = chatBodyRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  function startTypewriter(aiMsgId: string, text: string) {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    let currentIndex = 0;
    typewriterRef.current = setInterval(() => {
      currentIndex += 2; // Speed of typewriter
      if (currentIndex >= text.length) {
        currentIndex = text.length;
        if (typewriterRef.current) {
          clearInterval(typewriterRef.current);
          typewriterRef.current = null;
        }
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, displayedContent: text.substring(0, currentIndex) }
            : msg,
        ),
      );
    }, 20);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: HeroMessage = { id: heroId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const aiMsgId = heroId();

    // Try the real AI backend (Ollama) first, fall back to local responses.
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          model: "llama3.2",
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
      // Backend unavailable: use the deterministic local response engine.
      const localText = getLocalChatResponse(text, locale);
      const aiMsg: HeroMessage = {
        id: aiMsgId,
        role: "assistant",
        content: localText,
        displayedContent: "",
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      startTypewriter(aiMsgId, localText);
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
  const roles = dict.hero.roles;

  const hasStreamedContent = messages.some(
    (m) => m.role === "assistant" && m.content.length > 0,
  );

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#0a0a0f_0%,#12121a_58%,#0a0a0f_100%)] px-4 pt-36 sm:pt-48 lg:pt-64 pb-12 sm:pb-20 lg:pb-28 h-dvh flex items-center justify-center">
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

      {/* Decorative background grid/gradients */}
      <div className="absolute inset-x-0 top-16 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(3,139,254,.15), transparent 30%), radial-gradient(circle at 90% 16%, rgba(234,67,53,.15), transparent 26%)",
        }}
      />

      {/* LEFT FLOATING CONSTELLATION */}
      <motion.div
        className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-80 xl:w-96 h-150 pointer-events-none select-none z-0"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.1,
            },
          },
        }}
        aria-hidden="true"
      >
        {LEFT_BUBBLES.map((b, idx) => {
          if (!BRANDS[b.brand]) return null;
          // Icon scaled to the bubble size (e.g. w-12 = 48px → 20px mark).
          // The digit in `w-12` is a Tailwind spacing index: px = index × 4.
          const bubblePx = Number(b.size.match(/\d+/)?.[0] ?? 12) * 4;
          const iconSize = Math.round(bubblePx * 0.42);
          return (
            <motion.div
              key={idx}
              className={`absolute rounded-full border border-white/10 bg-neutral-900 flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.3)] transition-all ${b.size} ${b.anim}`}
              style={{
                top: b.top,
                left: b.left,
                animationDelay: b.delay,
              }}
              variants={{
                hidden: { opacity: 0, scale: 0 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  transition: { type: "spring", stiffness: 80, damping: 12 },
                },
              }}
            >
              <BrandLogo slug={b.brand} size={iconSize} />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Outer Wide Screen Flex Wrapper */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between relative">
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
            <div
              className={`bg-neutral-900 rounded-3xl border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.4)] transition-all duration-500 ease-out flex flex-col`}
              style={{ maxHeight: hasMessages ? "480px" : undefined }}
            >
              {/* ── Messages area ── */}
              {hasMessages && (
                <div
                  ref={chatBodyRef}
                  className="flex-1 overflow-y-auto px-5 pt-5 pb-2 space-y-3 text-left"
                  style={{ maxHeight: "340px" }}
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
                        className={`max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "text-white font-medium"
                            : "text-neutral-200"
                        }`}
                      >
                        {msg.role === "assistant" &&
                        msg.displayedContent !== undefined
                          ? msg.displayedContent
                          : msg.content}
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

      {/* RIGHT FLOATING CONSTELLATION */}
      <motion.div
        className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-80 xl:w-96 h-150 pointer-events-none select-none z-0"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.15,
            },
          },
        }}
        aria-hidden="true"
      >
        {RIGHT_BUBBLES.map((b, idx) => (
          <motion.div
            key={idx}
            className={`absolute flex flex-col items-center ${b.anim}`}
            style={{
              top: b.top,
              left: b.left,
              animationDelay: b.delay,
            }}
            variants={{
              hidden: { opacity: 0, scale: 0 },
              visible: {
                opacity: 1,
                scale: 1,
                transition: { type: "spring", stiffness: 80, damping: 12 },
              },
            }}
          >
            <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider whitespace-nowrap mb-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 leading-none pointer-events-auto">
              {roles[idx] ?? b.role}
            </span>
            <div
              className={`rounded-full border border-white/10 bg-neutral-900 flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.3)] ${b.size}`}
            >
              <div
                className={`w-full h-full rounded-full ${b.avatarBg} flex items-center justify-center scale-95 border-2 border-white/20 shadow-inner`}
              >
                <span className="text-[11px] font-bold text-white leading-none tracking-tight select-none">
                  {b.initials}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
