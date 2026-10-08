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
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import HeroBubbles from "./HeroBubbles";
import MarkdownText from "./MarkdownText";
import DemoLimitModal from "./DemoLimitModal";
import { useAccountSession, accountTooltipLabel } from "@/lib/use-account-session";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/email-config";
import {
  AttachPlusButton,
  AttachmentChips,
  DropHint,
  chatAttachLabels,
  useChatAttachments,
} from "@/components/ChatAttachments";
import { buildVisionText, composeUserContent, toVisionBlocks } from "@/lib/chat-attachments";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { AGENTS } from "@/lib/agents";
import { INTEGRATIONS } from "@/lib/integrations";

// Numeri mostrati nel badge della hero: derivati dai cataloghi reali così non
// restano indietro quando un agente o un'integrazione vengono aggiunti.
const LIVE_INTEGRATIONS = INTEGRATIONS.filter((i) => i.available).length;

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
  attachments?: Pick<ChatAttachment, "id" | "name" | "kind" | "previewUrl">[];
};

function heroId() {
  return Math.random().toString(36).substring(2, 11);
}

// ─── Component ────────────────────────────────────────────────────────────
const DEMO_LIMIT = 10;

export default function HeroSection() {
  const { dict, locale } = useLanguage();
  const attachLabels = chatAttachLabels(dict);
  const attach = useChatAttachments();
  const [input, setInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<(typeof AGENTS)[0] | null>(null);
  const [agentSearch, setAgentSearch] = useState("");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const agentSearchRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<HeroMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  // Sessione/avatar dell'account: l'autenticazione applica il limite di 10
  // messaggi demo solo agli ospiti; l'avatar compare nei messaggi utente.
  const {
    avatarUrl: accountAvatarUrl,
    name: accountName,
    email: accountEmail,
    isAuthed,
  } = useAccountSession();
  // Tooltip dell'avatar nei messaggi utente: nome e email quando disponibili.
  const accountTooltip = accountTooltipLabel(accountName, accountEmail);
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
  // Streaming in corso anche come ref: i controlli dentro sendText (async) non
  // vedono lo stato React aggiornato di questo render.
  const typingRef = useRef(false);
  // Messaggi premuti con Enter durante la generazione: bolla già visibile,
  // invio automatico appena la risposta in corso finisce.
  const queueRef = useRef<{ text: string; pending: ChatAttachment[] }[]>([]);

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
    return t(dict.hero.askAboutChip, { chip });
  }

  // Auto-resize della textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  // Chiudi dropdown agente se si clicca fuori
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setAgentDropdownOpen(false);
        setAgentSearch("");
      }
    }
    if (agentDropdownOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [agentDropdownOpen]);

  // Focus sulla search quando si apre il dropdown
  useEffect(() => {
    if (agentDropdownOpen) {
      setTimeout(() => agentSearchRef.current?.focus(), 50);
    }
  }, [agentDropdownOpen]);

  // Agenti filtrati dalla ricerca
  const filteredAgents = useMemo(() => {
    if (!agentSearch.trim()) return AGENTS;
    const q = agentSearch.toLowerCase();
    return AGENTS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.shortName.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [agentSearch]);

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

  // Mostra subito la bolla utente della demo (riusata da invio immediato e
  // coda, così il messaggio premuto durante la generazione è visibile subito).
  function appendHeroUserMsg(text: string, pending: ChatAttachment[]) {
    const trimmed = text.trim();
    const hasImages = toVisionBlocks(pending).length > 0;
    const userMsg: HeroMessage = {
      id: heroId(),
      role: "user",
      content: trimmed || (hasImages ? dict.common.imageAttached : pending.map((a) => a.name).join(", ") || dict.common.fileAttached),
      created_at: new Date().toISOString(),
      attachments: pending.map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        previewUrl: a.previewUrl,
      })),
    };
    setMessages((prev) => [...prev, userMsg]);
  }

  async function sendText(text: string, pending: ChatAttachment[] = [], preAdded = false) {
    const trimmed = text.trim();
    const hasAttachments = pending.length > 0;
    if ((!trimmed && !hasAttachments) || typingRef.current) return;
    // Limite demo per utenti non autenticati: 10 messaggi utente, poi modale di
    // login. Saltato per i messaggi in coda (già accettati con Enter).
    if (!preAdded && !isAuthed && userCount >= DEMO_LIMIT) {
      setShowLimitModal(true);
      return;
    }
    if (!preAdded) {
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }

    const apiText = composeUserContent(trimmed, pending);
    const visionBlocks = toVisionBlocks(pending);
    const hasImages = visionBlocks.length > 0;
    const visionText = buildVisionText(apiText, hasImages);
    const apiContent: unknown = hasImages ? ([{ type: "text" as const, text: visionText }, ...visionBlocks] as unknown) : apiText;

    if (!preAdded) appendHeroUserMsg(trimmed, pending);
    typingRef.current = true;
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
          // La demo hero usa SEMPRE la chiave economica xKiro, mai Claude.
          provider: "xt",
          messages: [{ role: "user", content: apiContent as unknown }],
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
    typingRef.current = false;
    setIsTyping(false);
    textareaRef.current?.focus();

    // Coda: messaggi premuti con Enter mentre la demo generava. La bolla è già
    // visibile, ora che la risposta è completa partono davvero.
    const next = queueRef.current.shift();
    if (next) await sendText(next.text, next.pending, true);
  }

  async function handleSend() {
    const text = input;
    // Guard PRIMA di take(): se l'invio verrà rifiutato (limite demo raggiunto)
    // gli allegati restano nei chip invece di essere consumati e persi
    // silenziosamente.
    if (!text.trim() && attach.attachments.length === 0) return;
    if (!isAuthed && userCount >= DEMO_LIMIT) {
      setShowLimitModal(true);
      return;
    }
    const pending = attach.take();
    // Stream in corso: messaggio in coda, bolla subito visibile.
    if (typingRef.current) {
      appendHeroUserMsg(text, pending);
      setInput("");
      queueRef.current.push({ text, pending });
      return;
    }
    await sendText(text, pending);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChipClick(text: string) {
    const expanded = getExpandedChip(text);
    // Inserisce solo il testo nell'input, senza inviare subito
    setInput(expanded);
    // Focus sull'input così l'utente può modificare/inviare
    setTimeout(() => textareaRef.current?.focus(), 0);
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
    attach.clear();
    // I messaggi in coda appartengono alla conversazione appena azzerata.
    queueRef.current = [];
    typingRef.current = false;
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
      className={`relative overflow-hidden px-4 sm:px-6 flex items-center justify-center ${
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
          <motion.div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3.5 py-1.5"
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase text-brand-300">{t(dict.hero.badge, { count: AGENTS.length, n: LIVE_INTEGRATIONS })}</span>
          </motion.div>
          <motion.h1
            className="text-[1.75rem] xs:text-[2rem] sm:text-5xl md:text-6xl lg:text-[76px] font-extrabold leading-[1.08] tracking-tight text-white"
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
              className={`bg-neutral-900 rounded-3xl border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.4)] transition-all duration-500 ease-out flex flex-col relative`}
              style={hasMessages ? { maxHeight: "min(400px, 50dvh)" } : undefined}
              onDragEnter={attach.onDragEnter}
              onDragOver={attach.onDragOver}
              onDragLeave={attach.onDragLeave}
              onDrop={attach.makeDrop(attachLabels)}
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
                                {dict.common.contactSupport}
                              </a>
                            )}
                          </>
                        ) : (
                          <>
                            {msg.content}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <span className="mt-1.5 flex flex-wrap gap-1.5">
                                {msg.attachments.map((file) =>
                                  file.kind === "image" && file.previewUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      key={file.id}
                                      src={file.previewUrl}
                                      alt={file.name || dict.common.imageAttached}
                                      className="max-h-20 max-w-[120px] rounded-lg object-cover border border-white/10"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span
                                      key={file.id}
                                      className="inline-flex items-center rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/80"
                                    >
                                      {file.name}
                                    </span>
                                  ),
                                )}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div
                          className="relative w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center shrink-0 overflow-hidden"
                          title={accountTooltip ?? undefined}
                          aria-label={accountTooltip ?? undefined}
                        >
                          {/* Fallback iniziale: icona persona, resta visibile se l'avatar non carica. */}
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-neutral-300"
                            aria-hidden="true"
                          >
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          {accountAvatarUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={accountAvatarUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="absolute inset-0 h-full w-full object-cover"
                              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                            />
                          )}
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

              {/* ── Input area ── */}
              <div className={`${hasMessages ? "border-t border-white/10" : ""} relative`}>
                <DropHint visible={attach.dragOver} text={attachLabels.dropHint} />

                {/* Attachments */}
                {attach.attachments.length > 0 && (
                  <div className="px-4 pt-3">
                    <AttachmentChips
                      items={attach.attachments}
                      onRemove={attach.remove}
                      removeLabel={(name) => dict.chat.removeAttachment.replace("{name}", name)}
                      imageAlt={dict.common.imageAttached}
                    />
                  </div>
                )}
                {attach.notice && (
                  <p className="px-5 pt-2 text-xs text-amber-400 text-left">{attach.notice}</p>
                )}

                {/* Textarea multiriga */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={attach.makePaste(attachLabels)}
                  placeholder={
                    hasMessages ? dict.hero.placeholderContinued : dict.hero.placeholderEmpty
                  }
                  rows={3}
                  className="w-full bg-transparent text-base text-white placeholder-neutral-500 outline-none resize-none leading-relaxed font-medium px-5 pt-4 pb-2"
                  style={{ minHeight: "88px", maxHeight: "200px" }}
                />

                {/* Bottom toolbar */}
                <div className="flex items-center gap-2 px-4 pb-3 pt-1">
                  {/* + attach */}
                  <AttachPlusButton
                    labels={attachLabels}
                    disabled={isTyping}
                    onPick={(files) => attach.addFiles(files, attachLabels)}
                  />

                  {/* Agent selector pill */}
                  <div ref={agentDropdownRef} className="relative">
                    <button
                      id="hero-agent-select-btn"
                      type="button"
                      onClick={() => {
                        setAgentDropdownOpen((o) => !o);
                        setAgentSearch("");
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-brand-500/40 hover:text-white transition-all"
                      aria-expanded={agentDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      {selectedAgent ? (
                        <>
                          <span className="max-w-[100px] truncate">{selectedAgent.shortName}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l2 2"/><circle cx="19" cy="5" r="3" fill="currentColor"/></svg>
                          <span>Agente</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                        </>
                      )}
                    </button>

                    {/* Dropdown */}
                    {agentDropdownOpen && (
                      <div
                        className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/60 overflow-hidden z-50"
                        role="listbox"
                        aria-label="Seleziona agente"
                      >
                        {/* Search bar */}
                        <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-neutral-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                          <input
                            ref={agentSearchRef}
                            type="text"
                            value={agentSearch}
                            onChange={(e) => setAgentSearch(e.target.value)}
                            placeholder="Cerca agente…"
                            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 outline-none"
                          />
                          {agentSearch && (
                            <button
                              type="button"
                              onClick={() => setAgentSearch("")}
                              className="text-neutral-500 hover:text-white transition-colors"
                              aria-label="Cancella ricerca"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                          )}
                        </div>

                        {/* "Nessun agente" option */}
                        {!agentSearch && (
                          <button
                            type="button"
                            role="option"
                            aria-selected={selectedAgent === null}
                            onClick={() => {
                              setSelectedAgent(null);
                              setAgentDropdownOpen(false);
                              setAgentSearch("");
                            }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors ${
                              selectedAgent === null
                                ? "bg-brand-500/15 text-brand-300"
                                : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                            }`}
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-neutral-300">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l2 2"/><circle cx="19" cy="5" r="3" fill="currentColor"/></svg>
                            </span>
                            <span className="font-medium">Qualsiasi agente</span>
                          </button>
                        )}

                        {/* Agent list */}
                        <div className="max-h-52 overflow-y-auto">
                          {filteredAgents.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-neutral-500 text-center">Nessun risultato</p>
                          ) : (
                            filteredAgents.map((agent) => (
                              <button
                                key={agent.slug}
                                type="button"
                                role="option"
                                aria-selected={selectedAgent?.slug === agent.slug}
                                onClick={() => {
                                  setSelectedAgent(agent);
                                  setAgentDropdownOpen(false);
                                  setAgentSearch("");
                                }}
                                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors ${
                                  selectedAgent?.slug === agent.slug
                                    ? "bg-brand-500/15 text-brand-300"
                                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                                }`}
                              >
                                <span
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                                  style={{ background: agent.accent + "33", color: agent.accent }}
                                >
                                  {agent.shortName.charAt(0)}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block truncate font-medium">{agent.shortName}</span>
                                  <span className="block truncate text-[11px] text-neutral-500">{agent.category}</span>
                                </span>
                                {selectedAgent?.slug === agent.slug && (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Reset */}
                  {hasMessages && (
                    <button
                      id="hero-reset-btn"
                      type="button"
                      onClick={handleReset}
                      aria-label={dict.hero.resetChat}
                      title={dict.hero.resetChat}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </button>
                  )}

                  {/* Send */}
                  <button
                    id="hero-send-btn"
                    onClick={handleSend}
                    disabled={(!input.trim() && attach.attachments.length === 0) || isTyping}
                    aria-label={dict.hero.sendMessage}
                    title={dict.hero.sendMessage}
                    className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed ${
                      (!input.trim() && attach.attachments.length === 0) || isTyping
                        ? "bg-neutral-800 text-neutral-600 shadow-none"
                        : "bg-gradient-to-br from-[#038bfe] to-[#0066cc] text-white shadow-[0_0_16px_rgba(3,139,254,0.45),0_4px_12px_rgba(0,0,0,0.3)] hover:brightness-110 hover:scale-105 hover:shadow-[0_0_22px_rgba(3,139,254,0.6),0_4px_12px_rgba(0,0,0,0.3)] active:scale-95"
                    }`}
                  >
                    {isTyping ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-6.2-8.56" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                    )}
                  </button>
                </div>
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
            <div className="mt-8 flex flex-col items-center gap-3.5 pb-10 sm:pb-14">
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
                ? t(dict.hero.demoRemaining, { remaining, limit: DEMO_LIMIT })
                : dict.hero.demoLimitReached}
            </p>
          )}
        </motion.div>
      </div>

      <DemoLimitModal open={showLimitModal} onClose={() => setShowLimitModal(false)} />
    </section>
  );
}
