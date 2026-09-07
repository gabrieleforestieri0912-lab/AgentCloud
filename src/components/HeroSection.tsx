"use client";

/**
 * Hero della landing con mini-chat demo dal vivo.
 *
 * Come funziona: il visitatore può chattare subito (back-end AI reale, niente
 * risposte finte). La conversazione corrente e quelle "salvate" col reset
 * vengono archiviate in localStorage con chiavi dedicate (vedi sotto) e
 * importate da /chat alla prima apertura, così la demo prosegue nella chat
 * completa.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useLanguage } from "./LanguageProvider";
import HeroBubbles from "./HeroBubbles";
import MarkdownText from "./MarkdownText";
import DemoLimitModal from "./DemoLimitModal";
import { createClient } from "@/lib/supabase/client";
import { hasAccessOnClient } from "@/lib/waitlist-constants";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/email-config";

// La conversazione dell'hero viene salvata qui così la pagina chat completa
// (/chat) la riprende in automatico come conversazione salvata.
export const HERO_CONVERSATION_STORAGE_KEY = "agentcloud_hero_conv";

// Le conversazioni archiviate dal bottone reset dell'hero si accumulano qui
// (lista di array di messaggi); /chat le importa insieme alla bozza live qui
// sopra.
export const HERO_CONVERSATION_HISTORY_KEY = "agentcloud_hero_conv_history";

type HeroMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  // Bolla di errore: mostra il testo del fallimento più un link di contatto.
  error?: boolean;
};

function heroId() {
  return Math.random().toString(36).substring(2, 11);
}

// ─── Component ────────────────────────────────────────────────────────────
const DEMO_LIMIT = 10;

export default function HeroSection() {
  const { dict, locale } = useLanguage();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<HeroMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const heroColumnRef = useRef<HTMLDivElement>(null);
  // Stream in corso, interrotto quando l'utente fa reset a metà risposta.
  const streamAbortRef = useRef<AbortController | null>(null);
  // True mentre un reset ha scartato lo stream attivo: i chunk tardivi e il
  // catch handler non devono ripopolare la conversazione azzerata.
  const discardStreamRef = useRef(false);
  // Accumulo progressivo del testo della risposta in streaming. Un ref invece
  // di una `let` locale: il testo viene letto dentro gli updater di
  // setMessages e react-hooks/immutability vieta di mutare valori catturati
  // da una closure; la mutazione di un ref è invece consentita.
  const aiTextRef = useRef("");

  const hasMessages = messages.length > 0 || isTyping;
  const userCount = messages.filter((m) => m.role === "user").length;
  const remaining = Math.max(0, DEMO_LIMIT - userCount);

  // Prompt estesi per i chip di suggerimento — frasi ben formate per lingua
  const CHIP_EXPANDED: Record<string, string[]> = {
    it: [
      "Vorrei automatizzare il mio e-commerce: puoi mostrarmi come gestire prodotti, ordini e link al carrello con AgentCloud?",
      "Ho un negozio Shopify e vorrei collegarlo per cercare prodotti e creare link diretti al carrello in automatico. Come funziona?",
      "Voglio migliorare vendite e gestione lead: come posso catturare i contatti dal sito e avvisare il team su Slack?",
      "Mi interessa l'acquisizione lead automatica: puoi mostrarmi come raccogliere i dati dai moduli e arricchire i contatti?",
      "I miei clienti chiedono spesso lo stato degli ordini: potete verificarlo in tempo reale con numero ordine ed email?",
    ],
    en: [
      "I'd like to automate my e-commerce: can you show me how to manage products, orders and cart links with AgentCloud AI agents?",
      "I run a Shopify store and want to connect it to search products and create direct cart links automatically. How does it work?",
      "I want to improve sales and lead management: how can I capture contacts from my site and notify sales on Slack?",
      "I'm interested in automatic lead capture: can you show how to collect form data and enrich contacts?",
      "My customers often ask about order status: can you check it in real time with order number and email?",
    ],
    es: [
      "Me gustaría automatizar mi e-commerce: ¿puedes mostrarme cómo gestionar productos, pedidos y enlaces al carrito con AgentCloud?",
      "Tengo una tienda Shopify y quiero conectarla para buscar productos y crear enlaces directos al carrito automáticamente. ¿Cómo funciona?",
      "Quiero mejorar ventas y gestión de leads: ¿cómo puedo capturar contactos de mi sitio y notificar a ventas en Slack?",
      "Me interesa la captura automática de leads: ¿puedes mostrar cómo recolectar datos de formularios y enriquecer contactos?",
      "Mis clientes preguntan a menudo por el estado de sus pedidos: ¿pueden verificarlo en tiempo real con número de pedido y email?",
    ],
    de: [
      "Ich möchte meinen E-Commerce automatisieren: Kannst du zeigen, wie man Produkte, Bestellungen und Warenkorb-Links mit AgentCloud verwaltet?",
      "Ich betreibe einen Shopify-Shop und möchte ihn verbinden, um Produkte zu suchen und direkte Warenkorb-Links automatisch zu erstellen. Wie funktioniert das?",
      "Ich möchte Vertrieb und Lead-Management verbessern: Wie kann ich Kontakte von meiner Website erfassen und den Vertrieb via Slack benachrichtigen?",
      "Ich interessiere mich für automatische Lead-Erfassung: Kannst du zeigen, wie man Formulardaten sammelt und Kontakte anreichert?",
      "Meine Kunden fragen oft nach dem Bestellstatus: Könnt ihr ihn in Echtzeit mit Bestellnummer und E-Mail prüfen?",
    ],
    fr: [
      "J'aimerais automatiser mon e-commerce : pouvez-vous me montrer comment gérer produits, commandes et liens panier avec AgentCloud ?",
      "J'ai une boutique Shopify et je souhaite la connecter pour rechercher des produits et créer des liens panier directs automatiquement. Comment ça marche ?",
      "Je veux améliorer les ventes et la gestion des leads : comment capturer les contacts depuis mon site et notifier les ventes sur Slack ?",
      "Je suis intéressé par la capture automatique de leads : pouvez-vous montrer comment collecter les données de formulaire et enrichir les contacts ?",
      "Mes clients demandent souvent le statut de leur commande : pouvez-vous le vérifier en temps réel avec numéro de commande et e-mail ?",
    ],
  };

  function getExpandedChip(chip: string): string {
    const localeKey = CHIP_EXPANDED[locale] ? locale : "en";
    const prompts = CHIP_EXPANDED[localeKey] ?? CHIP_EXPANDED.en;
    const idx = chips.indexOf(chip);
    if (idx >= 0 && prompts[idx]) return prompts[idx];
    // Fallback: restituisci il chip con la formula estesa
    return isItFallback(locale) ? `Vorrei sapere di più su: ${chip}` : `Tell me more about: ${chip}`;
  }

  function isItFallback(l: string) {
    return l === "it";
  }

  // Tiene traccia dello stato di autenticazione per applicare il limite di 10
  // messaggi solo agli ospiti.
  // Admin / possessori del codice sono trattati come autenticati (stessa
  // gestione degli utenti normali: niente limite demo, cronologia salvata)
  useEffect(() => {
    const supabase = createClient();
    const checkAccess = () => hasAccessOnClient();
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session || checkAccess()));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setIsAuthed(!!session || checkAccess()),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // Auto-resize della textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  // Tiene in vista il messaggio più recente nell'area scrollabile della chat.
  const scrollToBottom = useCallback(() => {
    const container = chatBodyRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Salva la conversazione dell'hero in locale così la pagina chat completa
  // (/chat) la importa in automatico come conversazione salvata.
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(
        HERO_CONVERSATION_STORAGE_KEY,
        JSON.stringify(messages),
      );
    } catch {
      // Storage non disponibile — la chat completa riparte semplicemente da zero.
    }
  }, [messages]);

  // Quando una conversazione lunga supera un viewport basso la sezione resta
  // ancorata allo schermo (le decorazioni laterali tengono il posto): a
  // scorrere è la colonna centrale, fissata in basso così l'input resta
  // visibile.
  useEffect(() => {
    if (!hasMessages) return;
    const el = heroColumnRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping, hasMessages]);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    // Limite demo per utenti non autenticati: 10 messaggi utente, poi modale di login
    if (!isAuthed && userCount >= DEMO_LIMIT) {
      setShowLimitModal(true);
      return;
    }
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: HeroMessage = {
      id: heroId(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const aiMsgId = heroId();

    // Prova prima l'endpoint chat basato su Claude, senza risposte locali di ripiego.
    discardStreamRef.current = false;
    try {
      const controller = new AbortController();
      streamAbortRef.current = controller;
      // Guardia generosa: l'endpoint invia subito gli header, ma il primo token
      // può tardare sui cold start (compilazione route, boot serverless, query
      // live sui dati piattaforma). 45s copre questi casi senza restare appesi
      // per sempre a un backend davvero morto.
      const timeout = setTimeout(() => controller.abort(), 45000);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: trimmed }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok || !res.body) throw new Error("AI backend unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantAppended = false;
      aiTextRef.current = "";

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
            aiTextRef.current += json.content;
            const assistantText = aiTextRef.current;
            if (!assistantAppended) {
              assistantAppended = true;
              setMessages((prev) => [
                ...prev,
                {
                  id: aiMsgId,
                  role: "assistant",
                  content: assistantText,
                  created_at: new Date().toISOString(),
                },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, content: assistantText }
                    : msg,
                ),
              );
            }
          }

          if (json.type === "done") break;
        }
      }

      // Stream terminato senza contenuto — trattalo come errore del backend.
      if (!aiTextRef.current.trim()) throw new Error("Empty response");
    } catch {
      if (discardStreamRef.current) return;
      // Niente risposte preimpostate: la chat dell'hero usa il backend AI live.
      // Quando il backend AI non è raggiungibile (timeout, API key mancante,
      // errore del provider), mostra un errore onesto invece di una risposta
      // preconfezionata.
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          role: "assistant",
          content: dict.hero.aiError,
          created_at: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      streamAbortRef.current = null;
    }

    if (discardStreamRef.current) return;
    setIsTyping(false);
    textareaRef.current?.focus();
  }

  async function handleSend() {
    await sendText(input);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChipClick(text: string) {
    const expanded = getExpandedChip(text);
    // Mostra nella chat demo la frase ben formata, non solo la parola del chip
    sendText(expanded);
  }

  // Salva una conversazione demo conclusa nella lista cronologia importata da /chat.
  function saveToChatHistory(conversation: HeroMessage[]) {
    if (conversation.length === 0) return;
    try {
      const raw = localStorage.getItem(HERO_CONVERSATION_HISTORY_KEY);
      let list: HeroMessage[][] = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed as HeroMessage[][];
      }
      list.push(conversation);
      // Conserva solo le più recenti per evitare una crescita illimitata.
      if (list.length > 30) list = list.slice(list.length - 30);
      localStorage.setItem(
        HERO_CONVERSATION_HISTORY_KEY,
        JSON.stringify(list),
      );
    } catch {
      // Storage non disponibile — la conversazione semplicemente non viene archiviata.
    }
  }

  // Reset della chat demo: salva la conversazione corrente nella cronologia
  // della chat reale, poi svuota la casella così si può fare una nuova domanda.
  function handleReset() {
    saveToChatHistory(messages);
    discardStreamRef.current = true;
    streamAbortRef.current?.abort();
    setIsTyping(false);
    setMessages([]);
    setInput("");
    try {
      // La conversazione è ora in cronologia; elimina la bozza live così /chat
      // non la importa due volte.
      localStorage.removeItem(HERO_CONVERSATION_STORAGE_KEY);
    } catch {
      // ignora
    }
    textareaRef.current?.focus();
  }

  const chips = dict.hero.chips;

  const hasStreamedContent = messages.some(
    (m) => m.role === "assistant" && m.content.length > 0,
  );

  // L'hero resta ancorato al viewport (`h-dvh`) in entrambi gli stati così le
  // costellazioni laterali non si spostano quando la chat demo cresce. A
  // riposo il contenuto è centrato verticalmente; in chat, la colonna centrale
  // scorre internamente sugli schermi bassi invece di allungare la sezione.
  return (
    <section
      className={`relative overflow-hidden px-4 flex items-center justify-center ${
        hasMessages
          ? "h-dvh py-6 sm:py-10 lg:py-12"
          : "h-dvh pt-36 sm:pt-48 lg:pt-64 pb-12 sm:pb-20 lg:pb-28"
      }`}
    >
      {/* I keyframe di float vivono in globals.css (condivisi con la waitlist). */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in-up 0.5s ease-out both;
        }
      `}</style>

      {/* Hairline decorativa in alto */}
      <div className="absolute inset-x-0 top-16 h-px bg-linear-to-r from-transparent via-brand-500/20 to-transparent" />

      {/* Costellazioni fluttuanti ai lati dell'hero: aziende/app a sinistra,
          avatar degli agenti a destra (nascoste sotto lg). */}
      <HeroBubbles />

      {/* Wrapper flessibile esterno per schermi larghi */}
      <div
        className={`w-full max-w-7xl 3xl:max-w-[1720px] mx-auto flex items-center justify-between relative ${
          hasMessages ? "h-full min-h-0" : ""
        }`}
      >
        {/* CONTENUTO CENTRALE DELL'HERO */}
        <motion.div
          ref={heroColumnRef}
          className={`relative z-10 mx-auto max-w-4xl text-center px-4 ${
            hasMessages
              ? "max-h-full min-h-0 overflow-y-auto overscroll-contain"
              : ""
          }`}
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
            {/* La casella cresce con il contenuto fino a un tetto proporzionale
                al viewport (min(400px, 50dvh)); oltre, l'area messaggi scorre
                internamente, così l'hero non esplode con la conversazione. */}
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
                        <Image
                          src="/agentcloud.png"
                          alt="AgentCloud"
                          width={28}
                          height={28}
                          className="w-7 h-7 shrink-0"
                        />
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

                  {/* Indicatore di digitazione */}
                  {isTyping && !hasStreamedContent && (
                    <div className="flex items-end gap-2.5 justify-start">
                      <Image
                        src="/agentcloud.png"
                        alt="AgentCloud"
                        width={28}
                        height={28}
                        className="w-7 h-7 shrink-0"
                      />
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
                  className="flex-1 min-w-0 bg-transparent text-base text-white placeholder-neutral-500 outline-none resize-none leading-relaxed font-medium py-2.5"
                  style={{ minHeight: "44px", maxHeight: "140px" }}
                />
                {hasMessages && (
                  <button
                    id="hero-reset-btn"
                    type="button"
                    onClick={handleReset}
                    aria-label={dict.hero.resetChat}
                    title={dict.hero.resetChat}
                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-all"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                )}
                <button
                  id="hero-send-btn"
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  aria-label={dict.hero.sendMessage}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-brand-500 text-white hover:bg-brand-400 transition-all disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25"
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

            {/* ── CTA apri chat completa ── */}
            {hasMessages && (
              <div className="mt-3 text-center">
                <a
                  href="/chat"
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

          {/* ── Pulsanti a pillola (suggerimenti) ── */}
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
          {hasMessages && !isAuthed && (
            <p className="mt-3 text-center text-xs font-semibold text-neutral-500">
              {remaining > 0
                ? `${remaining} / ${DEMO_LIMIT} messaggi demo rimasti`
                : `Limite demo raggiunto — accedi per continuare`}
            </p>
          )}
        </motion.div>
      </div>

      <DemoLimitModal open={showLimitModal} onClose={() => setShowLimitModal(false)} />
    </section>
  );
}
