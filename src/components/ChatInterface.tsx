/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

/**
 * Chat principale della piattaforma (/chat).
 *
 * Come funziona: gestisce conversazioni multiple (sidebar + localStorage),
 * selettore agente (con relativo system prompt e tool), invio verso /api/chat
 * (assistente generico) o /api/agent/run (agente selezionato) e streaming SSE
 * parola per parola in bolle che crescono. Supporta allegati (drag&drop,
 * "+", paste) condivisi via ChatAttachments, ripristino della sessione demo
 * dell'hero e gestione errori con link al supporto.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Plus,
  Trash2,
  PanelLeftClose,
  Send,
  Home,
  Wrench,
  Bot,
  ChevronDown,
  ShoppingCart,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/email-config";
import { useLanguage } from "./LanguageProvider";
import MarkdownText from "./MarkdownText";
import AppHeader from "./AppHeader";
import ShopifyConnectionPrompt from "@/components/ShopifyConnectionPrompt";
import GoogleConnectionPrompt from "@/components/GoogleConnectionPrompt";
import {
  AttachPlusButton,
  AttachmentChips,
  DropHint,
  chatAttachLabels,
  useChatAttachments,
} from "@/components/ChatAttachments";
import { composeUserContent, toFilesMap } from "@/lib/chat-attachments";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { getEnabledTools, AGENT_RUNTIME } from "@/lib/agents/registry";
import { SHOPIFY_AGENT_SLUG } from "@/lib/shopify/oauth";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "./BrandLogo";
import { AGENTS } from "@/lib/agents";
import { INTEGRATIONS } from "@/lib/integrations";
import {
  HERO_CONVERSATION_STORAGE_KEY,
  HERO_CONVERSATION_HISTORY_KEY,
} from "./HeroSection";
import ExportReportButton from "./ExportReportButton";

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  // True per le bolle dell'assistente che contengono un errore invece di una
  // risposta AI; la UI mostra allora un link di contatto sotto il messaggio.
  error?: boolean;
  attachments?: Pick<ChatAttachment, "id" | "name" | "kind" | "previewUrl">[];
};

type LocalConversation = {
  id: string;
  title: string;
  messages: LocalMessage[];
  created_at: string;
  agentSlugs?: string[];
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
  agentLabel,
  availableAgents = [],
}: {
  initialQuery?: string;
  agentId?: string;
  /** Nome localizzato dell'agente mostrato quando la chat è stata aperta per un agente. */
  agentLabel?: string;
  availableAgents?: { slug: string; name: string }[];
}) {
  const { dict, locale } = useLanguage();
  const attachLabels = chatAttachLabels(dict);
  const attach = useChatAttachments();
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [activeAgentId, setActiveAgentId] = useState(agentId || "");
  const [selectedAgentSlugs, setSelectedAgentSlugs] = useState<string[]>(agentId ? [agentId] : []);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState(initialQuery || "");
  const [isTyping, setIsTyping] = useState(false);
  // True da quando la risposta corrente dell'assistente ha iniziato lo
  // streaming (la bolla cresce parola per parola). L'indicatore a tre puntini
  // appare solo prima dell'arrivo della prima parola — mentre la macchina da
  // scrivere è in funzione, i puntini restano nascosti.
  const [hasPartialReply, setHasPartialReply] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarUserEmail, setSidebarUserEmail] = useState<string | null>(null);
  const [sidebarUserInitials, setSidebarUserInitials] = useState<string>("?");
  const initializedRef = useRef(false);
  const CHAT_HISTORY_KEY = "agentcloud_chat_history_v2";

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // True finché l'utente è in fondo alla conversazione. L'auto-scroll scatta
  // solo allora: in streaming gli aggiornamenti parola per parola scorrono il
  // contenitore direttamente (istantaneo, niente animazione smooth che lotta
  // col dito), e la lettura dei messaggi più vecchi non viene mai interrotta
  // da uno "strattone" verso il basso.
  const stickToBottom = useRef(true);

  const activeConv = conversations.find((c) => c.id === activeId);
  const messages = useMemo(() => activeConv?.messages ?? [], [activeConv]);

  // Titolo dell'intestazione: il nome dell'agente attivo quando ne è selezionato
  // uno (CTA marketplace o selettore in sidebar), altrimenti il nome generico
  // dell'assistente.
  // Admin / possessori del codice vedono l'intero catalogo (stessa gestione
  // degli utenti normali, con cronologia)
  const effectiveAvailableAgents = useMemo(() => {
    if (availableAgents.length > 0) return availableAgents;
    if (false) {
      return Object.keys(AGENT_RUNTIME).map((slug) => ({
        slug,
        name: AGENT_RUNTIME[slug]?.name ?? slug,
      }));
    }
    return [];
  }, [availableAgents]);

  const activeAgentDisplayName =
    selectedAgentSlugs.length === 0
      ? dict.chat.assistantName
      : selectedAgentSlugs.length === 1
        ? effectiveAvailableAgents.find((a) => a.slug === selectedAgentSlugs[0])?.name ??
          (agentLabel && selectedAgentSlugs[0] ? agentLabel : undefined) ??
          dict.chat.assistantName
        : `${selectedAgentSlugs.length} agenti`;

  // Gli agenti i cui tool di default leggono Gmail/Calendar richiedono una
  // connessione Google: mostra per loro il pannello di connessione in chat
  // (come quello di Shopify).
  const needsGoogle = selectedAgentSlugs.some((slug) =>
    getEnabledTools(slug).some(
      (tool) =>
        tool === "list_emails" ||
        tool === "get_calendar_events" ||
        tool.startsWith("calendar_"),
    ),
  );

  const activeWorkingApps = useMemo(() => {
    if (!isTyping || hasPartialReply || selectedAgentSlugs.length === 0) return [];
    const set = new Set<string>();
    for (const slug of selectedAgentSlugs) {
      const ag = AGENTS.find((a) => a.slug === slug);
      if (ag) ag.integrations.forEach((i) => set.add(i));
    }
    return Array.from(set)
      .slice(0, 3)
      .map((name) => {
        const integ = INTEGRATIONS.find((it) => it.name.toLowerCase() === name.toLowerCase());
        return { name, brand: integ?.brand ?? name.toLowerCase().replace(/\s+/g, ""), available: integ?.available ?? true };
      });
  }, [selectedAgentSlugs, isTyping, hasPartialReply]);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const handleMessagesScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setIsAtBottom(atBottom);
    stickToBottom.current = atBottom;
  };

  const scrollToBottom = useCallback(
    (force = false) => {
      const el = messagesRef.current;
      if (!el) return;
      if (!force && !isAtBottom && !stickToBottom.current) return;
      el.scrollTo({ top: el.scrollHeight, behavior: force ? "smooth" : "auto" });
    },
    [isAtBottom],
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Permetti sempre lo scroll manuale: se l'utente scrolla verso l'alto durante lo streaming, blocca l'auto-scroll
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const onWheel = () => {
      // Se l'utente sta scrollando verso l'alto, disattiva l'auto-scroll
      // Verrà riattivato solo quando torna in fondo o clicca il bottone
      if (el.scrollTop < el.scrollHeight - el.clientHeight - 120) {
        setIsAtBottom(false);
        stickToBottom.current = false;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", onWheel, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onWheel);
    };
  }, []);

  // Sidebar account — carica email/iniziali per gestione account in sidebar
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email ?? null;
      setSidebarUserEmail(email);
      const meta = data.session?.user?.user_metadata as { full_name?: string } | undefined;
      const base = meta?.full_name || email || "?";
      const initials = base
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("") || "?";
      setSidebarUserInitials(initials);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const email = session?.user?.email ?? null;
      setSidebarUserEmail(email);
      const meta = session?.user?.user_metadata as { full_name?: string } | undefined;
      const base = meta?.full_name || email || "?";
      const initials = base
        .split(/[\s@.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join("") || "?";
      setSidebarUserInitials(initials);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Cronologia persistente: admin e utenti normali gestiti allo stesso modo
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LocalConversation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations((prev) => (prev.length === 0 ? parsed : prev));
          const firstId = (parsed[0] as LocalConversation)?.id;
          if (firstId) setActiveId((prev) => prev ?? firstId);
        }
      }
    } catch {
      // ignora
    }
  }, []);

  useEffect(() => {
    try {
      if (conversations.length > 0) {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversations));
      } else if (initializedRef.current) {
        // mantieni la cronologia vuota come array vuoto, non cancellare subito
        // per evitare sfarfallii
      }
    } catch {
      // ignora
    }
  }, [conversations]);

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

  // Importa come conversazioni ciò che la chat demo dell'hero ha salvato in
  // localStorage: la bozza live (chat hero in corso) più ogni conversazione che
  // il bottone reset dell'hero ha archiviato. Entrambe le chiavi vengono
  // consumate all'import.
  useEffect(() => {
    try {
      type StoredMsg = {
        id?: string;
        role: "user" | "assistant";
        content: string;
        created_at?: string;
        error?: boolean;
      };
      const toConversation = (stored: StoredMsg[]): LocalConversation => ({
        id: generateId(),
        title: getConvTitle(stored as LocalMessage[], dict.chat.newChat),
        messages: stored.map((m) => ({
          id: m.id || generateId(),
          role: m.role,
          content: m.content,
          created_at: m.created_at || new Date().toISOString(),
          error: m.error,
        })),
        created_at: new Date().toISOString(),
      });

      const imported: LocalConversation[] = [];

      const draftRaw = localStorage.getItem(HERO_CONVERSATION_STORAGE_KEY);
      if (draftRaw) {
        const stored = JSON.parse(draftRaw) as StoredMsg[];
        if (Array.isArray(stored) && stored.length > 0) {
          imported.push(toConversation(stored));
        }
      }

      const historyRaw = localStorage.getItem(HERO_CONVERSATION_HISTORY_KEY);
      if (historyRaw) {
        const list = JSON.parse(historyRaw) as StoredMsg[][];
        if (Array.isArray(list)) {
          // Prima la conversazione salvata più recente: sta in cima e si apre.
          for (let i = list.length - 1; i >= 0; i--) {
            const entry = list[i];
            if (Array.isArray(entry) && entry.length > 0) {
              imported.push(toConversation(entry));
            }
          }
        }
      }

      localStorage.removeItem(HERO_CONVERSATION_STORAGE_KEY);
      localStorage.removeItem(HERO_CONVERSATION_HISTORY_KEY);

      if (imported.length > 0) {
        setConversations((prev) => [...imported, ...prev]);
        setActiveId(imported[0].id);
        return;
      }

      // Nessuna conversazione salvata da aprire: si parte da una vuota così
      // l'input è subito usabile (es. arrivando dalla CTA "Compra" del
      // marketplace su /chat?agent=...) invece di restare disabilitato.
      if (!initializedRef.current) {
        initializedRef.current = true;
        const conv: LocalConversation = {
          id: generateId(),
          title: dict.chat.newChat,
          messages: [],
          created_at: new Date().toISOString(),
        };
        setConversations([conv]);
        setActiveId(conv.id);
      }
    } catch {
      // Storage malformato — si riparte da zero.
    }
  }, []);

  function switchConversation(id: string) {
    setActiveId(id);
    setMobileSidebarOpen(false);
    const conv = conversations.find((c) => c.id === id);
    if (conv?.agentSlugs) {
      setSelectedAgentSlugs(conv.agentSlugs);
      setActiveAgentId(conv.agentSlugs[0] ?? "");
    } else {
      // fallback to current global selection
    }
  }

  function handleNewChat() {
    const conv: LocalConversation = {
      id: generateId(),
      title: dict.chat.newChat,
      messages: [],
      created_at: new Date().toISOString(),
      agentSlugs: [...selectedAgentSlugs],
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
    await sendMessage(text, convId, []);
  }

  async function sendMessage(
    text: string,
    convId: string,
    pending: ChatAttachment[] = [],
  ) {
    const apiContent = composeUserContent(text, pending);
    if (!apiContent || !convId) return;
    if (isTyping) return;
    setIsAtBottom(true);
    stickToBottom.current = true;

    const userMsg: LocalMessage = {
      id: generateId(),
      role: "user",
      content: text.trim() || pending.map((a) => a.name).join(", "),
      created_at: new Date().toISOString(),
      attachments: pending.map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        previewUrl: a.previewUrl,
      })),
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
    setHasPartialReply(false);

    // Aggiorna un singolo messaggio dell'assistente man mano che lo stream
    // arriva. Restituisce l'id stabile così i chunk successivi aggiornano la
    // stessa bolla. Quando `error` è impostato la bolla nasce come messaggio
    // di errore (nessuna risposta AI), con un link di contatto sotto.
    const patchAssistant = (
      assistantId: string,
      content: string,
      error = false,
    ) => {
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
                        error: error || undefined,
                      },
                    ],
              }
            : c,
        ),
      );
    };

    // Usa sempre il backend AI reale — nessuna risposta preimpostata. In caso
    // di errore si mostra una chiara bolla di errore con link di contatto.
    let responseText = "";
    // Messaggio di errore lato server (localizzato) catturato dallo stream SSE.
    let streamErrorMessage: string | null = null;
    try {
      // Invia l'intera cronologia della conversazione così l'AI resta coerente
      // nei messaggi successivi (e risponde sempre sui dati piattaforma più
      // recenti).
      const history =
        conversations.find((c) => c.id === convId)?.messages ?? [];
      const apiMessages = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: apiContent },
      ];
      const filesMap = toFilesMap(pending);

      // L'utente può inserire quanti agenti vuole nella conversazione (selectedAgentSlugs).
      // Se nessun agente è selezionato → chat generica. Se uno o più → loop su /api/agent/run.
      const targetSlugs = [...selectedAgentSlugs];
      // Persisti la selezione nella conversazione per cronologia
      if (targetSlugs.length > 0 && convId) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, agentSlugs: [...targetSlugs] } : c)),
        );
      }

      async function streamOne(
        url: string,
        body: Record<string, unknown>,
        label?: string,
      ) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          let serverMessage: string | null = null;
          try {
            const data = (await res.json()) as { error?: string };
            if (data && typeof data.error === "string" && data.error.trim()) {
              serverMessage = data.error;
            }
          } catch {}
          if (serverMessage) streamErrorMessage = serverMessage;
          throw new Error("AI backend error");
        }
        if (!res.body) throw new Error("AI backend unavailable");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantId = "";
        let localText = "";
        const prefix = label ? `**${label}:**\n\n` : "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            let json: { type?: string; content?: string; message?: string };
            try {
              json = JSON.parse(line.slice(6));
            } catch {
              continue;
            }
            if (json.type === "text" && typeof json.content === "string") {
              localText += json.content;
              responseText += json.content;
              if (!assistantId) {
                assistantId = generateId();
                setHasPartialReply(true);
              }
              patchAssistant(assistantId, prefix + localText);
            }
            if (json.type === "error") {
              streamErrorMessage =
                typeof json.message === "string" && json.message.trim() ? json.message : null;
              throw new Error("AI backend error");
            }
            if (json.type === "done") break;
          }
        }
        if (!localText.trim()) throw new Error("Empty response");
      }

      if (targetSlugs.length === 0) {
        await streamOne("/api/chat", { messages: apiMessages });
      } else if (targetSlugs.length === 1) {
        await streamOne("/api/agent/run", {
          agentId: targetSlugs[0],
          messages: apiMessages,
          files: Object.keys(filesMap).length > 0 ? filesMap : undefined,
        });
      } else {
        for (const slug of targetSlugs) {
          const ag = effectiveAvailableAgents.find((a) => a.slug === slug);
          const label = ag?.name ?? slug;
          try {
            await streamOne(
              "/api/agent/run",
              {
                agentId: slug,
                messages: apiMessages,
                files: Object.keys(filesMap).length > 0 ? filesMap : undefined,
              },
              label,
            );
          } catch (e) {
            // Continua con gli altri agenti anche se uno fallisce
            console.error(`Agent ${slug} failed`, e);
          }
        }
        if (!responseText.trim()) throw new Error("Empty response");
      }
    } catch {
      // Niente risposte preimpostate: mostra l'errore reale con un link di contatto.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const message =
        // @ts-ignore — streamErrorMessage è string | null ma TS lo inferisce never per control flow
        (streamErrorMessage as unknown as string | null)?.trim()
          ? (streamErrorMessage as unknown as string)
          : dict.common.aiUnavailable;
      const assistantId = generateId();
      setHasPartialReply(true);
      patchAssistant(assistantId, message, true);
    }

    setIsTyping(false);
    // Notifica alla campanella che potrebbero esserci nuove notifiche agente
    try {
      window.dispatchEvent(new CustomEvent("agentcloud:notifications-refresh"));
    } catch {}
  }

  async function handleSend() {
    const text = input.trim();
    if ((!text && attach.attachments.length === 0) || !activeId) return;
    const pending = attach.take();
    setInput("");
    inputRef.current?.focus();
    await sendMessage(text, activeId, pending);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleAppHeaderToggle() {
    // Su desktop (>=lg) apre/chiude la sidebar persistente, su mobile l'overlay.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarOpen((v) => !v);
    }
  }

  function handleReplyToPhrase(phrase: string) {
    const quoted = `> ${phrase.trim()}\n\n`;
    setInput((prev) => (prev ? prev + "\n" + quoted : quoted));
    // Porta il focus sull'input
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="flex h-dvh bg-neutral-950">
      {/* Overlay sidebar mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — full height, contiene anche gestione account */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-72 bg-neutral-950 border-r border-white/5 h-dvh
            flex flex-col transition-all duration-300 shrink-0
            ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            ${sidebarOpen ? "lg:w-72 lg:translate-x-0" : "lg:w-0 lg:overflow-hidden lg:border-0 lg:opacity-0"}
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

        <nav className="px-3 pt-3 pb-1 space-y-1">
          <Link
            href="/"
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Home size={16} />
            {dict.chat.home}
          </Link>
          <div className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-brand-400 bg-brand-500/10 border border-brand-500/20">
            <MessageSquare size={16} />
            {dict.chat.chat}
          </div>
          <Link
            href="/integrations"
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Wrench size={16} />
            {dict.chat.tools}
          </Link>
          <Link
            href="/agents"
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Bot size={16} />
            {dict.chat.agents}
          </Link>
        </nav>

        {/* Strumenti attivi per l'agente corrente */}
        {activeAgentId && getEnabledTools(activeAgentId).length > 0 && (
          <div className="px-3 pt-1 pb-1">
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-widest px-3 py-2">
              {dict.chat.tools}
            </p>
            <div className="space-y-1">
              {getEnabledTools(activeAgentId).map((tool) => (
                <div
                  key={tool}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs font-semibold text-neutral-400"
                >
                  <Wrench size={12} />
                  {tool}
                </div>
              ))}
            </div>
          </div>
        )}

        {effectiveAvailableAgents.length > 0 && (
          <div className="px-3 pt-1 pb-1">
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-widest px-3 py-2">
              {dict.chat.agents}
            </p>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveAgentId("");
                  setSelectedAgentSlugs([]);
                  if (activeId) {
                    setConversations((prev) =>
                      prev.map((c) => (c.id === activeId ? { ...c, agentSlugs: [] } : c)),
                    );
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  selectedAgentSlugs.length === 0
                    ? "bg-white/5 text-white border border-white/5"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Bot size={14} className="shrink-0" />
                <span className="truncate">{dict.chat.assistantName}</span>
              </button>
              {effectiveAvailableAgents.map((a) => (
                <button
                  key={a.slug}
                  onClick={() => {
                    setActiveAgentId(a.slug);
                    setSelectedAgentSlugs([a.slug]);
                    if (activeId) {
                      setConversations((prev) =>
                        prev.map((c) => (c.id === activeId ? { ...c, agentSlugs: [a.slug] } : c)),
                      );
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    selectedAgentSlugs.length === 1 && selectedAgentSlugs[0] === a.slug
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
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => switchConversation(conv.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    switchConversation(conv.id);
                  }
                }}
                className={`group flex w-full cursor-pointer flex-col gap-1 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  conv.id === activeId
                    ? "bg-white/5 text-white border border-white/5"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex w-full items-center gap-2.5">
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
                </div>
                {conv.agentSlugs && conv.agentSlugs.length > 0 && (
                  <div className="ml-6 flex flex-wrap gap-1">
                    {conv.agentSlugs.map((slug) => {
                      const ag = effectiveAvailableAgents.find((a) => a.slug === slug);
                      return (
                        <span
                          key={slug}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-300"
                        >
                          <Bot size={10} />
                          {ag?.name ?? slug}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-white/5 space-y-2">
          {/* Account — gestione spostata dalla header alla sidebar */}
          <div className="rounded-xl border border-white/5 bg-neutral-900 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                {sidebarUserInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">
                  {sidebarUserEmail ?? "Ospite"}
                </p>
                <p className="text-[11px] text-neutral-500">Account</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <Link
                href="/account"
                className="flex items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs font-bold text-white hover:bg-white/10"
              >
                <User size={12} />
                Account
              </Link>
              <Link
                href="/settings"
                className="flex items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs font-bold text-white hover:bg-white/10"
              >
                <Settings size={12} />
                {dict.chat.agents === "Agenti" ? "Impostazioni" : "Settings"}
              </Link>
              <Link
                href="/cart"
                className="flex items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs font-bold text-white hover:bg-white/10"
              >
                <ShoppingCart size={12} />
                Carrello
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-xs font-bold text-white hover:bg-white/10"
              >
                <Home size={12} />
                Dashboard
              </Link>
            </div>
            {sidebarUserEmail ? (
              <button
                onClick={async () => {
                  await createClient().auth.signOut();
                  window.location.href = "/";
                }}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-red-500/10 px-2 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/15"
              >
                <LogOut size={12} />
                Esci
              </button>
            ) : (
              <Link
                href="/login"
                className="mt-2 flex w-full items-center justify-center rounded-lg bg-brand-500 px-2 py-1.5 text-xs font-bold text-white hover:bg-brand-400"
              >
                Accedi
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 px-2 py-1">
            <Image src="/agentcloud.png" alt="AgentCloud" width={14} height={14} />
            <span className="text-xs font-semibold text-neutral-600">
              AgentCloud <span className="text-purple-400">v2.1</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AppHeader
          variant="chat"
          agentLabel={activeAgentDisplayName}
          sidebarOpen={sidebarOpen || mobileSidebarOpen}
          onToggleSidebar={handleAppHeaderToggle}
        />
        <div className="flex flex-1 overflow-hidden relative">
          {/* Trigger sidebar su mobile */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden fixed bottom-6 left-4 z-10 w-11 h-11 bg-brand-500 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 hover:bg-brand-400 transition-all"
            title="Open sidebar"
          >
            <MessageSquare size={18} className="text-white" />
          </button>

          {/* Area chat principale */}
          <main
            className="flex-1 flex flex-col bg-neutral-900 relative"
        onDragEnter={attach.onDragEnter}
        onDragOver={attach.onDragOver}
        onDragLeave={attach.onDragLeave}
        onDrop={attach.makeDrop(attachLabels)}
      >
        {/* Intestazione chat — Claude-style clean header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewChat}
              title={dict.chat.newChat}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Plus size={16} />
            </button>
            <div>
              <p className="text-sm font-semibold text-white">
                {activeAgentDisplayName}
              </p>
              {isTyping && (
                <span className="inline-flex items-center gap-1.5 text-xs text-brand-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                  {dict.chat.thinking}
                </span>
              )}
            </div>
          </div>
        </div>

        {activeAgentId === SHOPIFY_AGENT_SLUG && <ShopifyConnectionPrompt />}
        {needsGoogle && <GoogleConnectionPrompt />}

        {/* Messaggi */}          <div
          ref={messagesRef}
          onScroll={handleMessagesScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 mx-auto max-w-content"
        >
          {messages.length === 0 && !isTyping ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/5">
                <Image
                  src="/agentcloud.png"
                  alt="AgentCloud"
                  width={40}
                  height={40}
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {dict.chat.emptyTitle}
              </h2>
              <p className="text-sm text-neutral-400 max-w-md leading-relaxed">
                {dict.chat.emptySubtitle}
              </p>
              {effectiveAvailableAgents.length > 0 && (
                <div className="mt-6 w-full max-w-md">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                    {dict.chat.agents}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => setActiveAgentId("")}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors ${activeAgentId === "" ? "bg-brand-500 text-white" : "border border-white/10 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"}`}
                    >
                      <Bot size={14} />
                      {dict.chat.assistantName}
                    </button>
                    {effectiveAvailableAgents.map((a) => (
                      <button
                        key={a.slug}
                        onClick={() => {
                          setActiveAgentId(a.slug);
                          setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors ${activeAgentId === a.slug ? "bg-brand-500 text-white" : "border border-white/10 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"}`}
                      >
                        <Bot size={14} />
                        {a.name}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-neutral-600">
                    {activeAgentId
                      ? `${dict.chat.agents} — ${activeAgentDisplayName}`
                      : dict.chat.assistantName}
                  </p>
                </div>
              )}
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
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/5 mt-0.5">
                    <Image
                      src="/agentcloud.png"
                      alt="AgentCloud"
                      width={16}
                      height={16}
                      className="w-4 h-4"
                    />
                  </div>
                )}
                <div
                  className={`max-w-[75%] sm:max-w-[65%] ${msg.role === "user" ? "order-1" : ""} w-full`}
                >
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "whitespace-pre-wrap bg-white/5 text-white rounded-2xl rounded-br-md border border-white/5"
                        : "text-neutral-200"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <>
                        <MarkdownText text={msg.content} onReply={handleReplyToPhrase} />
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
                                  className="max-h-36 max-w-45 rounded-lg object-cover"
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
                  <div className="w-7 h-7 rounded-lg bg-neutral-700 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">U</span>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Export buttons - show when there are messages */}
          {messages.length > 0 && (
            <div className="flex justify-center py-2">
              <ExportReportButton
                type="chat"
                messages={messages.map((m) => ({
                  role: m.role,
                  content: m.content,
                  agentName: m.role === "assistant" ? (activeAgentDisplayName || "Assistente") : undefined,
                  timestamp: m.created_at,
                }))}
                agentName={activeAgentDisplayName || "AgentCloud"}
                agentSlug={activeAgentId || "agent"}
              />
            </div>
          )}

          {isTyping && !hasPartialReply && (
            <div className="flex items-start gap-3">
              <Image
                src="/agentcloud.png"
                alt="AgentCloud"
                width={32}
                height={32}
                className="w-8 h-8 shrink-0"
              />
              <div className="max-w-[85%]">
                {activeWorkingApps.length > 0 ? (
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20">
                      <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {locale === "it" ? "Sta lavorando su" : "Working on"}
                      <span className="flex items-center gap-1 flex-wrap">
                        {activeWorkingApps.map((a) => (
                          <span key={a.name} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                            <BrandLogo slug={a.brand} size={12} />
                            {a.name}
                          </span>
                        ))}
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                    {dict.chat.thinking}
                  </div>
                )}
                <div className="bg-neutral-800 border border-white/5 rounded-2xl rounded-bl-md px-4 py-3.5">
                  <div className="flex gap-1.5 items-center h-4">
                    <span className="w-2 h-2 bg-neutral-400 rounded-full animate-typing-pulse" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-neutral-400 rounded-full animate-typing-pulse" style={{ animationDelay: "200ms" }} />
                    <span className="w-2 h-2 bg-neutral-400 rounded-full animate-typing-pulse" style={{ animationDelay: "400ms" }} />
                  </div>
                </div>
                {activeWorkingApps.length > 0 && (
                  <p className="mt-1.5 text-xs font-medium text-neutral-500">
                    {locale === "it" ? "L'agente sta operando sull'app collegata" : "Agent is working on the connected app"}
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {!isAtBottom && messages.length > 0 && (
          <button
            onClick={() => {
              setIsAtBottom(true);
              stickToBottom.current = true;
              scrollToBottom(true);
            }}
            className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-neutral-800 border border-white/10 px-3 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-neutral-700"
          >
            <ChevronDown size={12} />
            Vai in fondo
          </button>
        )}

        {/* Input area — toggle blu rimosso come richiesto */}
        <div
          className="px-4 sm:px-6 py-4 bg-neutral-900/80 backdrop-blur-sm border-t border-white/5"
          onDragEnter={attach.onDragEnter}
          onDragOver={attach.onDragOver}
          onDragLeave={attach.onDragLeave}
          onDrop={attach.makeDrop(attachLabels)}
        >
          <div className="relative mx-auto max-w-content">
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
            {/* Agenti selezionati per questa conversazione — l'utente può inserirne quanti vuole */}
            {selectedAgentSlugs.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selectedAgentSlugs.map((slug) => {
                  const ag = effectiveAvailableAgents.find((a) => a.slug === slug);
                  return (
                    <span
                      key={slug}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 border border-brand-500/20 px-2.5 py-1 text-xs font-bold text-brand-300"
                    >
                      <Bot size={12} />
                      {ag?.name ?? slug}
                      <button
                        type="button"
                        onClick={() => {
                          const next = selectedAgentSlugs.filter((s) => s !== slug);
                          setSelectedAgentSlugs(next);
                          setActiveAgentId(next[0] ?? "");
                          if (activeId) {
                            setConversations((prev) =>
                              prev.map((c) => (c.id === activeId ? { ...c, agentSlugs: next } : c)),
                            );
                          }
                        }}
                        className="ml-1 rounded-full p-0.5 hover:bg-white/10"
                      >
                        <Trash2 size={10} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAgentPickerOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-neutral-300 hover:bg-white/10 hover:text-white"
              >
                <Bot size={12} />
                {selectedAgentSlugs.length === 0
                  ? dict.chat.agents
                  : `${dict.chat.agents} (${selectedAgentSlugs.length})`}
                <ChevronDown size={12} className={`${agentPickerOpen ? "rotate-180" : ""} transition-transform`} />
              </button>
              <span className="text-xs text-neutral-600">
                {selectedAgentSlugs.length === 0
                  ? dict.chat.assistantName
                  : selectedAgentSlugs.map((s) => effectiveAvailableAgents.find((a) => a.slug === s)?.name ?? s).join(", ")}
              </span>
            </div>
            {agentPickerOpen && (
              <div className="mb-2 rounded-xl border border-white/10 bg-neutral-900 p-2 shadow-xl">
                <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-neutral-500">
                  {dict.chat.agents}
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {effectiveAvailableAgents.map((a) => {
                    const checked = selectedAgentSlugs.includes(a.slug);
                    return (
                      <label
                        key={a.slug}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            let next: string[];
                            if (e.target.checked) next = [...selectedAgentSlugs, a.slug];
                            else next = selectedAgentSlugs.filter((s) => s !== a.slug);
                            setSelectedAgentSlugs(next);
                            setActiveAgentId(next[0] ?? "");
                            if (activeId) {
                              setConversations((prev) =>
                                prev.map((c) => (c.id === activeId ? { ...c, agentSlugs: next } : c)),
                              );
                            }
                          }}
                          className="h-3 w-3 rounded border-white/10 bg-neutral-800 text-brand-500 focus:ring-brand-500"
                        />
                        <Bot size={12} className="text-neutral-400" />
                        <span className="text-xs font-semibold text-neutral-200">{a.name}</span>
                      </label>
                    );
                  })}
                </div>
                {effectiveAvailableAgents.length === 0 && (
                  <p className="px-2 py-2 text-xs text-neutral-500">{dict.chat.noConversations}</p>
                )}
              </div>
            )}
            <div className="flex items-end gap-2 bg-neutral-800 rounded-2xl border border-white/10 px-4 py-3 focus-within:border-brand-500/50 focus-within:shadow-lg focus-within:shadow-brand-500/5 transition-all">
            <AttachPlusButton
              labels={attachLabels}
              disabled={isTyping}
              onPick={(files) => attach.addFiles(files, attachLabels)}
            />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={attach.makePaste(attachLabels)}
              placeholder={dict.chat.placeholder}
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 resize-none outline-none min-h-6 max-h-30 leading-relaxed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={handleSend}
              disabled={
                (!input.trim() && attach.attachments.length === 0) ||
                isTyping ||
                !activeId
              }
              aria-label={dict.chat.sendMessage}
              title={dict.chat.sendMessage}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-500 text-white hover:bg-brand-400 disabled:bg-neutral-700 disabled:text-neutral-500 transition-all shrink-0 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
            >
              <Send size={16} />
            </button>
            </div>
          </div>
          <p className="text-[10px] text-neutral-600 text-center mt-2">
            {dict.chat.disclaimer}
          </p>
        </div>
        </main>
        </div>
      </div>
    </div>
  );
}
