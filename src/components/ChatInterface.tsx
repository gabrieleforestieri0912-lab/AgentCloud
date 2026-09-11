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
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  MessageSquare,
  Plus,
  Trash2,
  PanelLeftClose,
  Send,
  Home,
  ChevronDown,
  Wrench,
  Bot,
  ShoppingCart,
  User,
  Settings,
  LogOut,
  CheckCircle2,
  Clock3,
  ArrowRight,
  Pencil,
  Archive,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/email-config";
import { useLanguage } from "./LanguageProvider";
import MarkdownText from "./MarkdownText";
import VoiceInput from "./VoiceInput";
import AppHeader from "./AppHeader";
import ShopifyConnectionPrompt from "@/components/ShopifyConnectionPrompt";
import GoogleConnectionPrompt from "@/components/GoogleConnectionPrompt";
import ChatOnboarding from "./ChatOnboarding";
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
  archived_at?: string;
  deleted_at?: string;
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState(initialQuery || "");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  // True da quando la risposta corrente dell'assistente ha iniziato lo
  // streaming (la bolla cresce parola per parola). L'indicatore a tre puntini
  // appare solo prima dell'arrivo della prima parola — mentre la macchina da
  // scrivere è in funzione, i puntini restano nascosti.
  const [hasPartialReply, setHasPartialReply] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarSession, setSidebarSession] = useState<import("@supabase/supabase-js").Session | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  // Start as true to avoid flash — session loads in background
  const [sidebarAuthLoaded, setSidebarAuthLoaded] = useState(true);
  // L'input parte centrato nella pagina; dopo il primo messaggio si sposta in basso
  const [inputCentered, setInputCentered] = useState(true);
  // Pannello attivo nella sidebar: chat, tools o agents
  const [sidebarView, setSidebarView] = useState<"chat" | "tools" | "agents">("chat");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showAgentPicker, setShowAgentPicker] = useState(false);
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

  // Suggerimenti dinamici basati sugli agenti posseduti dall'utente
  const dynamicSuggestions = useMemo(() => {
    const owned = availableAgents.filter((a) => a.slug !== "");
    if (owned.length > 0) {
      // Prendi 4 task da agenti diversi (o ripeti se ne hai meno di 4)
      const tasks: string[] = [];
      for (const agent of owned) {
        const agentData = AGENTS.find((a) => a.slug === agent.slug);
        if (agentData?.tasks) {
          for (const task of agentData.tasks) {
            if (tasks.length < 4 && !tasks.includes(task)) tasks.push(task);
          }
        }
      }
      // Se non abbastanza task, aggiungi quelli generici
      const fallback = [
        dict.chat.suggestion1,
        dict.chat.suggestion2,
        dict.chat.suggestion3,
        dict.chat.suggestion4,
      ];
      while (tasks.length < 4) {
        const f = fallback[tasks.length];
        if (f && !tasks.includes(f)) tasks.push(f); else break;
      }
      return tasks.slice(0, 4);
    }
    // Nessun agente posseduto: suggerimenti generici
    return [
      dict.chat.suggestion1,
      dict.chat.suggestion2,
      dict.chat.suggestion3,
      dict.chat.suggestion4,
    ];
  }, [availableAgents, dict.chat]);

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
  const isAtBottomRef = useRef(true);
  const handleMessagesScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setIsAtBottom(atBottom);
    isAtBottomRef.current = atBottom;
    stickToBottom.current = atBottom;
  };

  const scrollToBottom = useCallback(
    (force = false) => {
      const el = messagesRef.current;
      if (!el) return;
      // Usa il ref durante lo streaming (aggiornato istantaneamente)
      // e lo stato per le altre occasioni
      const atBottom = force || isAtBottomRef.current || stickToBottom.current;
      if (!atBottom) return;
      el.scrollTo({ top: el.scrollHeight, behavior: force ? "smooth" : "auto" });
    },
    [],
  );

  // Scroll quando i messaggi cambiano (incluso durante streaming)
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Scroll quando inizia/finisce lo streaming
  useEffect(() => {
    if (isTyping) scrollToBottom(true);
  }, [isTyping, scrollToBottom]);

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

  // Sidebar account — usa lo stesso pattern affidabile di SidebarAccount:
  // salva l'intero Session object, ha mounted guard, e usa onAuthStateChange
  // come fonte primaria + getSession() come fallback dopo 1s.
  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    // onAuthStateChange è la fonte primaria — viene chiamato subito con la sessione corrente
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSidebarSession(nextSession);
      setSidebarAuthLoaded(true);
    });

    // Fallback: se onAuthStateChange non si attiva entro 1s, prova getSession
    const fallback = setTimeout(() => {
      if (!mounted) return;
      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        setSidebarSession(data.session);
        setSidebarAuthLoaded(true);
      }).catch(() => {});
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(fallback);
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Check onboarding state
  useEffect(() => {
    fetch("/api/user/onboarding")
      .then((r) => r.json())
      .then((data: { chat?: boolean }) => {
        if (data.chat === false) setShowOnboarding(true);
      })
      .catch(() => {});
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

  function handleArchive(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived_at: c.archived_at ? undefined : new Date().toISOString() } : c))
    );
  }

  function startRename(id: string, currentTitle: string) {
    setRenamingId(id);
    setRenameValue(currentTitle);
  }

  function confirmRename(id: string) {
    if (!renameValue.trim()) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: renameValue.trim() } : c))
    );
    setRenamingId(null);
    setRenameValue("");
  }

  function handleAddAgentToConversation(slug: string) {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const slugs = c.agentSlugs ?? [];
        if (slugs.includes(slug)) return c;
        if (slugs.length >= 5) return c;
        return { ...c, agentSlugs: [...slugs, slug] };
      })
    );
    setShowAgentPicker(false);
  }

  function handleRemoveAgentFromConversation(slug: string) {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        return { ...c, agentSlugs: (c.agentSlugs ?? []).filter((s) => s !== slug) };
      })
    );
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
    if (inputCentered) setInputCentered(false);

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
      {/* Chat onboarding tour */}
      {showOnboarding && (
        <ChatOnboarding onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Overlay sidebar mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — glassmorphism style matching header */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-72 bg-neutral-950/80 backdrop-blur-2xl border-r border-white/[0.06] h-dvh
            flex flex-col transition-all duration-300 shrink-0 overflow-y-auto
            ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            ${sidebarOpen ? "lg:w-72 lg:translate-x-0" : "lg:w-0 lg:overflow-hidden lg:border-0 lg:opacity-0"}
          `}
        >
        {/* Header: Close sidebar (left) + Home (right) */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <button
            onClick={() => {
              setMobileSidebarOpen(false);
              setSidebarOpen(false);
            }}
            aria-label={dict.chat.closeSidebar}
            className="w-11 h-11 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <PanelLeftClose size={18} />
          </button>
          <Link
            href="/"
            data-onboard="home"
            className="w-11 h-11 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <Home size={18} />
          </Link>
        </div>

        {/* Navigation — pill style: Chat / Tools / Agents */}
        <nav data-onboard="nav" className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <button
              onClick={() => setSidebarView("chat")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                sidebarView === "chat"
                  ? "bg-white text-neutral-900 shadow-lg shadow-white/5"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">{dict.chat.chat}</span>
            </button>
            <button
              onClick={() => setSidebarView("tools")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                sidebarView === "tools"
                  ? "bg-white text-neutral-900 shadow-lg shadow-white/5"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Wrench size={14} />
              <span className="hidden sm:inline">{dict.chat.tools}</span>
            </button>
            <button
              onClick={() => setSidebarView("agents")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                sidebarView === "agents"
                  ? "bg-white text-neutral-900 shadow-lg shadow-white/5"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Bot size={14} />
              <span className="hidden sm:inline">{dict.chat.agents}</span>
            </button>
          </div>
        </nav>

        {/* New Chat button */}
        <div className="px-3 pb-2">
          <button
            data-onboard="new-chat"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-white text-neutral-900 text-sm font-bold py-2.5 px-4 rounded-full transition-all hover:bg-neutral-100 shadow-lg shadow-white/5"
          >
            <Plus size={16} strokeWidth={2.5} />
            {dict.chat.newChat}
          </button>
        </div>

        {/* Conversations list */}
        <div data-onboard="conversations" className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
              {showArchived ? (locale === "it" ? "Archiviate" : "Archived") : dict.chat.conversations}
            </p>
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-[10px] font-bold text-neutral-500 hover:text-white transition-all"
            >
              {showArchived
                ? locale === "it"
                  ? "Attive"
                  : "Active"
                : locale === "it"
                ? "Archiviate"
                : "Archived"}
            </button>
          </div>
          {conversations.filter((c) => showArchived ? c.archived_at && !c.deleted_at : !c.archived_at && !c.deleted_at).length === 0 ? (
            <p className="text-xs text-neutral-600 px-3 py-6 text-center">
              {showArchived
                ? locale === "it"
                  ? "Nessuna conversazione archiviata"
                  : "No archived conversations"
                : dict.chat.noConversations}
            </p>
          ) : (
            conversations
              .filter((c) => showArchived ? c.archived_at && !c.deleted_at : !c.archived_at && !c.deleted_at)
              .map((conv) => (
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
                className={`group flex w-full cursor-pointer flex-col gap-1 px-3 py-2.5 rounded-xl text-sm text-left transition-all ${
                  conv.id === activeId
                    ? "bg-white/[0.06] text-white border border-white/[0.08]"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex w-full items-center gap-2.5">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-lg shrink-0 ${
                    conv.id === activeId ? "bg-brand-500/15" : "bg-white/5"
                  }`}>
                    <MessageSquare
                      size={12}
                      className={`${conv.id === activeId ? "text-brand-400" : "text-neutral-500"}`}
                    />
                  </div>
                  {renamingId === conv.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename(conv.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => confirmRename(conv.id)}
                      className="flex-1 bg-transparent border-b border-brand-500 text-white text-sm outline-none px-0 py-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate flex-1 font-medium">{conv.title}</span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-all shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(conv.id, conv.title); }}
                      className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-white/10 text-neutral-500 hover:text-white transition-all"
                      title={locale === "it" ? "Rinomina" : "Rename"}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => handleArchive(e, conv.id)}
                      className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-white/10 text-neutral-500 hover:text-white transition-all"
                      title={conv.archived_at ? (locale === "it" ? "Ripristina" : "Restore") : (locale === "it" ? "Archivia" : "Archive")}
                    >
                      {conv.archived_at ? <RotateCcw size={12} /> : <Archive size={12} />}
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-red-500/15 text-neutral-500 hover:text-red-400 transition-all"
                      title={dict.chat.deleteConversation}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {conv.agentSlugs && conv.agentSlugs.length > 0 && (
                  <div className="ml-8 flex flex-wrap gap-1">
                    {conv.agentSlugs.map((slug) => {
                      const ag = effectiveAvailableAgents.find((a) => a.slug === slug);
                      return (
                        <span
                          key={slug}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-300"
                        >
                          <Bot size={8} />
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

        {/* Account section — modern pill style */}
        <div data-onboard="account" className="p-3 border-t border-white/[0.06]">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setAccountMenuOpen((v) => !v)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 text-xs font-bold text-brand-300 shrink-0 overflow-hidden ring-2 ring-white/[0.06]">
                {sidebarSession?.user?.user_metadata?.avatar_url || sidebarSession?.user?.user_metadata?.picture ? (
                  <img src={(sidebarSession.user.user_metadata.avatar_url || sidebarSession.user.user_metadata.picture) as string} alt="" className="h-full w-full object-cover" />
                ) : sidebarAuthLoaded ? (
                  (sidebarSession?.user?.user_metadata?.full_name || sidebarSession?.user?.email || "?")
                    .split(/[\s@.]+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s: string) => s[0]?.toUpperCase())
                    .join("") || "?"
                ) : (
                  <span className="animate-pulse">…</span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-bold text-white">
                  {sidebarSession?.user?.email || "…"}
                </p>
                <p className="text-[10px] text-neutral-500 font-medium">Account</p>
              </div>
              <ChevronDown size={14} className={`shrink-0 text-neutral-500 transition-transform duration-200 ${accountMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {accountMenuOpen && (
              <div className="px-3 pb-3 space-y-1 border-t border-white/[0.06]">
                <div className="grid grid-cols-2 gap-1.5 pt-2">
                  <Link
                    href="/account"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-all"
                  >
                    <User size={12} />
                    Account
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-all"
                  >
                    <Settings size={12} />
                    {locale === "it" ? "Impostazioni" : "Settings"}
                  </Link>
                  <Link
                    href="/cart"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-all"
                  >
                    <ShoppingCart size={12} />
                    {locale === "it" ? "Carrello" : "Cart"}
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-2 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-all"
                  >
                    <Home size={12} />
                    Dashboard
                  </Link>
                </div>
                <button
                  onClick={async () => {
                    try { await createClient().auth.signOut(); } catch {}
                    window.location.replace("/waitlist");
                  }}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-500/10 px-2 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/15 transition-all"
                >
                  <LogOut size={12} />
                  {locale === "it" ? "Esci" : "Sign out"}
                </button>
              </div>
            )}
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
        {/* Header — always shown */}
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
                {sidebarView === "tools" ? dict.chat.tools : sidebarView === "agents" ? dict.chat.agents : activeAgentDisplayName}
              </p>
              {sidebarView === "chat" && isTyping && (
                <span className="inline-flex items-center gap-1.5 text-xs text-brand-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                  {dict.chat.thinking}
                </span>
              )}
            </div>
          </div>
        </div>

        {sidebarView === "chat" && activeAgentId === SHOPIFY_AGENT_SLUG && <ShopifyConnectionPrompt />}
        {sidebarView === "chat" && needsGoogle && <GoogleConnectionPrompt />}

        {/* ── Tools panel ────────────────────────────────────── */}
        {sidebarView === "tools" && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">{dict.chat.tools}</h2>
                <p className="text-sm text-neutral-400">
                  {locale === "it"
                    ? "Collega AgentCloud ai tuoi strumenti. Ogni integrazione viene gestita dall'agente corrispondente."
                    : "Connect AgentCloud to your tools. Each integration is managed by its corresponding agent."}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INTEGRATIONS.filter((i) => i.available).map((integ) => (
                  <div key={integ.name} className="flex items-center gap-3 rounded-xl border border-white/5 bg-neutral-800/50 px-4 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                      <BrandLogo slug={integ.brand} size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{integ.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{integ.description}</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <CheckCircle2 size={10} />
                      {locale === "it" ? "Attivo" : "Active"}
                    </span>
                  </div>
                ))}
              </div>
              {INTEGRATIONS.filter((i) => !i.available).length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                    {locale === "it" ? "Prossimamente" : "Coming soon"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INTEGRATIONS.filter((i) => !i.available).map((integ) => (
                      <div key={integ.name} className="flex items-center gap-3 rounded-xl border border-white/5 bg-neutral-800/30 px-4 py-3 opacity-60">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                          <BrandLogo slug={integ.brand} size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{integ.name}</p>
                          <p className="text-xs text-neutral-500 truncate">{integ.description}</p>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-neutral-500/10 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                          <Clock3 size={10} />
                          {locale === "it" ? "In arrivo" : "Soon"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Agents panel ────────────────────────────────────── */}
        {sidebarView === "agents" && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">{dict.chat.agents}</h2>
                <p className="text-sm text-neutral-400">
                  {locale === "it"
                    ? "Sfoglia il catalogo agenti e acquista quelli di cui hai bisogno."
                    : "Browse the agent catalog and purchase the ones you need."}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AGENTS.map((agent) => (
                  <Link
                    key={agent.slug}
                    href={`/agents/${agent.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-neutral-800/50 px-4 py-3 hover:bg-neutral-800 hover:border-white/10 transition-all"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/20 to-purple-500/20">
                      <Bot size={20} className="text-brand-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{agent.description}</p>
                    </div>
                    <ArrowRight size={14} className="text-neutral-600 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Chat panel ────────────────────────────────────── */}
        {sidebarView === "chat" && (
        <AnimatePresence mode="wait" initial={false}>
          {messages.length === 0 && !isTyping ? (
            <motion.div
              key="centered"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-1 flex flex-col items-center justify-center px-4"
            >
              {/* Welcome message */}
              <div className="mb-8 text-center">
                <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/5">
                  <Image
                    src="/agentcloud.png"
                    alt="AgentCloud"
                    width={40}
                    height={40}
                  />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {dict.chat.emptyTitle}
                </h2>
                <p className="text-base text-neutral-400 max-w-lg leading-relaxed">
                  {dict.chat.emptySubtitle}
                </p>
              </div>

              {/* Input ridotto centrato */}
              <div className="w-full max-w-2xl px-4">
                <div
                  onDragEnter={attach.onDragEnter}
                  onDragOver={attach.onDragOver}
                  onDragLeave={attach.onDragLeave}
                  onDrop={attach.makeDrop(attachLabels)}
                >
                  <div className="relative">
                    <DropHint visible={attach.dragOver} text={attachLabels.dropHint} />
                    <AttachmentChips
                      items={attach.attachments}
                      onRemove={attach.remove}
                      removeLabel={(name) => dict.chat.removeAttachment.replace("{name}", name)}
                    />
                    {attach.notice && <p className="mb-2 text-xs text-amber-400">{attach.notice}</p>}
                    <div className="flex items-center gap-2 bg-neutral-800 rounded-2xl border border-white/10 px-4 py-3 focus-within:border-brand-500/50 focus-within:shadow-lg focus-within:shadow-brand-500/5 transition-all">
                      <AttachPlusButton labels={attachLabels} disabled={isTyping} onPick={(files) => attach.addFiles(files, attachLabels)} />
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
                      <VoiceInput onTranscript={(text) => setInput((prev) => prev + (prev ? " " : "") + text)} onVoiceModeToggle={setIsVoiceMode} disabled={isTyping || !activeId} isVoiceMode={isVoiceMode} />
                      <button
                        onClick={handleSend}
                        disabled={(!input.trim() && attach.attachments.length === 0) || isTyping || !activeId}
                        aria-label={dict.chat.sendMessage}
                        title={dict.chat.sendMessage}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-500 text-white hover:bg-brand-400 disabled:bg-neutral-700 disabled:text-neutral-500 transition-all shrink-0 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-600 text-center mt-2">{dict.chat.disclaimer}</p>
                </div>
              </div>

              {/* Suggerimenti dinamici */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl px-4">
                {dynamicSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(suggestion);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-neutral-300 hover:bg-white/[0.06] hover:border-brand-500/30 hover:text-white transition-all duration-200"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 group-hover:bg-brand-500/20 transition-colors">
                      <MessageSquare size={13} />
                    </span>
                    <span className="truncate leading-snug">{suggestion}</span>
                  </button>
                ))}
              </div>
              {/* Prompt marketplace per utenti senza agenti */}
              {availableAgents.filter((a) => a.slug !== "").length === 0 && (
                <p className="mt-4 text-xs text-neutral-500 text-center">
                  {locale === "it" ? "Oppure " : "Or "}
                  <Link href="/agents" className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors">
                    {locale === "it" ? "sfoglia il marketplace" : "browse the marketplace"}
                  </Link>
                  {locale === "it" ? " per scoprire gli agenti disponibili." : " to discover available agents."}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-1 flex flex-col"
            >
            <div
              ref={messagesRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 mx-auto max-w-content"
            >
            {messages.map((msg) => (
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
            ))}

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

        {/* Input area — solo quando ci sono messaggi */}
        <div
          data-onboard="chat-input"
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
              removeLabel={(name) => dict.chat.removeAttachment.replace("{name}", name)}
            />
            {attach.notice && <p className="mb-2 text-xs text-amber-400">{attach.notice}</p>}
            <div className="flex items-center gap-2 bg-neutral-800 rounded-2xl border border-white/10 px-4 py-3 focus-within:border-brand-500/50 focus-within:shadow-lg focus-within:shadow-brand-500/5 transition-all">
              <AttachPlusButton labels={attachLabels} disabled={isTyping} onPick={(files) => attach.addFiles(files, attachLabels)} />
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
              <VoiceInput onTranscript={(text) => setInput((prev) => prev + (prev ? " " : "") + text)} onVoiceModeToggle={setIsVoiceMode} disabled={isTyping || !activeId} isVoiceMode={isVoiceMode} />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && attach.attachments.length === 0) || isTyping || !activeId}
                aria-label={dict.chat.sendMessage}
                title={dict.chat.sendMessage}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-500 text-white hover:bg-brand-400 disabled:bg-neutral-700 disabled:text-neutral-500 transition-all shrink-0 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-neutral-600 text-center mt-2">{dict.chat.disclaimer}</p>
        </div>
        </motion.div>
          )}
        </AnimatePresence>
        )}
        </main>
        </div>
      </div>
    </div>
  );
}
