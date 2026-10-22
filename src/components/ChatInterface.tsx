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
  PanelLeftOpen,
  ArrowUp,
  Home,
  Folder,
  FolderPlus,
  Plug,
  Sparkles,
  Blocks,
  ChevronDown,
  FileText,
  Bot,
  CheckCircle2,
  ArrowRight,
  ArrowDown,
  Pencil,
  Archive,
  RotateCcw,
  MoreVertical,
  Square,
  Share2,
  Link2,
  Copy,
  Check,
  Ghost,
} from "lucide-react";
import Image from "next/image";
import { PUBLIC_SUPPORT_EMAIL } from "@/lib/email-config";
import { useLanguage } from "./LanguageProvider";
import { t } from "@/lib/i18n/dictionaries";
import MarkdownText from "./MarkdownText";
import VoiceInput from "./VoiceInput";
import AppHeader from "./AppHeader";
import InlineConnectCard from "@/components/InlineConnectCard";
import InlineCartCard from "@/components/InlineCartCard";
import AccountMenu from "@/components/AccountMenu";
import LinkAwareTextarea from "@/components/LinkAwareTextarea";
import ChatOnboarding from "./ChatOnboarding";
import {
  AttachmentChips,
  DropHint,
  chatAttachLabels,
  useChatAttachments,
} from "@/components/ChatAttachments";
import ChatPlusMenu, { chatPlusMenuLabels } from "@/components/ChatPlusMenu";
import {
  addGithubRepo,
  readActiveGithubRepo,
  readGithubRepos,
  removeGithubRepo,
  setActiveGithubRepo as persistActiveGithubRepo,
  type GithubRepoLink,
} from "@/lib/github-repos";
import { buildVisionText, composeUserContent, toFilesMap, toVisionBlocks } from "@/lib/chat-attachments";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "./BrandLogo";
import AgentAvatar from "./AgentAvatar";
import TypingDots from "./TypingDots";
import { avatarThumbnail } from "@/lib/avatar";
import type { AccountIdentity } from "@/lib/account-identity";
import AgentIcon from "./AgentIcon";
import { AGENTS, localizeAgent, type Agent } from "@/lib/agents";
import { INTEGRATIONS, requestedConnectProviders } from "@/lib/integrations";
import {
  HERO_CONVERSATION_STORAGE_KEY,
  HERO_CONVERSATION_HISTORY_KEY,
} from "./HeroSection";
import ExportReportButton from "./ExportReportButton";
import SubscribePaywallModal from "./SubscribePaywallModal";
import { ActivityFeed, AgentErrorCard, WorkingIndicator } from "./agent/AgentActivity";
import {
  completeStep,
  createConnectionStep,
  createToolStep,
  type AgentStatus,
  type AgentStep,
} from "@/lib/agent-activity";
import {
  chatTextZoom,
  CHAT_SIDEBAR_WIDTH_KEY,
  readActiveConversation,
  readChatDrafts,
  readChatTextSize,
  readDefaultAgent,
  readSidebarOpen,
  saveActiveConversation,
  saveChatDrafts,
  saveChatTextSize,
  saveDefaultAgent,
  saveSidebarOpen,
  type ChatTextSize,
} from "@/lib/chat-settings";
import { useResizableSidebar, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from "@/lib/useResizableSidebar";
import { formatTokens } from "@/lib/format-tokens";
import TokenBudgetLine from "./TokenBudgetLine";
import FileCard from "./FileCard";
import PreviewPanel from "./PreviewPanel";
import {
  mergeFileRecords,
  parseChatFiles,
  replaceFileBlockContent,
  type ChatFileRecord,
} from "@/lib/chat-files";
import {
  createProject,
  projectContextBlock,
  readProjects,
  saveProjects,
  type Project,
} from "@/lib/projects";
// Modalità Ghost (chat incognito): helper puri che decidono COSA si persiste.
import {
  ephemeralConversationIds,
  isEphemeralConversation,
  persistableConversations,
  withEphemeralFlag,
} from "@/lib/ghost-mode";
import { useGhostMode } from "./GhostModeProvider";
import GhostModeButton from "./GhostModeButton";
import GhostConfirmDialog from "./GhostConfirmDialog";

type LocalMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  // True per le bolle dell'assistente che contengono un errore invece di una
  // risposta AI; la UI mostra allora un link di contatto sotto il messaggio.
  error?: boolean;
  attachments?: Pick<ChatAttachment, "id" | "name" | "kind" | "previewUrl">[];
  // File prodotti dal modello (blocco <agentcloud_file>): qui vivono le
  // versioni, così card e anteprima restano disponibili dopo il reload.
  files?: ChatFileRecord[];
  // Agente che ha prodotto la bolla (assente per l'assistente generico):
  // serve a mostrare avatar e nome corretti anche dopo un reload.
  // Per i divisori di sistema (systemKind "agent-switch") è l'agente di
  // destinazione (assente = assistente generico).
  agentSlug?: string;
  agentName?: string;
  // Divisore di sistema dentro la stessa conversazione (es. cambio agente):
  // non va mai inviato alle API, solo renderizzato come avviso visivo.
  systemKind?: "agent-switch";
  // Cambio agente: da dove si proviene (per il testo "da X a Y").
  switchFromSlug?: string;
  switchFromName?: string;
  // Traccia operativa dell'esecuzione (task, strumenti, approvazioni):
  // deriva dagli eventi SSE, mai dal ragionamento del modello.
  activity?: AgentStep[];
};

type LocalConversation = {
  id: string;
  title: string;
  messages: LocalMessage[];
  created_at: string;
  agentSlugs?: string[];
  archived_at?: string;
  deleted_at?: string;
  // Token del link di condivisione in sola lettura (se creato): vive qui così
  // sopravvive al reload e la revoca resta a un click dal menu conversazione.
  shareToken?: string;
  // Progetto di appartenenza (organizzazione locale, come i Projects di Claude).
  projectId?: string;
  // Chat fantasma (modalità incognito): questa conversazione vive solo in
  // memoria. NON viene mai scritta in localStorage, non viene inviata al
  // backend per essere conservata e non genera notifiche né log.
  ephemeral?: boolean;
};

/**
 * Ultimo agente usato in una conversazione: quello dell'ultima bolla prodotta
 * (o dell'ultimo divisore di cambio agente). Le bolle utente e quelle
 * dell'assistente generico non hanno `agentSlug`, quindi il ciclo parte dalla
 * fine e prende il primo che ne ha uno. In una chat ancora vuota torna
 * l'agente selezionato, che è comunque quello che risponderà per primo.
 */
function lastAgentSlugFor(conv: LocalConversation): string | undefined {
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    const slug = conv.messages[i]?.agentSlug;
    if (slug) return slug;
  }
  return conv.agentSlugs?.[0];
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractConnectProviders(text: string): string[] {
  const providers: string[] = [];
  const markerRe = /\[\[CONNECT:([a-zA-Z0-9_\-]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(text)) !== null) {
    if (m[1] && !providers.includes(m[1].toLowerCase())) providers.push(m[1].toLowerCase());
  }
  // also handle JSON marker from tool: {"type":"connection_required","provider":"shopify"}
  const jsonRe = /"type"\s*:\s*"connection_required"[^}]*"provider"\s*:\s*"([^"]+)"/g;
  while ((m = jsonRe.exec(text)) !== null) {
    if (m[1] && !providers.includes(m[1].toLowerCase())) providers.push(m[1].toLowerCase());
  }
  return providers;
}

function stripConnectMarkers(text: string): string {
  return text
    .replace(/\[\[CONNECT:[a-zA-Z0-9_\-]+\]\]/g, "")
    .replace(/\{"type":"connection_required"[^}]+\}/g, "")
    .trim();
}

function extractCartSlugs(text: string): string[] {
  const slugs: string[] = [];
  const markerRe = /\[\[CART:([a-zA-Z0-9_\-]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(text)) !== null) {
    if (m[1] && !slugs.includes(m[1].toLowerCase())) slugs.push(m[1].toLowerCase());
  }
  const jsonRe = /"type"\s*:\s*"cart_added"[^}]*"agent_slug"\s*:\s*"([^"]+)"/g;
  while ((m = jsonRe.exec(text)) !== null) {
    if (m[1] && !slugs.includes(m[1].toLowerCase())) slugs.push(m[1].toLowerCase());
  }
  return slugs;
}

function stripCartMarkers(text: string): string {
  return text
    .replace(/\[\[CART:[a-zA-Z0-9_\-]+\]\]/g, "")
    .replace(/\{"type":"cart_added"[^}]+\}/g, "")
    .trim();
}

function extractDisconnectedProviders(text: string): string[] {
  const providers: string[] = [];
  const markerRe = /\[\[DISCONNECTED:([a-zA-Z0-9_\-]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(text)) !== null) {
    if (m[1] && !providers.includes(m[1].toLowerCase())) providers.push(m[1].toLowerCase());
  }
  const jsonRe = /"type"\s*:\s*"integration_disconnected"[^}]*"provider"\s*:\s*"([^"]+)"/g;
  while ((m = jsonRe.exec(text)) !== null) {
    if (m[1] && !providers.includes(m[1].toLowerCase())) providers.push(m[1].toLowerCase());
  }
  return providers;
}

function stripDisconnectedMarkers(text: string): string {
  return text
    .replace(/\[\[DISCONNECTED:[a-zA-Z0-9_\-]+\]\]/g, "")
    .replace(/\{"type":"integration_disconnected"[^}]+\}/g, "")
    .trim();
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

type ChatInterfaceProps = {
  initialQuery?: string;
  agentId?: string;
  /** Nome localizzato dell'agente mostrato quando la chat è stata aperta per un agente. */
  agentLabel?: string;
  availableAgents?: { slug: string; name: string }[];
  /** Identità risolta lato server (email/nome/avatar) per la sidebar account. */
  account?: AccountIdentity | null;
};

/**
 * NOTA: lo stato della modalità Ghost vive in `GhostModeProvider`, montato dal
 * server component di /chat (vedi src/app/chat/page.tsx). Qui il componente
 * resta UNO solo: dividerlo in due (wrapper + interno) faceva scattare le
 * regole del React Compiler su un file che ne contiene già altre (refs usati
 * come stato, callback che referenziano funzioni dichiarate più avanti).
 */
export default function ChatInterface({
  initialQuery,
  agentId,
  agentLabel,
  availableAgents = [],
  account = null,
}: ChatInterfaceProps) {
  const { dict, locale } = useLanguage();
  const attachLabels = chatAttachLabels(dict);
  const plusLabels = useMemo(() => chatPlusMenuLabels(dict), [dict]);
  const attach = useChatAttachments();
  // ── Modalità Ghost (chat incognito) ──────────────────────────────────────
  // `isGhostMode` è lo stato globale (volatile) della modalità; la conversazione
  // fantasma è marcata `ephemeral: true` e questa è la fonte di verità per la
  // persistenza: ogni scrittura controlla il flag, non lo stato della UI.
  const ghost = useGhostMode();
  const isGhostMode = ghost.isGhostMode;
  // Dialog di conferma Ghost aperto: "enter" (la chat aperta ha messaggi) o
  // "exit" (la chat fantasma ha messaggi da eliminare definitivamente).
  const [ghostDialog, setGhostDialog] = useState<"enter" | "exit" | null>(null);
  // Id della chat fantasma da ripulire dalla memoria (stream, coda).
  // La pulizia dei ref avviene in un effect, NON dentro l'handler del bottone:
  // l'handler è passato come prop a un componente, e il React Compiler
  // assume che una prop di un componente custom possa essere chiamata durante
  // il render (e segnalerebbe come errore l'accesso ai ref).
  const [ghostCleanupId, setGhostCleanupId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [activeAgentId, setActiveAgentId] = useState(agentId || "");
  const [selectedAgentSlugs, setSelectedAgentSlugs] = useState<string[]>(agentId ? [agentId] : []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState(initialQuery || "");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  // Conversazioni che stanno attualmente generando (una per conv; più conv
  // possono streamare in parallelo dopo uno switch). isTyping / hasPartialReply
  // sono DERIVATI dalla conversazione attiva: così uno switch a metà
  // generazione non disabilita l'input di un'altra chat, l'indicatore resta
  // nella chat giusta e la risposta non finisce nella chat sbagliata.
  const [streamingConvs, setStreamingConvs] = useState<string[]>([]);
  // True da quando la risposta della conv attiva ha iniziato lo streaming (la
  // bolla cresce parola per parola). L'indicatore a tre puntini appare solo
  // prima dell'arrivo della prima parola.
  const [partialConvs, setPartialConvs] = useState<string[]>([]);
  const isTyping = activeId !== null && streamingConvs.includes(activeId);
  const hasPartialReply = activeId !== null && partialConvs.includes(activeId);
  // Id dei messaggi dell'assistente che stiano ANCORA crescendo parola per
  // parola. Serve a una cosa sola: sostituire l'avatar con i tre puntini
  // finché il messaggio non è finito, così l'avatar compare a fine risposta
  // (gli id sono univoci, quindi più agenti in parallelo non si pestano).
  const [streamingMsgIds, setStreamingMsgIds] = useState<string[]>([]);
  const markStreamingMsg = (id: string) =>
    setStreamingMsgIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const clearStreamingMsg = (id: string) =>
    setStreamingMsgIds((prev) => prev.filter((x) => x !== id));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Visibilità EFFETTIVA della sidebar. In modalità Ghost la sidebar è
  // sempre nascosta, anche se l'utente l'aveva aperta: la sua preferenza
  // (`sidebarOpen`) non viene toccata, quindi al termine della modalità la
  // sidebar torna esattamente com'era prima.
  const sidebarVisible = sidebarOpen && !isGhostMode;
  const mobileSidebarVisible = mobileSidebarOpen && !isGhostMode;
  // Larghezza della sidebar: regolabile trascinando il bordo destro (come su
  // Claude), persistita in localStorage. Solo desktop: su mobile è un drawer.
  const sidebarResize = useResizableSidebar(CHAT_SIDEBAR_WIDTH_KEY, 256);

  // Scroll lock del body mentre il drawer della cronologia è aperto su mobile.
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileSidebarOpen]);
  const [sidebarSession, setSidebarSession] = useState<import("@supabase/supabase-js").Session | null>(null);
  // Menu account: si apre dal bottone account in sidebar. Lo stato vive qui
  // perché la sidebar ristretta deve chiuderlo.
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  // L'identità arriva dal server (prop `account`): la sidebar mostra subito
  // l'account reale e non i segnaposto "?"/"..." mentre la sessione del browser
  // si carica in background.
  // L'input parte centrato nella pagina; dopo il primo messaggio si sposta in basso
  const [inputCentered, setInputCentered] = useState(true);
  // Pannello attivo nella sidebar: chat, tools o agents
  const [sidebarView, setSidebarView] = useState<"chat" | "projects" | "artifacts" | "personalization">("chat");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  // Menù opzioni per conversazione: un solo bottone "⋯" apre le azioni.
  const [conversationMenuId, setConversationMenuId] = useState<string | null>(null);
  // Condivisione in sola lettura: id della conversazione col modale aperto,
  // link creato, stato di caricamento/errore/copia.
  const [shareConvId, setShareConvId] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  // Progetti (organizzazione locale, come i Projects di Claude): filtro attivo,
  // modale crea/modifica, form controllati.
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState<{ mode: "create" } | { mode: "edit"; id: string } | null>(null);
  const [projectFormName, setProjectFormName] = useState("");
  const [projectFormInstructions, setProjectFormInstructions] = useState("");
  const [projectFormAgents, setProjectFormAgents] = useState<string[]>([]);
  const [projectDeleteArmed, setProjectDeleteArmed] = useState(false);
  const projectsRef = useRef<Project[]>([]);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);
  // Repository GitHub collegati (menu "+"): l'agente ci lavora con i tool
  // `github_repo_*`. Il token GitHub resta nelle integrazioni del tenant.
  const [githubRepos, setGithubRepos] = useState<GithubRepoLink[]>([]);
  const [activeGithubRepo, setActiveGithubRepo] = useState<GithubRepoLink | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  // Ricerca web: quando è accesa il modello può usare il tool `web_search`.
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  // Tutti i file generati nelle conversazioni (non eliminate) per il gruppo Artefatti.
  const allFiles = useMemo(() => {
    const out: { convId: string; convTitle: string; slug: string; name: string }[] = [];
    for (const c of conversations) {
      if (c.deleted_at) continue;
      for (const m of c.messages) {
        if (m.role !== "assistant" || !m.files) continue;
        for (const f of m.files) {
          if (!f.versions || f.versions.length === 0) continue;
          out.push({ convId: c.id, convTitle: c.title, slug: f.slug, name: f.title || f.name });
        }
      }
    }
    return out;
  }, [conversations]);

  /** Apri un artefatto: vai alla sua conversazione e apri l'anteprima. */
  function openArtifact(convId: string, slug: string) {
    if (convId !== activeId) switchConversation(convId);
    setSidebarView("chat");
    setPreviewSlug(slug);
    setMobileSidebarOpen(false);
  }
  // Solo client (localStorage): si legge al mount per non divergere dal server.
  useEffect(() => {
    setProjects(readProjects());
    setGithubRepos(readGithubRepos());
    setActiveGithubRepo(readActiveGithubRepo());
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []);

  // GitHub collegato come integrazione? Il menu lo mostra: un repository
  // collegato senza account GitHub non può essere usato dai tool.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/integrations/status")
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((data: { providers?: { provider: string; status?: string }[] }) => {
        if (cancelled) return;
        setGithubConnected(
          (data.providers ?? []).some(
            (p) => p.provider === "github" && p.status === "connected",
          ),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /** Collega un repository GitHub e lo rende quello attivo. */
  function linkGithubRepo(owner: string, repo: string) {
    const link = addGithubRepo(owner, repo);
    if (!link) return;
    setGithubRepos(readGithubRepos());
    setActiveGithubRepo(link);
  }

  /** Scollega un repository GitHub. */
  function unlinkGithubRepo(repo: GithubRepoLink) {
    removeGithubRepo(repo.owner, repo.repo);
    setGithubRepos(readGithubRepos());
    setActiveGithubRepo(readActiveGithubRepo());
  }

  /** Sceglie il repository su cui l'agente lavorerà. */
  function selectGithubRepo(repo: GithubRepoLink) {
    persistActiveGithubRepo(repo);
    setActiveGithubRepo(repo);
  }

  /**
   * "Aggiungi al progetto": se c'è una conversazione attiva la sposta nel
   * progetto scelto, altrimenti il progetto diventa quello predefinito per le
   * prossime chat.
   */
  function addToProject(projectId: string) {
    setSelectedProjectId(projectId);
    if (activeId) moveConversationToProject(activeId, projectId);
    setSidebarView("projects");
  }

  // Il menu "+" può chiedere di usare una skill: la richiesta finisce
  // nell'input come testo, cosi' l'utente la rivede e la modifica prima di
  // inviarla.
  useEffect(() => {
    const onUseSkill = (e: Event) => {
      const detail = (e as CustomEvent<{ name?: string }>).detail;
      const name = detail?.name?.trim();
      if (!name) return;
      setInput((prev) =>
        (prev ? `${prev} ` : "") + plusLabels.useSkill.replace("{name}", name),
      );
    };
    window.addEventListener("agentcloud:use-skill", onUseSkill);
    return () => window.removeEventListener("agentcloud:use-skill", onUseSkill);
  }, [plusLabels.useSkill]);
  const [renameValue, setRenameValue] = useState("");
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const agentSearchRef = useRef<HTMLInputElement>(null);
  // Freemium giornaliero: il blocco autoritativo arriva dal server (402) — vedi banner limite sopra l'input
  //
  // Per chi è abbonato il limite non è sui messaggi ma sul POOL DI TOKEN del
  // piano: budget condiviso fra gli agenti del piano, misurato nel periodo di
  // abbonamento. È quello che l'utente deve vedere: quanto ha consumato e
  // quanto gli resta.
  type TokenBudget = {
    planId: string | null;
    tokenLimit: number;
    used: number;
    remaining: number;
    ratio: number;
    periodEnd: string | null;
    level: "ok" | "warning" | "critical";
    exhausted: boolean;
  };
  type DailyLimitInfo =
    | { unlimited: true; budget?: TokenBudget }
    | { unlimited: false; remaining: number; limit: number; resetAt: string };
  const [dailyLimit, setDailyLimit] = useState<DailyLimitInfo | null>(null);
  // Bump per ricaricare il contatore dopo ogni risposta completata.
  const [limitTick, setLimitTick] = useState(0);
  const limitSlug = selectedAgentSlugs.length === 1 && selectedAgentSlugs[0] ? selectedAgentSlugs[0] : null;

  /**
   * Riga del budget di token, pronta per il render.
   *
   * Il testo è localizzato qui (il componente `TokenBudgetLine` è solo
   * presentazione) e resta `null` per chi non ha un budget: gli abbonati
   * hanno il pool, gli altri (piano gratuito) no.
   */
  const tokenBudgetLine = (() => {
    const budget = dailyLimit?.unlimited ? dailyLimit.budget : undefined;
    if (!budget) return null;
    const text = budget.exhausted
      ? t(dict.chat.tokenBudgetExhausted, {
          limit: formatTokens(budget.tokenLimit),
        })
      : t(dict.chat.tokenBudget, {
          used: formatTokens(budget.used),
          limit: formatTokens(budget.tokenLimit),
          date: budget.periodEnd
            ? new Date(budget.periodEnd).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })
            : "-",
        });
    return { ratio: budget.ratio, level: budget.level, text };
  })();

  // Budget giornaliero freemium (5/giorno per agente, reset a mezzanotte UTC)
  // e budget di token del piano: mostrati sopra l'input.
  //
  // L'agente è opzionale nella richiesta: senza agent il server risponde con
  // il pool principale dell'utente, così il budget è visibile anche prima di
  // aver scelto un agente (è il budget del piano che l'utente ha comprato).
  useEffect(() => {
    let cancelled = false;
    const qs = limitSlug ? `?agent=${encodeURIComponent(limitSlug)}` : "";
    fetch(`/api/agent/limit${qs}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.unlimited) {
          // Abbonato: nessun limite di messaggi, ma c'è il budget di token.
          const p = data.pool;
          setDailyLimit({
            unlimited: true,
            budget: p
              ? {
                  planId: p.planId ?? null,
                  tokenLimit: Number(p.tokenLimit) || 0,
                  used: Number(p.used) || 0,
                  remaining: Number(p.remaining) || 0,
                  ratio: Number(p.ratio) || 0,
                  periodEnd: p.periodEnd ?? null,
                  level: (p.level ?? "ok") as "ok" | "warning" | "critical",
                  exhausted: Boolean(data.exhausted),
                }
              : undefined,
          });
        } else if (typeof data.remaining === "number") {
          setDailyLimit({
            unlimited: false,
            remaining: data.remaining,
            limit: data.limit ?? 5,
            resetAt: data.resetAt,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [limitSlug, limitTick]);
  const [paywallSlug, setPaywallSlug] = useState<string | null>(null);
  // Id dell'ultimo messaggio utente inviato: la sua bolla entra con
  // l'animazione `animate-msg-send` (si azzera da sola dopo l'animazione).
  const [justSentId, setJustSentId] = useState<string | null>(null);
  // Preferenze rapide (pannello della rotella): agente usato dalle nuove chat e
  // dimensione del testo dell'area messaggi. Persistite in localStorage.
  const [defaultAgentSlug, setDefaultAgentSlug] = useState("");
  const [chatTextSize, setChatTextSize] = useState<ChatTextSize>("md");
  const initializedRef = useRef(false);
  const CHAT_HISTORY_KEY = "agentcloud_chat_history_v2";
  // Streaming per-conversazione anche come ref: la coda dei messaggi (Invio
  // premuto mentre la chat genera) va processata alla fine dello stream, dove
  // lo stato React del render corrente non è ancora aggiornato.
  const streamingRef = useRef<Set<string>>(new Set());
  // Controller per fermare la generazione (pulsante Stop): uno per
  // conversazione, così lo stop non tocca mai gli altri stream.
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  // Conversazioni fermate dall'utente: l'AbortError in volo non deve
  // diventare una bolla di errore.
  const stopRequested = useRef<Set<string>>(new Set());
  /**
   * Conferma umana dei tool che modificano documenti esistenti. Quando il server
   * manda `tool_confirm`, salviamo il token (firmato lato server: il client non
   * può cambiare tool o argomenti) e la funzione che riprende la stessa
   * richiesta con l'approvazione.
   */
  const resumeRef = useRef<((token: string) => Promise<void>) | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{
    convId: string;
    toolName: string;
    token: string;
  } | null>(null);
  // File attualmente aperto nel pannello di anteprima (slug del blocco
  // <agentcloud_file>). Nullo = pannello chiuso.
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  // Contatore per il reset del pannello dopo restore/edit dell'utente.
  const [panelEpoch, setPanelEpoch] = useState(0);
  // Ultimo file sincronizzato col DB: evita di ripostare a ogni token.
  const syncedFilesRef = useRef<string>("");

  /** Approva il tool in attesa e riprende la generazione. */
  async function approvePending() {
    const pending = pendingApproval;
    const resume = resumeRef.current;
    if (!pending || !resume) return;
    setPendingApproval(null);
    resumeRef.current = null;
    try {
      await resume(pending.token);
    } catch {
      // La ripresa riporta gli errori nell'ActivityFeed come ogni altra run.
    }
  }

  /** Annulla: nessun tool eseguito, la chat torna disponibile. */
  function denyPending() {
    setPendingApproval(null);
    resumeRef.current = null;
  }

  /** Ferma la generazione in corso senza errori e senza perdere il parziale. */
  function stopStreaming(convId: string) {
    stopRequested.current.add(convId);
    try {
      abortControllers.current.get(convId)?.abort();
    } catch {
      // nessuno stream attivo: niente da fermare
    }
  }
  // Messaggi in atteso per conversazione: la bolla è già visibile, l'invio
  // all'API parte appena la generazione in corso termina.
  const queueRef = useRef<Record<string, { text: string; pending: ChatAttachment[]; msgId: string }[]>>({});
  // Bozze per conversazione: testo e allegati non ancora inviati. Quando si
  // cambia chat la bozza corrente viene salvata qui e viene ripristinata quella
  // di destinazione, così il testo o un'immagine preparati in una chat non
  // "viaggiano" dentro un'altra e non finiscono nel messaggio sbagliato.
  const draftsRef = useRef<Record<string, { input: string; attachments: ChatAttachment[] }>>({});

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Copia sincronizzata delle conversazioni: dentro sendMessage (async) lo
  // stato React è quello del render precedente, quindi la cronologia va letta
  // da qui per restare corretta anche quando parte un messaggio in coda.
  const conversationsRef = useRef<LocalConversation[]>([]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  /**
   * True se la conversazione indicata è una chat fantasma.
   *
   * Fonte di verità: il flag `ephemeral` sulla conversazione (non lo stato
   * della UI): se i due divergono, vince il dato e la conversazione non
   * viene mai persistita.
   */
  function isEphemeralConv(id: string | null): boolean {
    if (!id) return false;
    return isEphemeralConversation(
      conversationsRef.current.find((c) => c.id === id),
    );
  }
  // True finché l'utente è in fondo alla conversazione. L'auto-scroll scatta
  // solo allora: in streaming gli aggiornamenti parola per parola scorrono il
  // contenitore direttamente (istantaneo, niente animazione smooth che lotta
  // col dito), e la lettura dei messaggi più vecchi non viene mai interrotta
  // da uno "strattone" verso il basso.
  const stickToBottom = useRef(true);

  const activeConv = conversations.find((c) => c.id === activeId);
  const messages = useMemo(() => activeConv?.messages ?? [], [activeConv]);
  const isStreamingActive = streamingConvs.includes(activeId ?? "");
  // La conversazione attiva è una chat fantasma? (titolo, salvataggio file e
  // richieste al backend dipendono da questo flag).
  const activeIsEphemeral = isEphemeralConversation(activeConv);

  /**
   * File di un messaggio: versioni già salvate + eventuale blocco che sta
   * arrivando ora nello stream. `parseChatFiles` è chiamato a ogni token, ma
   * solo per l'ultimo messaggio dell'assistente (gli altri sono immutabili).
   */
  const filesOfMessage = useCallback(
    (msg: LocalMessage, isLive: boolean): ChatFileRecord[] => {
      const blocks = isLive ? parseChatFiles(msg.content).files : [];
      // Solo i blocchi completi: un file che il modello sta ancora scrivendo non
      // deve comparire (card, chip in sidebar, anteprima) mentre cresce, con il
      // contatore righe che cambia. Compare quando è pronto, a fine messaggio.
      const complete = blocks.filter((b) => b.status !== "streaming");
      if (complete.length === 0) return msg.files ?? [];
      return mergeFileRecords(msg.files, complete, activeConv?.created_at);
    },
    [activeConv?.created_at],
  );

  /** File della conversazione aperta, dal più recente. */
  const conversationFiles = useMemo(() => {
    const out: { record: ChatFileRecord; messageId: string; agentSlug?: string }[] = [];
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      const isLive = isStreamingActive && msg.id === messages[messages.length - 1]?.id;
      for (const record of filesOfMessage(msg, isLive)) {
        out.push({ record, messageId: msg.id, agentSlug: msg.agentSlug });
      }
    }
    return out.reverse();
  }, [messages, isStreamingActive, filesOfMessage]);

  const activePreviewFile = useMemo(() => {
    if (!previewSlug) return null;
    for (const entry of conversationFiles) {
      if (entry.record.slug === previewSlug) return entry.record;
    }
    return null;
  }, [previewSlug, conversationFiles]);

  const isPreviewStreaming =
    !!activePreviewFile &&
    isStreamingActive &&
    messages[messages.length - 1]?.role === "assistant" &&
    parseChatFiles(messages[messages.length - 1].content).files.some(
      (f) => f.id === activePreviewFile.slug && f.status === "streaming",
    );

  /** Chiede al modello di rigenerare un file interrotto o troppo grande. */
  const retryFile = useCallback(
    (record: ChatFileRecord) => {
      if (!activeId) return;
      void handleSendWithText(
        `Il file "${record.name}" non è stato creato correttamente. Ricrealo con lo stesso id "${record.slug}".`,
        activeId,
      );
    },
    // handleSendWithText è stabile: non richiede dipendenze per non ricreare
    // la callback a ogni render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId],
  );

  /** Salva il file su Drive/Docs/Notion passando dal tool dell'agente collegato. */
  const saveFileToIntegration = useCallback(
    (provider: "google-drive" | "google-docs" | "notion", record: ChatFileRecord, content: string) => {
      if (!activeId) return;
      void handleSendWithText(
        `Salva il contenuto del file "${record.name}" su ${provider === "google-drive" ? "Google Drive" : provider === "google-docs" ? "Google Docs" : "Notion"}.`,
        activeId,
      );
      void content;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId],
  );

  /**
   * Aggiunge una versione al file e aggiorna il blocco nel messaggio: così la
   * modifica (restore o editing utente) è quella che l'agente vede al turno
   * dopo, che persiste nel reload e che finisce nel sync verso il DB.
   */
  const pushFileVersion = useCallback((slug: string, content: string, createdBy: "ai" | "user") => {
    setConversations((prev) =>
      prev.map((c) => {
        let touched = false;
        const messages = c.messages.map((m) => {
          const rec = (m.files ?? []).find((f) => f.slug === slug);
          if (!rec) return m;
          touched = true;
          const nextVersion = rec.currentVersion + 1;
          const versions = [
            ...rec.versions,
            { version: nextVersion, content, created_at: new Date().toISOString(), created_by: createdBy },
          ];
          const files = (m.files ?? []).map((f) =>
            f.slug === slug ? { ...f, currentVersion: nextVersion, updated: true, versions } : f,
          );
          return { ...m, files, content: replaceFileBlockContent(m.content, slug, content) };
        });
        return touched ? { ...c, messages } : c;
      }),
    );
    setPanelEpoch((n) => n + 1);
  }, []);

  /** Ripristina una versione precedente come NUOVA versione (mai distruttivo). */
  const handleRestoreFile = useCallback(
    (record: ChatFileRecord, version: number) => {
      const v = record.versions.find((x) => x.version === version);
      if (!v) return;
      pushFileVersion(record.slug, v.content, "user");
    },
    [pushFileVersion],
  );

  /** Salva una modifica utente come nuova versione (created_by=user). */
  const handleEditFile = useCallback(
    (record: ChatFileRecord, content: string) => {
      pushFileVersion(record.slug, content, "user");
    },
    [pushFileVersion],
  );

  // Suggerimenti dinamici basati sugli agenti posseduti dall'utente.
  // I task sono localizzati (localizeAgent): con lingua italiana i chip escono
  // in italiano, non in inglese dal catalogo canonico.
  const dynamicSuggestions = useMemo(() => {
    const owned = availableAgents.filter((a) => a.slug !== "");
    if (owned.length > 0) {
      // Prendi 4 task da agenti diversi (o ripeti se ne hai meno di 4)
      const tasks: string[] = [];
      for (const agent of owned) {
        const agentData = AGENTS.find((a) => a.slug === agent.slug);
        if (agentData) {
          for (const task of localizeAgent(agentData, locale).tasks) {
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
  }, [availableAgents, dict.chat, locale]);

  // Titolo dell'intestazione: il nome dell'agente attivo quando ne è selezionato
  // uno (CTA marketplace o selettore in sidebar), altrimenti il nome generico
  // dell'assistente.
  // Admin / possessori del codice vedono l'intero catalogo (stessa gestione
  // degli utenti normali, con cronologia)
  const effectiveAvailableAgents = useMemo(() => {
    if (availableAgents.length > 0) return availableAgents;
    return [];
  }, [availableAgents]);

  // Catalogo localizzato per slug: serve agli avatar dei messaggi, alla pill
  // dell'agente che sta conversando e al selettore dell'header.
  const agentsBySlug = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const a of AGENTS) map.set(a.slug, localizeAgent(a, locale));
    return map;
  }, [locale]);

  // Nome mostrato per la selezione attiva. Il catalogo dell'utente ha la
  // precedenza, poi il catalogo statico: una chat riaperta (o aperta senza
  // ?agent=) deve comunque mostrare il nome dell'agente selezionato.
  const activeAgentDisplayName =
    selectedAgentSlugs.length === 0
      ? dict.chat.assistantName
      : selectedAgentSlugs.length === 1
        ? effectiveAvailableAgents.find((a) => a.slug === selectedAgentSlugs[0])?.name ??
          agentsBySlug.get(selectedAgentSlugs[0])?.name ??
          (agentLabel && selectedAgentSlugs[0] ? agentLabel : undefined) ??
          dict.chat.assistantName
        : t(dict.chat.multiAgents, { count: selectedAgentSlugs.length });

  /** Agente che ha prodotto una bolla (null per l'assistente generico). */
  const agentForMessage = useCallback(
    (msg: LocalMessage) =>
      msg.agentSlug ? agentsBySlug.get(msg.agentSlug) ?? null : null,
    [agentsBySlug],
  );

  const selectedAgents = useMemo(
    () =>
      selectedAgentSlugs
        .map((slug) => agentsBySlug.get(slug))
        .filter((a): a is Agent => Boolean(a)),
    [selectedAgentSlugs, agentsBySlug],
  );

  const activeAgent = selectedAgents.length === 1 ? selectedAgents[0] : null;

  // Diagnostica: se il server conosce l'utente ma la sessione non è leggibile
  // dal browser, l'account resta mostrato (dati del server) — ma lo segnaliamo
  // in console, perché lo stesso problema riguarda anche navbar e carrello.
  useEffect(() => {
    if (!account || sidebarSession) return;
    const timer = setTimeout(() => {
      console.warn(
        "[account] sessione non leggibile dal browser (cookie sb-* assenti o non aggiornati): l'account è mostrato dai dati del server.",
      );
    }, 3000);
    return () => clearTimeout(timer);
  }, [account, sidebarSession]);

  // Identità mostrata nella sidebar account: prima quella risolta dal server
  // (immediata), poi — appena disponibile — la sessione letta nel browser, che
  // la sostituisce arricchendola con l'avatar.
  const accountEmail = sidebarSession?.user?.email || account?.email || "";
  // Thumbnail piccolo: l'avatar è mostrato a 28–36px, non serve il formato originale.
  const accountAvatarUrl = avatarThumbnail(
    sidebarSession?.user?.user_metadata?.avatar_url ||
      sidebarSession?.user?.user_metadata?.picture ||
      account?.avatarUrl ||
      null,
    64,
  );
  const accountLabelBase =
    sidebarSession?.user?.user_metadata?.full_name ||
    sidebarSession?.user?.email ||
    account?.name ||
    account?.email ||
    "";
  // Tooltip dell'avatar: nome e email quando entrambi presenti.
  const accountTooltip =
    accountLabelBase && accountEmail && accountLabelBase !== accountEmail
      ? `${accountLabelBase} · ${accountEmail}`
      : accountLabelBase || accountEmail || null;

  /** Agenti che l'utente può mettere nella conversazione (dal suo catalogo). */
  const selectableAgents = useMemo(() => {
    const bySlug = new Map<string, Agent>();
    for (const a of effectiveAvailableAgents) {
      if (!a.slug) continue;
      const ag = agentsBySlug.get(a.slug);
      if (ag) bySlug.set(a.slug, ag);
    }
    // La conversazione può contenere agenti fuori dal catalogo dell'utente — es.
    // arrivando dalla CTA del marketplace su /chat?agent=<slug>: devono comunque
    // comparire nel selettore (e potersi togliere), altrimenti la pill mostra un
    // agente che la lista dichiara inesistente.
    for (const slug of selectedAgentSlugs) {
      if (bySlug.has(slug)) continue;
      const ag = agentsBySlug.get(slug);
      if (ag) bySlug.set(slug, ag);
    }
    return Array.from(bySlug.values());
  }, [effectiveAvailableAgents, agentsBySlug, selectedAgentSlugs]);

  // Chiudi dropdown agente se si clicca fuori
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setShowAgentPicker(false);
        setAgentSearch("");
      }
    }
    if (showAgentPicker) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showAgentPicker]);

  // Focus sulla search quando si apre il dropdown
  useEffect(() => {
    if (showAgentPicker) {
      setTimeout(() => agentSearchRef.current?.focus(), 50);
    }
  }, [showAgentPicker]);

  // Agenti filtrati dalla ricerca
  const filteredAgents = useMemo(() => {
    if (!agentSearch.trim()) return selectableAgents;
    const q = agentSearch.toLowerCase();
    return selectableAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.shortName.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [agentSearch, selectableAgents]);

  /** Cambia l'agente della chat: il nuovo SOSTITUISCE il precedente (un solo
      agente per chat), mai in aggiunta. Il cambio resta NELLA STESSA
      conversazione e inserisce un divisore di sistema "agent-switch" che
      avvisa l'utente ("Ora stai parlando con X"): i messaggi precedenti
      restano visibili sotto il divisore. Unica eccezione: la chat nuova
      ancora vuota, che cambia agente sul posto senza divisore (niente da
      separare). Ricliccare l'agente attivo lo deseleziona (si torna
      all'assistente generico). */
  function toggleAgent(slug: string) {
    const next =
      selectedAgentSlugs.length === 1 && selectedAgentSlugs[0] === slug ? [] : [slug];
    setShowAgentPicker(false);
    setAgentSearch("");
    const resolveName = (s: string) =>
      effectiveAvailableAgents.find((a) => a.slug === s)?.name ??
      agentsBySlug.get(s)?.name ??
      (agentLabel && selectedAgentSlugs.includes(s) ? agentLabel : undefined) ??
      s;
    const activeConv = conversationsRef.current.find((c) => c.id === activeId);
    if (!activeConv) {
      setSelectedAgentSlugs(next);
      setActiveAgentId(next[0] ?? "");
      return;
    }
    const prevKey = selectedAgentSlugs.join("|");
    if (prevKey === next.join("|")) return;
    if (activeConv.messages.length === 0) {
      // Chat nuova ancora vuota: cambia agente sul posto, senza divisore.
      setSelectedAgentSlugs(next);
      setActiveAgentId(next[0] ?? "");
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id ? { ...c, agentSlugs: [...next] } : c,
        ),
      );
      return;
    }
    // Stessa chat: avvisa con un divisore prima di continuare.
    const fromSlug = selectedAgentSlugs[0];
    const toSlug = next[0];
    const divider: LocalMessage = {
      id: generateId(),
      role: "system",
      content: "",
      created_at: new Date().toISOString(),
      systemKind: "agent-switch",
      agentSlug: toSlug,
      agentName: toSlug ? resolveName(toSlug) : dict.chat.assistantName,
      switchFromSlug: fromSlug,
      switchFromName: fromSlug ? resolveName(fromSlug) : dict.chat.assistantName,
    };
    setSelectedAgentSlugs(next);
    setActiveAgentId(next[0] ?? "");
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? { ...c, agentSlugs: [...next], messages: [...c.messages, divider] }
          : c,
      ),
    );
    setMobileSidebarOpen(false);
  }

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
  // Il contenitore dei messaggi esiste solo quando c'è una conversazione, e
  // AnimatePresence lo monta DOPO l'animazione di uscita della schermata vuota:
  // al primo render con messaggi `messagesRef.current` è ancora null, quindi un
  // effetto che dipende solo da `hasMessages` non aggancerebbe mai i listener
  // (rotella, touch, osservatori). Teniamo il nodo anche nello stato così gli
  // effetti ripartono quando il contenitore è davvero nel DOM.
  const [messagesNode, setMessagesNode] = useState<HTMLDivElement | null>(null);
  const attachMessages = useCallback((node: HTMLDivElement | null) => {
    messagesRef.current = node;
    setMessagesNode(node);
  }, []);
  // Solo per lo scroll "smooth": gli eventi generati a metà animazione non
  // devono essere letti come uno scroll dell'utente.
  const smoothScrollUntil = useRef(0);
  // Ultima posizione di fondo impostata da NOI: serve a distinguere un vero
  // scroll dell'utente (scrollTop ben sopra il fondo) dagli eventi provocati dal
  // contenuto che cresce mentre il pin sta arrivando.
  const pinnedScrollTop = useRef(0);
  const lastTouchY = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Un solo scroll per frame: durante lo streaming arrivano decine di mutazioni
  // al secondo (ogni token) e ognuna chiamava scrollTo + due letture di
  // layout, provocando "scatti" visibili e lavoro inutile.
  const pinFrame = useRef<number | null>(null);
  const pendingSmooth = useRef(false);

  const unpin = useCallback(() => {
    stickToBottom.current = false;
    setIsAtBottom(false);
  }, []);

  /**
   * Riporta in fondo la conversazione (istantaneo durante lo streaming, smooth
   * su richiesta).
   *
   * Non combatte con l'utente: se la posizione è più in alto del fondo che
   * abbiamo impostato NOI (es. sta trascinando la barra mentre l'AI scrive),
   * l'auto-scroll si stacca invece di riportarla giù a ogni token.
   */
  const pinToBottom = useCallback(
    (smooth = false, force = false) => {
      if (force) {
        // Richiesta esplicita dell'utente (bottone "Vai in fondo"): riaggancia
        // anche se l'auto-scroll era staccato.
        stickToBottom.current = true;
        setIsAtBottom(true);
      } else if (!stickToBottom.current) {
        return;
      }
      // Coalesce più richieste nello stesso frame. `smooth` "vince" perché è
      // un'azione esplicita dell'utente e deve completarsi.
      pendingSmooth.current = pendingSmooth.current || smooth;
      if (pinFrame.current !== null) return;
      pinFrame.current = requestAnimationFrame(() => {
        pinFrame.current = null;
        const el = messagesRef.current;
        if (!el) return;
        // L'utente può essersi staccato (rotella/touch/scroll) DOPO aver
        // schedulato questo frame: ricontrolla prima di forzare lo scroll,
        // altrimenti lo "strappo" verso il basso vince sullo scroll dell'utente.
        if (!force && !stickToBottom.current) return;
        const useSmooth = pendingSmooth.current;
        pendingSmooth.current = false;

        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        const movedByUser =
          !force &&
          !atBottom &&
          Date.now() >= smoothScrollUntil.current &&
          el.scrollTop < pinnedScrollTop.current - 24;
        if (movedByUser) {
          unpin();
          return;
        }
        if (useSmooth) smoothScrollUntil.current = Date.now() + 800;
        // `scrollTo` con `behavior:"smooth"` non si sovrappone bene: durante
        // lo streaming ogni token ne avvia uno nuovo e l'animazione si
        // interrompe a metà, producendo salti visibili. L'auto-scroll durante
        // la generazione è quindi sempre istantaneo; lo smooth resta solo per
        // le azioni esplicite dell'utente.
        el.scrollTo({ top: el.scrollHeight, behavior: useSmooth ? "smooth" : "auto" });
        // Rileggiamo il fondo DOPO lo scroll: durante il rendering il
        // contenuto può essere cresciuto, e un valore letto prima diverrebbe
        // stale, facendo scattare l'unpin al token successivo.
        pinnedScrollTop.current = el.scrollHeight - el.clientHeight;
      });
    },
    [unpin],
  );

  const handleMessagesScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      // L'utente è tornato in fondo: da qui in poi si segue di nuovo lo stream.
      stickToBottom.current = true;
      setIsAtBottom(true);
      return;
    }
    // Durante l'animazione di avvio gli eventi intermedi non sono dell'utente.
    if (Date.now() < smoothScrollUntil.current) return;
    // Contenuto cresciuto mentre il pin stava arrivando? scrollTop resta al
    // fondo precedente: non è l'utente che risale. Si stacca solo quando la
    // posizione è più in alto del fondo che abbiamo impostato noi.
    if (el.scrollTop < pinnedScrollTop.current - 24) unpin();
  };

  // Cambio di conversazione: il fondo memorizzato è quello della conversazione
  // precedente e non va usato per decidere se l'utente si è spostato.
  useEffect(() => {
    pinnedScrollTop.current = 0;
  }, [activeId]);

  // Scroll quando i messaggi cambiano (incluso durante streaming)
  useEffect(() => {
    pinToBottom();
  }, [messages, pinToBottom]);

  // Con l'inizio dello streaming si parte dal fondo della conversazione.
  useEffect(() => {
    if (isTyping) pinToBottom(true);
  }, [isTyping, pinToBottom]);

  // Il contenuto cresce anche senza un nuovo messaggio (blocchi markdown che si
  // assestano, immagini/allegati che caricano, tool call che si espandono):
  // osserviamo l'altezza reale del contenuto e restiamo incollati al fondo
  // finché l'utente non risale. pinToBottom già coalesce per frame.
  useEffect(() => {
    const el = messagesNode;
    const content = contentRef.current;
    if (!el || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => pinToBottom());
    observer.observe(content);
    const mutations = new MutationObserver(() => pinToBottom());
    mutations.observe(content, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [messagesNode, pinToBottom]);

  // Smette un frame di scroll pendente se il componente si smonta.
  useEffect(() => {
    return () => {
      if (pinFrame.current !== null) {
        cancelAnimationFrame(pinFrame.current);
        pinFrame.current = null;
      }
    };
  }, []);

  // Lo scroll manuale dell'utente (rotella verso l'alto, dito verso il basso)
  // stacca l'auto-scroll; tornare in fondo lo riattiva. Questi listener coprono
  // il caso in cui il contenitore non si muove (nessun overflow residuo) e il
  // caso della rotella: il rilevamento posizionale in handleMessagesScroll da
  // solo non basterebbe durante lo streaming.
  useEffect(() => {
    const el = messagesNode;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) unpin();
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? null;
      if (y === null) return;
      const prev = lastTouchY.current;
      lastTouchY.current = y;
      if (prev !== null && y > prev + 4) unpin();
    };
    const onTouchEnd = () => {
      lastTouchY.current = null;
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [messagesNode, unpin]);

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

    });

    // Fallback: se onAuthStateChange non si attiva entro 1s, prova getSession
    const fallback = setTimeout(() => {
      if (!mounted) return;
      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        setSidebarSession(data.session);
  
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
          // Difesa in profondità: una conversazione marcata `ephemeral` non
          // deve mai essere riletta dalla cronologia, nemmeno se un bug (o un
          // altro tab) l'avesse scritta. Qui viene scartata.
          const persistable = persistableConversations(parsed);
          // Dopo un reload nessuno step può essere ancora "in corso": i
          // running diventano completed così il feed resta coerente.
          const normalized = persistable.map((c) => ({
            ...c,
            messages: (c.messages ?? []).map((m) =>
              m.activity?.some((s) => s.status === "running")
                ? {
                    ...m,
                    activity: m.activity.map((s) =>
                      s.status === "running" ? { ...s, status: "completed" as const } : s,
                    ),
                  }
                : m,
            ),
          }));
          setConversations((prev) => (prev.length === 0 ? normalized : prev));
          // Riapri la conversazione su cui l'utente era rimasto (se esiste
          // ancora), altrimenti la prima: così la bozza salvata compare subito.
          const remembered = readActiveConversation();
          const target =
            persistable.find((c) => c.id === remembered) ??
            (persistable[0] as LocalConversation | undefined);
          if (target?.id) {
            setActiveId((prev) => prev ?? target.id);
            // La conversazione riaperta porta con sé i suoi agenti: senza questo
            // la selezione (vuota dopo un reload) li rimuoverebbe al primo
            // invio, perché è la selezione corrente a essere salvata nel turno.
            const slugs = target.agentSlugs ?? [];
            if (slugs.length > 0) {
              setSelectedAgentSlugs((prev) => (prev.length > 0 ? prev : slugs));
              setActiveAgentId((prev) => prev || slugs[0] || "");
            }
          }
        }
      }
    } catch {
      // ignora
    }
  }, []);

  // Bozze dell'input persistite in localStorage: il testo scritto sopravvive a
  // un reload. Si idratano al mount (prima che `activeId` venga risolto) e si
  // riscrive solo il testo — gli allegati restano in memoria.
  const draftsHydratedRef = useRef(false);
  const draftsRestoredRef = useRef<Set<string>>(new Set());

  const persistDrafts = useCallback(() => {
    const out: Record<string, string> = {};
    const ephemeral = ephemeralConversationIds(conversationsRef.current);
    for (const [id, draft] of Object.entries(draftsRef.current)) {
      // Le bozze delle chat fantasma NON vengono scritte: la chat ghost non
      // deve lasciare traccia nemmeno del testo non inviato.
      if (ephemeral.has(id)) continue;
      if (draft.input) out[id] = draft.input;
    }
    saveChatDrafts(out);
  }, []);

  useEffect(() => {
    const saved = readChatDrafts();
    for (const [id, text] of Object.entries(saved)) {
      draftsRef.current[id] = {
        input: text,
        attachments: draftsRef.current[id]?.attachments ?? [],
      };
    }
    draftsHydratedRef.current = true;
  }, []);

  // Ripristina la bozza della conversazione che diventa attiva, una sola volta:
  // da lì in poi il testo live è la fonte di verità. Non sovrascrive ciò che
  // l'utente sta già scrivendo (es. l'`initialQuery` che sta per essere inviato).
  useEffect(() => {
    if (!activeId || draftsRestoredRef.current.has(activeId)) return;
    draftsRestoredRef.current.add(activeId);
    const draft = draftsRef.current[activeId];
    if (draft?.input) setInput((prev) => (prev ? prev : draft.input));
  }, [activeId]);

  // Backstop per le modifiche che non passano da `handleInputChange` (voce,
  // suggerimenti, citazioni): la bozza persistita resta allineata. Non cancella
  // mai su input vuoto — la rimozione è esplicita — così il mount, quando
  // l'input è ancora "", non sovrascrive la bozza appena idratata.
  useEffect(() => {
    if (!activeId || !draftsHydratedRef.current || !input) return;
    draftsRef.current[activeId] = {
      input,
      attachments: draftsRef.current[activeId]?.attachments ?? [],
    };
    persistDrafts();
  }, [input, activeId, persistDrafts]);

  // Ricorda l'ultima conversazione aperta per riaprirla (con la sua bozza) al
  // reload invece della sola prima in cronologia. Una chat fantasma non viene
  // mai ricordata: al reload si riapre l'ultima chat normale.
  useEffect(() => {
    if (!activeId) return;
    if (isEphemeralConv(activeId)) return;
    saveActiveConversation(activeId);
  }, [activeId]);

  // Preferenze rapide salvate: si leggono al mount (solo client, localStorage)
  // per non far divergere l'HTML server-rendered da quello idratato.
  useEffect(() => {
    setDefaultAgentSlug(readDefaultAgent());
    setChatTextSize(readChatTextSize());
    setSidebarOpen(readSidebarOpen());
  }, []);

  function handleDefaultAgentChange(slug: string) {
    setDefaultAgentSlug(slug);
    saveDefaultAgent(slug);
  }

  function handleChatTextSizeChange(size: ChatTextSize) {
    setChatTextSize(size);
    saveChatTextSize(size);
  }

  // Sidebar: un unico setter per restringere e allargare, con persistenza.
  // Sparso in più posti lasciava la preferenza senza persistenza e senza un
  // modo per riaprire: qui passa tutto da qui.
  function setSidebar(open: boolean) {
    setSidebarOpen(open);
    saveSidebarOpen(open);
    // Sidebar ristretta: il menu account di fianco non ha più senso, si chiude.
    if (!open) setAccountMenuOpen(false);
  }

  // Ctrl/Cmd+B alterna la sidebar. Scorciatoia da solo: si lascia passare
  // quando il focus è in un campo di testo (l'utente potrebbe voler digitare
  // quel tasto) o quando un tasto modificatore è premuto.
  // In modalità Ghost la sidebar resta nascosta: la scorciatoia non fa nulla.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "b" || !(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (isGhostMode) return;
      const el = document.activeElement;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (el as HTMLElement | null)?.isContentEditable) {
        return;
      }
      e.preventDefault();
      setSidebar(!sidebarOpen);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen, isGhostMode]);

  // Salvataggio della cronologia. In streaming le conversazioni cambiano a
  // ogni token: serializzare l'intero storico (immagini incluse, come data URL)
  // a ogni chunk blocca il main thread. Si scrive quindi con un piccolo debounce
  // e si forza la scrittura se la pagina viene nascosta/chiusa.
  //
  // Modalità Ghost: `persistableHistory` esclude le conversazioni fantasma,
  // quindi nella cronologia salvata non compare mai una chat ghost.
  useEffect(() => {
    if (conversations.length === 0) return;
    const write = () => {
      try {
        // Le conversazioni fantasma sono escluse: la cronologia salvata non
        // contiene mai una chat ghost.
        localStorage.setItem(
          CHAT_HISTORY_KEY,
          JSON.stringify(persistableConversations(conversations)),
        );
      } catch {
        // Storage pieno o non disponibile — la cronologia resta in memoria.
      }
    };
    const timer = setTimeout(write, 400);
    const flush = () => {
      clearTimeout(timer);
      write();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
    };
  }, [conversations]);

  // Persistenza lato DB dei file generati: la chat continua a funzionare anche
  // senza (i file vivono nel messaggio), ma così versioni e anteprime restano
  // disponibili su un altro dispositivo e nell'export dati.
  //
  // Modalità Ghost: i file prodotti in una chat fantasma NON vengono scritti
  // su DB (l'utente ha chiesto che nulla venga conservato).
  useEffect(() => {
    if (conversationFiles.length === 0) return;
    if (isEphemeralConv(activeId)) return;
    const payload = conversationFiles
      .slice()
      .reverse()
      .map(({ record, messageId, agentSlug }) => ({
        slug: record.slug,
        name: record.name,
        type: record.type,
        language: record.language,
        title: record.title,
        messageId,
        agentSlug,
        content: record.versions[record.versions.length - 1]?.content ?? "",
      }));
    // Firma del contenuto: evita di ripostare gli stessi file a ogni render.
    const signature = JSON.stringify(payload.map((f) => [f.slug, f.content.length, f.content.slice(-40)]));
    if (signature === syncedFilesRef.current) return;
    const timer = setTimeout(() => {
      syncedFilesRef.current = signature;
      void fetch("/api/chat/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: payload }),
      }).catch(() => {
        // Rete assente o API non migrata: la chat resta comunque completa.
        syncedFilesRef.current = "";
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [conversationFiles, activeId]);

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
      // La query del deep-link è già stata inviata: lasciarla nell'input (e
      // quindi salvarla come bozza) la farebbe ricomparire al reload.
      setInput("");
      setTimeout(() => handleSendWithText(initialQuery, conv.id), 100);
    }
  }, [initialQuery]);

  // Importa come conversazioni ciò che la chat demo dell'hero ha salvato in
  // localStorage: la bozza live (chat hero in corso) più ogni conversazione che
  // il bottone reset dell'hero ha archiviato. Entrambe le chiavi vengono
  // consumate all'import.
  useEffect(() => {
    try {      type StoredMsg = {
        id?: string;
        role: "user" | "assistant";
        content: string;
        created_at?: string;
        error?: boolean;
        // Allegati (immagini/file) salvati dall'hero: senza di qui l'immagine
        // inviata nella demo sparisce alla migrazione in /chat.
        attachments?: Pick<ChatAttachment, "id" | "name" | "kind" | "previewUrl">[];
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
          attachments: Array.isArray(m.attachments)
            ? m.attachments.filter((a) => {
                if (!a || typeof a.id !== "string" || typeof a.name !== "string") return false;
                // Le immagini senza anteprima non hanno nulla da mostrare
                if (a.kind === "image" && typeof a.previewUrl !== "string") return false;
                return true;
              })
            : undefined,
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
        // Agenti della prima chat: quelli con cui l'utente è arrivato
        // (?agent=...) oppure l'agente predefinito scelto nel pannello rapido.
        const presetSlug = readDefaultAgent();
        const initialSlugs = selectedAgentSlugs.length > 0
          ? [...selectedAgentSlugs]
          : presetSlug
            ? [presetSlug]
            : [];
        const conv: LocalConversation = {
          id: generateId(),
          title: dict.chat.newChat,
          messages: [],
          created_at: new Date().toISOString(),
          agentSlugs: initialSlugs,
        };
        // La cronologia già caricata ha la precedenza: sovrascrivendola con
        // questa conversazione vuota l'intera cronologia dell'utente spariva a
        // ogni ricarica della pagina.
        setConversations((prev) => (prev.length > 0 ? prev : [conv]));
        setActiveId((prev) => prev ?? conv.id);
      }
    } catch {
      // Storage malformato — si riparte da zero.
    }
  }, []);

  // Salva la bozza della chat che sta per essere lasciata (testo + allegati):
  // `attach.take()` svuota gli allegati live restituendoli come snapshot.
  function saveActiveDraft() {
    if (!activeId) return;
    draftsRef.current[activeId] = { input, attachments: attach.take() };
  }

  // Ripristina la bozza della chat di destinazione (vuota se non ce n'è una).
  // Il testo live resta anche nel ref (aggiornato a ogni tasto) così la bozza
  // persistita non si perde: il ref è la fonte per il salvataggio in localStorage.
  function restoreDraft(id: string) {
    const draft = draftsRef.current[id];
    setInput(draft?.input ?? "");
    attach.restore(draft?.attachments ?? []);
  }

  function switchConversation(id: string) {
    if (id !== activeId) {
      saveActiveDraft();
      restoreDraft(id);
    }
    setActiveId(id);
    setSidebarView("chat");
    setMobileSidebarOpen(false);
    setConversationMenuId(null);
    const conv = conversations.find((c) => c.id === id);
    if (conv?.agentSlugs) {
      setSelectedAgentSlugs(conv.agentSlugs);
      setActiveAgentId(conv.agentSlugs[0] ?? "");
    } else {
      // fallback to current global selection
    }
  }

  /**
   * Crea una conversazione NUOVA (normale) e la rende attiva.
   * Usata da "Nuova chat" e dall'uscita dalla modalità Ghost.
   */
  function createNewConversation(): LocalConversation {
    // Dentro un progetto si ereditano i suoi agenti, altrimenti l'agente
    // predefinito del pannello rapido (vuoto = chat generica).
    const activeProject = selectedProjectId
      ? projectsRef.current.find((p) => p.id === selectedProjectId)
      : undefined;
    const agentSlugs = activeProject
      ? [...activeProject.agentSlugs]
      : defaultAgentSlug
        ? [defaultAgentSlug]
        : [];
    const conv: LocalConversation = {
      id: generateId(),
      title: dict.chat.newChat,
      messages: [],
      created_at: new Date().toISOString(),
      agentSlugs,
      projectId: selectedProjectId ?? undefined,
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setSelectedAgentSlugs(agentSlugs);
    setActiveAgentId(agentSlugs[0] ?? "");
    restoreDraft(conv.id);
    return conv;
  }

  // ── Modalità Ghost (chat incognito) ────────────────────────────────────────

  /**
   * Pulizia della memoria della chat fantasma: chiude lo stream in corso e
   * libera la coda dei messaggi in attesa.
   *
   * Vive in un effect (e non dentro l'handler) per due motivi: l'evento è
   * comunque asincrono rispetto al click, e l'handler è una prop di un
   * componente custom — il React Compiler assume che una prop di questo tipo
   * possa essere chiamata durante il render e segnalerebbe come errore
   * l'accesso ai ref.
   */
  useEffect(() => {
    if (!ghostCleanupId) return;
    // Streaming in corso: si chiude il fetch, così nessuna risposta parziale
    // resta appesa e nulla viene scritto.
    stopStreaming(ghostCleanupId);
    streamingRef.current.delete(ghostCleanupId);
    setGhostCleanupId(null);
  }, [ghostCleanupId]);

  /**
   * Avvia (o riprende) la chat fantasma.
   *
   * - Se la conversazione aperta è vuota viene Riusata: diventa la chat
   *   fantasma (marca `ephemeral`) e i suoi messaggi restano in memoria.
   * - Se ha già messaggi non viene toccata: si crea una NUOVA conversazione
   *   fantasma, vuota. La chat precedente resta in cronologia, intatta.
   */
  function startGhostSession() {
    const current = conversationsRef.current.find((c) => c.id === activeId);
    if (current && current.messages.length === 0) {
      // Conversazione vuota: la stessa diventa la chat fantasma.
      setConversations((prev) =>
        prev.map((c) =>
          c.id === current.id
            ? {
                ...c,
                ephemeral: true,
                // Nessun titolo automatico in modalità Ghost: il titolo è
                // quello fisso della modalità, così non si "indovina" nulla
                // dal contenuto della chat.
                title: dict.chat.ghost.title,
                projectId: undefined,
              }
            : c,
        ),
      );
      ghost.enterGhostMode(current.id);
    } else {
      // Chat con messaggi (o nessuna chat aperta): nuova conversazione
      // fantasma vuota. Quella precedente non viene modificata né cancellata.
      const agentSlugs = selectedAgentSlugs.length
        ? [...selectedAgentSlugs]
        : defaultAgentSlug
          ? [defaultAgentSlug]
          : [];
      const conv: LocalConversation = {
        id: generateId(),
        title: dict.chat.ghost.title,
        messages: [],
        created_at: new Date().toISOString(),
        agentSlugs,
        ephemeral: true,
      };
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setSelectedAgentSlugs(agentSlugs);
      setActiveAgentId(agentSlugs[0] ?? "");
      ghost.enterGhostMode(conv.id);
    }
    // Input e allegati: la chat fantasma parte pulita.
    setInput("");
    attach.clear();
    setMobileSidebarOpen(false);
    setSidebarView("chat");
    setConversationMenuId(null);
    setShareConvId(null);
  }

  /**
   * Distrugge la sessione Ghost: rimuove la conversazione dallo stato, libera
   * bozze e coda ed esce dalla modalità. Nulla resta in memoria: è la fine
   * della chat fantasma.
   *
   * Lo stream in corso viene chiuso dall'effect di pulizia (vedi sopra).
   */
  const destroyGhostSession = () => {
    const gid = ghost.ghostConversationId;
    if (gid) {
      setGhostCleanupId(gid);
      setStreamingConvs((prev) => prev.filter((id) => id !== gid));
      setPartialConvs((prev) => prev.filter((id) => id !== gid));
      delete draftsRef.current[gid];
      delete queueRef.current[gid];
      setConversations((prev) => prev.filter((c) => c.id !== gid));
      setActiveId((prev) => (prev === gid ? null : prev));
    }
    ghost.exitGhostMode();
  };

  /** Click sull'icona fantasma: entra o esce dalla modalità. */
  function handleGhostToggle() {
    setGhostDialog(null);
    if (isGhostMode) {
      // Uscita: se la chat fantasma ha messaggi, chiedi conferma (vengono
      // eliminati definitivamente). Se è vuota, si esce e basta.
      const gid = ghost.ghostConversationId;
      const conv = gid
        ? conversationsRef.current.find((c) => c.id === gid)
        : undefined;
      if (conv && conv.messages.length > 0) {
        setGhostDialog("exit");
        return;
      }
      destroyGhostSession();
      createNewConversation();
      return;
    }
    // Ingresso: se la chat aperta ha già messaggi, chiedi conferma e poi
    // parte una NUOVA chat fantasma (quella attiva resta in cronologia).
    const current = conversationsRef.current.find((c) => c.id === activeId);
    if (current && current.messages.length > 0) {
      setGhostDialog("enter");
      return;
    }
    startGhostSession();
  }

  /** Conferma del dialog "enter": nuova chat fantasma, la precedente resta. */
  function confirmGhostEnter() {
    setGhostDialog(null);
    startGhostSession();
  }

  /** Conferma del dialog "exit": la chat fantasma viene eliminata per sempre. */
  function confirmGhostExit() {
    setGhostDialog(null);
    destroyGhostSession();
    createNewConversation();
  }

  /**
   * "Nuova chat".
   *
   * Sta DOPO le funzioni Ghost a propósito: `destroyGhostSession` è chiamata
   * qui e deve essere dichiarata prima. Il React Compiler segnala come errore
   * l'uso di una funzione prima della sua dichiarazione.
   */
  function handleNewChat() {
    // Conserva la bozza della chat corrente prima di partire da una vuota.
    saveActiveDraft();
    setSidebarView("chat");
    // "Nuova chat" in modalità Ghost: la sessione fantasma viene distrutta
    // (niente resta in memoria) e si torna a una chat normale.
    if (isGhostMode) destroyGhostSession();
    createNewConversation();
    setMobileSidebarOpen(false);
  }

  // ── Progetti ─────────────────────────────────────────────────────────────
  function updateProjects(next: Project[]) {
    setProjects(next);
    saveProjects(next);
  }

  function openProjectCreate() {
    const activeProject = selectedProjectId
      ? projectsRef.current.find((p) => p.id === selectedProjectId)
      : undefined;
    setProjectFormName("");
    setProjectFormInstructions("");
    // Nuovo progetto dal filtro attivo: propone gli stessi agenti.
    setProjectFormAgents(activeProject ? [...activeProject.agentSlugs] : [...selectedAgentSlugs]);
    setProjectDeleteArmed(false);
    setProjectModal({ mode: "create" });
  }

  function openProjectEdit(id: string) {
    const p = projectsRef.current.find((x) => x.id === id);
    if (!p) return;
    setProjectFormName(p.name);
    setProjectFormInstructions(p.instructions ?? "");
    setProjectFormAgents([...p.agentSlugs]);
    setProjectDeleteArmed(false);
    setProjectModal({ mode: "edit", id });
  }

  function saveProjectModal() {
    if (!projectModal) return;
    if (projectModal.mode === "create") {
      const created = createProject(projectFormName, projectFormInstructions, projectFormAgents);
      if (!created) return;
      updateProjects([created, ...projectsRef.current]);
      setSelectedProjectId(created.id);
    } else {
      const name = projectFormName.trim().slice(0, 80);
      if (!name) return;
      const now = new Date().toISOString();
      updateProjects(
        projectsRef.current.map((p) =>
          p.id === projectModal.id
            ? {
                ...p,
                name,
                instructions: projectFormInstructions.trim()
                  ? projectFormInstructions.trim().slice(0, 4000)
                  : undefined,
                agentSlugs: [...projectFormAgents],
                updated_at: now,
              }
            : p,
        ),
      );
    }
    setProjectModal(null);
  }

  function deleteProject(id: string) {
    updateProjects(projectsRef.current.filter((p) => p.id !== id));
    // Le conversazioni restano, tornano senza progetto.
    setConversations((prev) => prev.map((c) => (c.projectId === id ? { ...c, projectId: undefined } : c)));
    if (selectedProjectId === id) setSelectedProjectId(null);
    setProjectModal(null);
  }

  function moveConversationToProject(convId: string, projectId: string | undefined) {
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, projectId } : c)));
    setConversationMenuId(null);
  }

  // Azioni conversazione: chiamate dal menù "⋯" (il menù chiude se stesso).
  function handleDelete(id: string) {
    // Cancellare la conversazione revoca anche l'eventuale link condiviso: lo
    // snapshot non deve sopravvivere alla conversazione che lo ha generato.
    const conv = conversationsRef.current.find((c) => c.id === id);
    if (conv?.shareToken) {
      void fetch(`/api/chat/share?token=${encodeURIComponent(conv.shareToken)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    delete draftsRef.current[id];
    delete queueRef.current[id];
    persistDrafts();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {
      // La bozza live apparteneva alla conversazione eliminata: si ripulisce,
      // così non resta testo orfano che verrebbe scartato al primo switch.
      setActiveId(null);
      setInput("");
      attach.clear();
    }
    setConversationMenuId(null);
  }

  function handleArchive(id: string) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived_at: c.archived_at ? undefined : new Date().toISOString() } : c))
    );
    setConversationMenuId(null);
  }

  // ── Condivisione in sola lettura ──────────────────────────────────────────
  // Il link apre uno snapshot congelato (titolo + testo dei messaggi): chi lo
  // apre vede senza poter modificare nulla (nessun input/azione nella pagina
  // pubblica, nessuna API di scrittura). Allegati e file non entrano nello
  // snapshot; i marker di connessione vengono rimossi dal testo.

  function openShare(id: string) {
    setConversationMenuId(null);
    setShareConvId(id);
    setShareError(null);
    setShareNotice(null);
    setShareCopied(false);
  }

  function shareUrlFor(token: string): string {
    return `${window.location.origin}/chat/shared/${token}`;
  }

  async function createShareLink(id: string) {
    const conv = conversationsRef.current.find((c) => c.id === id);
    if (!conv || conv.messages.length === 0) {
      setShareError(dict.chat.shareEmpty);
      return;
    }
    // Una chat fantasma non è condivisibile: non esiste da nessuna parte,
    // quindi non può neppure essere pubblicata.
    if (isEphemeralConversation(conv)) {
      setShareError(dict.chat.ghost.shareDisabled);
      return;
    }
    if (conv.shareToken) return;
    setShareBusy(true);
    setShareError(null);
    try {
      const res = await fetch("/api/chat/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: conv.title,
          agentSlugs: conv.agentSlugs ?? [],
          messages: conv.messages.map((m) => ({
            role: m.role,
            content: m.content.replace(/\[\[CONNECT:[a-zA-Z0-9_\-]+\]\]/g, "").trim(),
            agentSlug: m.agentSlug,
            agentName: m.agentName,
            created_at: m.created_at,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as { token?: string } | null;
      if (!res.ok || !data?.token) throw new Error("share_failed");
      const token = data.token;
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, shareToken: token } : c)));
    } catch {
      setShareError(dict.chat.shareError);
    } finally {
      setShareBusy(false);
    }
  }

  async function copyShareLink(token: string) {
    try {
      await navigator.clipboard.writeText(shareUrlFor(token));
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareError(dict.chat.shareError);
    }
  }

  async function revokeShareLink(id: string, token: string) {
    setShareBusy(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/chat/share?token=${encodeURIComponent(token)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("revoke_failed");
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, shareToken: undefined } : c)));
      setShareNotice(dict.chat.shareRevoked);
    } catch {
      setShareError(dict.chat.shareError);
    } finally {
      setShareBusy(false);
    }
  }

  function startRename(id: string, currentTitle: string) {
    setConversationMenuId(null);
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

  async function handleSendWithText(text: string, convId: string) {
    if (!text.trim() || !convId) return;
    await sendMessage(text, convId, []);
  }

  // Mostra subito la bolla del messaggio utente (con il titolo aggiornato).
  // Usata sia dall'invio immediato sia dalla coda, così un messaggio premuto
  // durante la generazione è visibile da subito e non sembra mai perduto.
  function appendUserMessage(text: string, convId: string, pending: ChatAttachment[]): LocalMessage {
    // Nel fumetto utente non mostrare mai il filename: usa testo digitato o placeholder generico
    const displayText = text.trim() || (pending.length > 0 ? (pending.some((a) => a.kind === "image") ? dict.common.imageAttached : dict.common.fileAttached) : "");
    const userMsg: LocalMessage = {
      id: generateId(),
      role: "user",
      content: displayText,
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
              // Modalità Ghost: nessuna generazione automatica del titolo (non
              // deve "indovinare" il contenuto della chat). Le chat normali
              // prendono il titolo dal primo messaggio.
              title: c.ephemeral
                ? dict.chat.ghost.title
                : getConvTitle([...c.messages, userMsg], dict.chat.newChat),
            }
          : c,
      ),
    );
    if (inputCentered) setInputCentered(false);
    // La bolla entra con l'animazione di invio; l'id si azzera da solo dopo.
    setJustSentId(userMsg.id);
    window.setTimeout(() => {
      setJustSentId((cur) => (cur === userMsg.id ? null : cur));
    }, 600);
    return userMsg;
  }

  async function sendMessage(
    text: string,
    convId: string,
    pending: ChatAttachment[] = [],
    preAddedMsgId?: string,
  ) {
    const baseText = composeUserContent(text, pending);
    const visionBlocks = toVisionBlocks(pending);
    const hasImages = visionBlocks.length > 0;
    // Evita invio vuoto: serve testo o almeno un'immagine
    if ((!baseText || !baseText.trim()) && visionBlocks.length === 0) return;
    if (!convId) return;
    // Istruzioni del progetto (solo API, mai salvate nei messaggi): il modello
    // lavora sempre dentro il contesto del progetto della conversazione.
    const convForSend = conversationsRef.current.find((c) => c.id === convId);
    // Modalità Ghost: la richiesta viaggia con `ephemeral: true` e il server
    // non salva messaggi, titolo, file, embedding o notifiche della run.
    const sendIsEphemeral = isEphemeralConversation(convForSend);
    const projForSend = convForSend?.projectId
      ? projectsRef.current.find((p) => p.id === convForSend.projectId)
      : undefined;
    const projBlock = projectContextBlock(projForSend);
    const apiText = projBlock ? `${projBlock}\n\n${baseText}` : baseText;
    const visionText = buildVisionText(apiText, hasImages);
    const apiContent: unknown = hasImages
      ? ([{ type: "text" as const, text: visionText }, ...visionBlocks] as unknown)
      : apiText;
    // Stessa conversazione già in generazione: rifiuta. La coda (Invio premuto
    // durante lo stream) è gestita in handleSend e riparte da qui a fine stream;
    // il ref evita lo stato React stale nelle chiamate in coda.
    if (streamingRef.current.has(convId)) return;
    setIsAtBottom(true);
    stickToBottom.current = true;

    // Ids dei messaggi che crescono durante QUESTO invio: alla fine dello
    // stream vengono tolti da `streamingMsgIds` per riportare l'avatar.
    const convStreamingIds: string[] = [];

    // Messaggio già mostrato (caso coda): recupera la bolla esistente per non
    // duplicarla. Senza id la bolla viene creata qui (invio normale).
    let userMsg: LocalMessage | null = preAddedMsgId
      ? conversationsRef.current.find((c) => c.id === convId)?.messages.find((m) => m.id === preAddedMsgId) ?? null
      : null;
    if (!userMsg) userMsg = appendUserMessage(text, convId, pending);

    streamingRef.current.add(convId);
    setStreamingConvs((prev) => (prev.includes(convId) ? prev : [...prev, convId]));
    setPartialConvs((prev) => prev.filter((id) => id !== convId));

    // Aggiorna un singolo messaggio dell'assistente man mano che lo stream
    // arriva. Restituisce l'id stabile così i chunk successivi aggiornano la
    // stessa bolla. Quando `error` è impostato la bolla nasce come messaggio
    // di errore (nessuna risposta AI), con un link di contatto sotto.
    const patchAssistant = (
      assistantId: string,
      content: string,
      error = false,
      agent?: { slug: string; name: string },
    ) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.some((m) => m.id === assistantId)
                  ? c.messages.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content,
                            agentSlug: m.agentSlug ?? agent?.slug,
                            agentName: m.agentName ?? agent?.name,
                          }
                        : m,
                    )
                  : [
                      ...c.messages,
                      {
                        id: assistantId,
                        role: "assistant",
                        content,
                        created_at: new Date().toISOString(),
                        error: error || undefined,
                        agentSlug: agent?.slug,
                        agentName: agent?.name,
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
    // True se almeno un agente ha prodotto attività operativa (anche senza
    // testo): evita falsi "Empty response" nei turni fatti di soli tool.
    let convActivityProduced = false;
    // Messaggio di errore lato server (localizzato) catturato dallo stream SSE.
    let streamErrorMessage: string | null = null;
    let streamErrorCode: string | null = null;
    try {
      // Invia l'intera cronologia della conversazione così l'AI resta coerente
      // nei messaggi successivi (e risponde sempre sui dati piattaforma più
      // recenti).
      const history = (
        conversationsRef.current.find((c) => c.id === convId)?.messages ?? []
        // La bolla appena creata è aggiunta sotto come apiContent: toglierla
        // dalla cronologia evita di inviare due volte lo stesso messaggio.
        // I divisori di sistema (cambio agente) restano solo visivi: mai alle API.
      ).filter((m) => m.id !== userMsg.id && m.role !== "system");
      const apiMessages = [
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: apiContent },
      ];
      const filesMap = toFilesMap(pending.filter((a) => a.kind !== "image"));

      // Contenuti correnti dei file/artifact della conversazione: servono ai
      // tool update_artifact/rewrite_artifact (e a read_file per nome). Oltre
      // i 100k caratteri si tronca con avviso (vedi artifact-edits).
      for (const { record } of conversationFiles) {
        const last = record.versions[record.versions.length - 1];
        if (!last || filesMap[record.slug] !== undefined) continue;
        const text =
          last.content.length > 100_000
            ? last.content.slice(0, 100_000) + "\n\n[...contenuto troncato a 100.000 caratteri per il contesto: chiedi all'utente la sezione da modificare o usa rewrite_artifact.]"
            : last.content;
        filesMap[record.slug] = text;
        if (record.name && filesMap[record.name] === undefined) filesMap[record.name] = text;
      }

      // L'utente può inserire quanti agenti vuole nella conversazione (selectedAgentSlugs).
      // Se nessun agente è selezionato → chat generica. Se uno o più → loop su /api/agent/run.
      const targetSlugs = [...selectedAgentSlugs];
      // Persisti la selezione nella conversazione per cronologia
      if (targetSlugs.length > 0 && convId) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, agentSlugs: [...targetSlugs] } : c)),
        );
      }

      // Nome localizzato dell'agente che sta rispondendo: finisce nella pill
      // dell'header, nel prefisso della bolla (così il modello nei turni
      // multi-agente sa chi ha detto cosa) e nell'avatar del messaggio.
      const agentMeta = (slug: string) => ({
        slug,
        name:
          effectiveAvailableAgents.find((a) => a.slug === slug)?.name ??
          AGENTS.find((a) => a.slug === slug)?.name ??
          slug,
      });

      async function streamOne(
        url: string,
        body: Record<string, unknown>,
        agent?: { slug: string; name: string },
      ) {
        // Abort dedicato a questo stream: il pulsante Stop chiude fetch +
        // reader senza toccare le altre conversazioni e senza bolla di errore.
        const controller = new AbortController();
        abortControllers.current.set(convId, controller);
        const markSteps = (from: AgentStatus, to: AgentStatus) => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.activity?.some((s) => s.status === from)
                        ? {
                            ...m,
                            activity: m.activity.map((s) =>
                              s.status === from ? { ...s, status: to, endedAt: Date.now() } : s,
                            ),
                          }
                        : m,
                    ),
                  }
                : c,
            ),
          );
        };
        const patchSteps = (assistantId: string, updater: (steps: AgentStep[]) => AgentStep[]) => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantId ? { ...m, activity: updater(m.activity ?? []) } : m,
                    ),
                  }
                : c,
            ),
          );
        };
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          if (!res.ok) {
            let serverMessage: string | null = null;
            let code: string | null = null;
            try {
              const data = (await res.json()) as { error?: string; code?: string };
              if (data && typeof data.error === "string" && data.error.trim()) {
                serverMessage = data.error;
              }
              if (data && typeof data.code === "string") code = data.code;
            } catch {}
            if (serverMessage) streamErrorMessage = serverMessage;
            if (code) streamErrorCode = code;
            // propagate paywall immediately
            if (code === "FREE_LIMIT_REACHED" && agent) setPaywallSlug(agent.slug);
            else if (code === "FREE_LIMIT_REACHED") setPaywallSlug(targetSlugs[0] ?? null);
            // Budget di token esaurito: la risposta è "il tuo piano è finito,
            // puoi aggiornarlo" → stessa CTA del piano gratuito (l'utente non
            // ha un errore da capire, ha una quota da ricaricare).
            else if (code === "LIMIT_EXCEEDED" || code === "OVERAGE_CAP_REACHED") {
              setPaywallSlug(agent?.slug ?? targetSlugs[0] ?? "");
            }
            throw new Error("AI backend error");
          }
          if (!res.body) throw new Error("AI backend unavailable");
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let assistantId = "";
          let localText = "";
          // Batching a frame: patchAssistant riscrive l'intera cronologia a ogni
          // token e blocca il main thread. Si accumula il testo e si riversa al
          // massimo una volta per frame — la chat non si blocca più in generazione.
          let rafId = 0;
          let pendingText: string | null = null;
          const flushText = () => {
            rafId = 0;
            if (assistantId && pendingText !== null) {
              patchAssistant(assistantId, prefix + pendingText, false, agent);
              pendingText = null;
            }
          };
          const scheduleText = () => {
            pendingText = localText;
            if (!rafId) rafId = requestAnimationFrame(flushText);
          };
          const ensureAssistant = () => {
            if (!assistantId) {
              assistantId = generateId();
              // Finché l'id è in `streamingMsgIds` la riga mostra i puntini al
              // posto dell'avatar: l'avatar torna a fine messaggio.
              markStreamingMsg(assistantId);
              convStreamingIds.push(assistantId);
              setPartialConvs((prev) => (prev.includes(convId) ? prev : [...prev, convId]));
            }
          };
          const prefix = agent ? `**${agent.name}:**\n\n` : "";
          try {
            let streamDone = false;
            while (!streamDone) {
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
                  ensureAssistant();
                  scheduleText();
                }
                // File/artifact creato da un tool (write_file, quiz, artifact...):
                // diventa un blocco nel messaggio così card e anteprima vivono
                // anche dopo il reload. Il contenuto è escapato se contiene il
                // tag di chiusura (il parser lo ripristina).
                if (json.type === "file" && typeof (json as { content?: unknown }).content === "string") {
                  const f = json as unknown as {
                    filename?: unknown;
                    content: string;
                    artifact?: { id?: unknown; fileType?: unknown; title?: unknown; language?: unknown };
                  };
                  const filename = typeof f.filename === "string" && f.filename ? f.filename : "file.txt";
                  const art = f.artifact && typeof f.artifact === "object" ? f.artifact : null;
                  const slug = String(art?.id ?? filename)
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "")
                    .slice(0, 64) || "file";
                  const ftype = typeof art?.fileType === "string" && art.fileType ? art.fileType : "";
                  const ftitle = typeof art?.title === "string" && art.title ? ` title="${art.title.slice(0, 200).replace(/"/g, "")}"` : "";
                  const flang = typeof art?.language === "string" && art.language ? ` language="${art.language.slice(0, 40).replace(/"/g, "")}"` : "";
                  const safeContent = f.content.replace(/<\/agentcloud_file>/gi, "&lt;/agentcloud_file&gt;");
                  const block = `\n\n<agentcloud_file id="${slug}" name="${filename}"${ftype ? ` type="${ftype}"` : ""}${ftitle}${flang}>${safeContent}</agentcloud_file>`;
                  localText += block;
                  responseText += block;
                  ensureAssistant();
                  scheduleText();
                  convActivityProduced = true;
                }
                if (json.type === "tool_start") {
                  const evt = json as unknown as { toolName?: string; toolInput?: unknown };
                  if (typeof evt.toolName === "string") {
                    ensureAssistant();
                    scheduleText();
                    const step = createToolStep(evt.toolName, evt.toolInput, locale);
                    convActivityProduced = true;
                    patchSteps(assistantId, (steps) => [...steps, step]);
                  }
                }
                if (json.type === "tool_done") {
                  const evt = json as unknown as { toolName?: string };
                  patchSteps(assistantId, (steps) => {
                    for (let i = steps.length - 1; i >= 0; i--) {
                      if (steps[i].tool === evt.toolName && steps[i].status === "running") {
                        const next = [...steps];
                        next[i] = completeStep(steps[i]);
                        return next;
                      }
                    }
                    return steps;
                  });
                }
                if (json.type === "tool_confirm") {
                  const evt = json as unknown as { toolName?: string; token?: string };
                  if (typeof evt.token === "string") {
                    // Il server ha messo in pausa la run: salviamo come riprenderla
                    // e mostriamo la conferma. Non è un errore, quindi lo stream
                    // può chiudersi senza bolla rossa.
                    convActivityProduced = true;
                    const resumeBody = { ...body, approval: { token: evt.token } };
                    resumeRef.current = (token: string) =>
                      streamOne(url, { ...resumeBody, approval: { token } }, agent);
                    setPendingApproval({
                      convId,
                      toolName: String(evt.toolName ?? "tool"),
                      token: evt.token,
                    });
                  }
                }
                if ((json as unknown as { type?: string; provider?: string }).type === "connection" && typeof (json as unknown as { provider?: string }).provider === "string") {
                  const prov = (json as unknown as { provider: string }).provider;
                  const marker = `[[CONNECT:${prov}]]`;
                  // evita duplicati
                  if (!localText.includes(marker)) {
                    localText += (localText ? "\n\n" : "") + marker;
                    responseText += marker;
                    ensureAssistant();
                    scheduleText();
                    convActivityProduced = true;
                    patchSteps(assistantId, (steps) => [...steps, createConnectionStep(prov)]);
                  }
                }
                if ((json as unknown as { type?: string; agent_slug?: string }).type === "cart_updated" && typeof (json as unknown as { agent_slug?: string }).agent_slug === "string") {
                  const slug = (json as unknown as { agent_slug: string }).agent_slug;
                  const marker = `[[CART:${slug}]]`;
                  if (!localText.includes(marker)) {
                    localText += (localText ? "\n\n" : "") + marker;
                    responseText += marker;
                    ensureAssistant();
                    scheduleText();
                    convActivityProduced = true;
                  }
                  // Aggiorna badge/contatore carrello ovunque (navbar, provider).
                  try {
                    window.dispatchEvent(new CustomEvent("cart:updated"));
                  } catch {
                    // non-fatal (SSR/test)
                  }
                }
                if ((json as unknown as { type?: string; provider?: string }).type === "integration_disconnected" && typeof (json as unknown as { provider?: string }).provider === "string") {
                  const prov = (json as unknown as { provider: string }).provider;
                  const marker = `[[DISCONNECTED:${prov}]]`;
                  if (!localText.includes(marker)) {
                    localText += (localText ? "\n\n" : "") + marker;
                    responseText += marker;
                    ensureAssistant();
                    scheduleText();
                    convActivityProduced = true;
                  }
                }
                if (json.type === "error") {
                  streamErrorMessage =
                    typeof json.message === "string" && json.message.trim() ? json.message : null;
                  markSteps("running", "failed");
                  throw new Error("AI backend error");
                }
                // `done` chiude anche il while: prima usciva solo dal for e il
                // reader restava appeso fino alla chiusura del server.
                if (json.type === "done") {
                  streamDone = true;
                  break;
                }
              }
            }
          } catch (e) {
            // Stop dell'utente: i passi restano "in pausa", il testo parziale
            // resta dov'è, nessuna bolla di errore.
            if (controller.signal.aborted) {
              markSteps("running", "paused");
            } else {
              throw e;
            }
          } finally {
            if (rafId) {
              cancelAnimationFrame(rafId);
              rafId = 0;
            }
            if (pendingText !== null && assistantId) {
              patchAssistant(assistantId, prefix + pendingText, false, agent);
              pendingText = null;
            }
            // Rilascia sempre il lock: prima un errore a metà stream lasciava
            // il reader aperto e il fetch appeso in background.
            try {
              await reader.cancel().catch(() => {});
            } catch {
              // già chiuso
            }
            try {
              reader.releaseLock();
            } catch {}
          }
          markSteps("running", "completed");
          // Un turno fatto di soli tool (senza testo) è comunque una risposta
          // valida: l'ActivityFeed mostra cosa ha fatto l'agente.
          if (!localText.trim() && !convActivityProduced) throw new Error("Empty response");
        } finally {
          abortControllers.current.delete(convId);
        }
      }

      // Repository GitHub collegato: senza questo dato il modello non sa che
      // può leggere e scrivere nel codice, e i tool `github_repo_*` restano
      // disattivati lato server.
      const githubRepoPayload = activeGithubRepo
        ? {
            owner: activeGithubRepo.owner,
            repo: activeGithubRepo.repo,
            branch: activeGithubRepo.branch,
          }
        : undefined;

      if (targetSlugs.length === 0) {
        await streamOne(
          "/api/chat",
          withEphemeralFlag(
            {
              messages: apiMessages,
              githubRepo: githubRepoPayload,
              webSearch: webSearchEnabled,
            },
            sendIsEphemeral,
          ),
        );
      } else if (targetSlugs.length === 1) {
        await streamOne(
          "/api/agent/run",
          withEphemeralFlag(
            {
              agentId: targetSlugs[0],
              messages: apiMessages,
              files: Object.keys(filesMap).length > 0 ? filesMap : undefined,
              githubRepo: githubRepoPayload,
              webSearch: webSearchEnabled,
            },
            sendIsEphemeral,
          ),
          agentMeta(targetSlugs[0]),
        );
      } else {
        for (const slug of targetSlugs) {
          try {
            await streamOne(
              "/api/agent/run",
              withEphemeralFlag(
                {
                  agentId: slug,
                  messages: apiMessages,
                  files: Object.keys(filesMap).length > 0 ? filesMap : undefined,
                  githubRepo: githubRepoPayload,
                  webSearch: webSearchEnabled,
                },
                sendIsEphemeral,
              ),
              agentMeta(slug),
            );
          } catch (e) {
            // Stop dell'utente: non passare agli altri agenti.
            if (stopRequested.current.has(convId)) break;
            // Continua con gli altri agenti anche se uno fallisce
            console.error(`Agent ${slug} failed`, e);
          }
        }
        if (!responseText.trim() && !convActivityProduced) throw new Error("Empty response");
      }
    } catch {
      // Stop dell'utente (anche prima del reader): nessuna bolla di errore,
      // il testo parziale resta dov'è.
      if (stopRequested.current.has(convId)) {
        stopRequested.current.delete(convId);
      } else {
        // Niente risposte preimpostate: mostra l'errore reale con un link di contatto.

        const message =
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore — streamErrorMessage è string | null ma TS lo inferisce never per control flow
          (streamErrorMessage as unknown as string | null)?.trim()
            ? (streamErrorMessage as unknown as string)
            : dict.common.aiUnavailable;
        const assistantId = generateId();
        setPartialConvs((prev) => (prev.includes(convId) ? prev : [...prev, convId]));
        patchAssistant(assistantId, message, true);
      }
    }

    // Fine generazione: i messaggi non crescono più, quindi i puntini lasciano
    // il posto all'avatar dell'agente.
    for (const id of convStreamingIds) clearStreamingMsg(id);

    // I file prodotti dal modello diventano parte del messaggio: senza questo
    // le versioni precedenti si perderebbero al reload (nel `content` resta
    // solo l'ultima versione del blocco).
    const finishedFiles = parseChatFiles(responseText).files;
    const lastAssistantId = convStreamingIds[convStreamingIds.length - 1];
    if (finishedFiles.length > 0 && lastAssistantId) {
      const createdAt = conversationsRef.current.find((c) => c.id === convId)?.created_at;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const target = c.messages.find((m) => m.id === lastAssistantId);
          if (!target) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === lastAssistantId ? { ...m, files: mergeFileRecords(m.files, finishedFiles, createdAt) } : m,
            ),
          };
        }),
      );
    }

    streamingRef.current.delete(convId);
    stopRequested.current.delete(convId);
    setStreamingConvs((prev) => prev.filter((id) => id !== convId));
    // Notifica alla campanella che potrebbero esserci nuove notifiche agente
    try {
      window.dispatchEvent(new CustomEvent("agentcloud:notifications-refresh"));
    } catch {}

    // Coda: l'utente ha premuto Invio mentre la chat generava. La bolla è già
    // visibile; ora che la risposta è completa il messaggio parte davvero.
    const queue = queueRef.current[convId];
    const next = queue && queue.length > 0 ? queue.shift() : undefined;
    if (queue && queue.length === 0) delete queueRef.current[convId];
    if (next) {
      // Un tick di attesa: la cronologia (ref) deve includere la risposta
      // appena generata prima di inviare il messaggio in coda.
      await new Promise((r) => setTimeout(r, 0));
      await sendMessage(next.text, convId, next.pending, next.msgId);
    }
    // Risposta completata: ricarica il budget giornaliero mostrato sopra l'input.
    setLimitTick((n) => n + 1);
  }

  // Aggiorna l'input. Svuotare il campo cancella la bozza (così il testo
  // eliminato non ricompare al reload); per il testo non vuoto la persistenza
  // la fa l'effetto backstop, che copre anche le modifiche programmatiche.
  function handleInputChange(value: string) {
    setInput(value);
    if (value || !activeId) return;
    delete draftsRef.current[activeId];
    persistDrafts();
  }

  async function handleSend() {
    const text = input.trim();
    if ((!text && attach.attachments.length === 0) || !activeId) return;
    // Il messaggio viene SEMPRE consumato dall'input: se la chat sta già
    // generando va in coda (bolla subito visibile, invio appena la risposta in
    // corso finisce) invece di sparire silenziosamente. Il bottone invio è
    // disabilitato durante lo stream, ma Enter non lo è.
    const convId = activeId;
    const pending = attach.take();
    setInput("");
    // Il messaggio è stato inviato: la bozza non deve più ricomparire.
    delete draftsRef.current[convId];
    persistDrafts();
    inputRef.current?.focus();
    if (streamingRef.current.has(convId)) {
      const userMsg = appendUserMessage(text, convId, pending);
      (queueRef.current[convId] ||= []).push({ text, pending, msgId: userMsg.id });
      return;
    }
    await sendMessage(text, convId, pending);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleReplyToPhrase(phrase: string) {
    const quoted = `> ${phrase.trim()}\n\n`;
    setInput((prev) => (prev ? prev + "\n" + quoted : quoted));
    // Porta il focus sull'input
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Selettore agente. Nella chat vuota resta nella toolbar accanto al "+";
  // durante la conversazione vive fuori dall'input, nella riga sopra a destra.
  // `align` serve ad ancorare il menu: a destra per il picker esterno (con
  // `left-0` il menu w-72 uscirebbe dal contenitore), a sinistra per quello
  // nella toolbar, che è sulla sinistra.
  const renderAgentPicker = (align: "left" | "right") => (
    <div className="relative shrink-0" data-onboard="agent-picker">
      {/* Bottone con avatar + nome dell'agente. */}
      <button
        type="button"
        onClick={() => setShowAgentPicker((v) => !v)}
        aria-expanded={showAgentPicker}
        aria-haspopup="listbox"
        title={dict.chat.changeAgent}
        aria-label={dict.chat.changeAgent}
        className="flex h-8 max-w-44 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2.5 transition-all hover:border-white/25 hover:bg-white/10"
      >
        {activeAgent ? (
          <AgentAvatar agent={activeAgent} size="sm" circular />
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20">
            <Image
              src="/agentcloud.png"
              alt="AgentCloud"
              width={14}
              height={14}
              className="h-3.5 w-3.5"
            />
          </span>
        )}
        <span className="truncate text-xs font-bold text-neutral-200">
          {activeAgent ? activeAgentDisplayName : dict.chat.assistantName}
        </span>
        <ChevronDown size={12} className="shrink-0 text-neutral-500" />
      </button>

      {showAgentPicker && (
        <>
          <button
            type="button"
            aria-label={dict.chat.close}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setShowAgentPicker(false)}
          />
          <div
            ref={agentDropdownRef}
            className={`absolute bottom-full z-50 mb-2 w-72 rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {/* Search bar */}
            <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-neutral-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                ref={agentSearchRef}
                type="text"
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                placeholder={dict.chat.searchAgents}
                className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 outline-none"
              />
              {agentSearch && (
                <button
                  type="button"
                  onClick={() => setAgentSearch("")}
                  className="text-neutral-500 hover:text-white transition-colors"
                  aria-label={dict.chat.clearSearch}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>

            <div className="p-2">
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {dict.chat.agentsInChat}
              </p>
              <p className="px-2 pb-1.5 text-[11px] font-semibold leading-4 text-neutral-500">
                {dict.chat.agentSwitchNewChat}
              </p>
              {selectableAgents.length === 0 ? (
                <p className="px-2 py-2 text-xs text-neutral-500">
                  {dict.chat.noAgentsAvailable}
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {filteredAgents.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-neutral-500 text-center">{dict.chat.noSearchResults}</p>
                  ) : (
                    filteredAgents.map((a) => {
                      const isSelected = selectedAgentSlugs.includes(a.slug);
                      return (
                        <button
                          key={a.slug}
                          type="button"
                          onClick={() => toggleAgent(a.slug)}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-all ${
                            isSelected ? "bg-white/10" : "hover:bg-white/5"
                          }`}
                        >
                          <AgentAvatar agent={a} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">
                            {a.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  /** Chip sotto il titolo di ogni conversazione in sidebar: il progetto (se la
   *  chat ne appartiene a uno) e un solo chip con l'ultimo agente usato. Prima
   *  veniva mappato `conv.agentSlugs` per intero e una chat che aveva usato
   *  più agenti si riempiva di pill tutte insieme. */
  function conversationChips(conv: LocalConversation) {
    const slug = lastAgentSlugFor(conv);
    const proj = conv.projectId ? projects.find((p) => p.id === conv.projectId) : undefined;
    if (!proj && !slug) return null;
    const ag = slug ? agentsBySlug.get(slug) : undefined;
    return (
      <div className="ml-7 flex flex-wrap gap-1">
        {proj && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-neutral-300">
            <Folder size={8} />
            {proj.name}
          </span>
        )}
        {slug && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
              ag?.accent ?? "bg-brand-500/10 text-brand-300"
            }`}
          >
            {ag ? (
              <AgentIcon icon={ag.icon} brand={ag.brand} size={10} className="text-white" />
            ) : (
              <Bot size={8} />
            )}
            {ag?.name ?? slug}
          </span>
        )}
      </div>
    );
  }

  return (
    // data-streaming: stato di generazione della chat attiva, usato dagli E2E
    // per attendere la fine dello stream senza dipendere dal testo localizzato.
    // data-ghost: la modalità Ghost è attiva (usato dagli E2E e dal tema).
    <div
      className={`flex h-dvh ${
        isGhostMode
          ? "bg-[#0b0913] shadow-[inset_0_0_140px_rgba(139,92,246,0.12)]"
          : "bg-neutral-950"
      }`}
      data-streaming={isTyping ? "true" : "false"}
      data-ghost={isGhostMode ? "true" : "false"}
    >
      {/* Chat onboarding tour */}
      {showOnboarding && (
        <ChatOnboarding onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Overlay sidebar mobile */}
      {mobileSidebarVisible && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — glassmorphism style matching header */}
      <div className="relative shrink-0 lg:flex">
        <aside
          style={sidebarResize.isDesktop && sidebarVisible ? { width: sidebarResize.width } : undefined}
          className={`
            fixed lg:static inset-y-0 left-0 z-30
            w-64 bg-neutral-950/80 backdrop-blur-2xl border-r border-white/[0.06] h-dvh
              flex flex-col shrink-0 overflow-y-auto
              ${sidebarResize.dragging ? "transition-none" : "transition-all duration-300"}
              ${mobileSidebarVisible ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
              ${sidebarVisible ? "lg:w-64 lg:translate-x-0" : "lg:w-0 lg:overflow-hidden lg:border-0 lg:opacity-0"}
            `}
        >
        {/* Header: logo + nome piattaforma + chiudi. Logo e nome portano
            alla landing: sono il riferimento del brand, non un'etichetta. */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
            aria-label="AgentCloud"
          >
            <Image
              src="/agentcloud.png"
              alt="AgentCloud"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-sm font-bold tracking-tight text-white">AgentCloud</span>
          </Link>
          <button
            onClick={() => {
              // Su mobile il bottone chiude il drawer; su desktop restringe la
              // sidebar. Il nuovo toggle la riapre (vedi il bottone in testata
              // della chat, mostrato solo quando è ristretta).
              setMobileSidebarOpen(false);
              setSidebar(false);
            }}
            aria-label={dict.chat.closeSidebar}
            title={dict.chat.closeSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-all hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {/* Navigazione principale: solo nuova chat, progetti, artefatti e
            personalizzazione. Ognuno mostra il suo contenuto nello spazio chat. */}
        <nav data-onboard="nav" className="px-3 pt-3 pb-2 space-y-1">
          <button
            data-onboard="new-chat"
            onClick={() => {
              setSidebarView("chat");
              handleNewChat();
            }}
            className="flex h-9 w-full items-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-neutral-900 hover:bg-neutral-100 transition-all"
          >
            <Plus size={13} strokeWidth={2.5} className="shrink-0" />
            {dict.chat.newChat}
          </button>
          <button
            onClick={() => setSidebarView("projects")}
            className={`flex h-9 w-full items-center gap-2 rounded-xl px-3 text-xs font-bold transition-all ${
              sidebarView === "projects"
                ? "bg-white text-neutral-900"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Folder size={13} className="shrink-0" />
            {dict.chat.projects}
          </button>
          <button
            onClick={() => setSidebarView("artifacts")}
            className={`flex h-9 w-full items-center gap-2 rounded-xl px-3 text-xs font-bold transition-all ${
              sidebarView === "artifacts"
                ? "bg-white text-neutral-900"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileText size={13} className="shrink-0" />
            {dict.chat.artifacts}
          </button>
          <button
            onClick={() => setSidebarView("personalization")}
            className={`flex h-9 w-full items-center gap-2 rounded-xl px-3 text-xs font-bold transition-all ${
              sidebarView === "personalization"
                ? "bg-white text-neutral-900"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles size={13} className="shrink-0" />
            {dict.dashboardShell.navPersonalization}
          </button>
        </nav>

        {/* Conversations list */}
        <div data-onboard="conversations" className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
              {showArchived ? dict.chat.archived : dict.chat.conversations}
            </p>
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-[10px] font-bold text-neutral-500 hover:text-white transition-all"
            >
              {showArchived ? dict.chat.activeTab : dict.chat.archived}
            </button>
          </div>
          {conversations.filter((c) => (showArchived ? c.archived_at && !c.deleted_at : !c.archived_at && !c.deleted_at) && (!selectedProjectId || c.projectId === selectedProjectId)).length === 0 ? (
            <p className="text-xs text-neutral-600 px-3 py-6 text-center">
              {showArchived ? dict.chat.noArchivedConversations : dict.chat.noConversations}
            </p>
          ) : (
            conversations
              .filter((c) => (showArchived ? c.archived_at && !c.deleted_at : !c.archived_at && !c.deleted_at) && (!selectedProjectId || c.projectId === selectedProjectId))
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
                className={`group flex w-full cursor-pointer flex-col gap-1 px-2.5 py-2 rounded-lg text-[13px] text-left transition-all ${
                  conv.id === activeId
                    ? "bg-white/[0.06] text-white border border-white/[0.08]"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex w-full items-center gap-2.5">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-md shrink-0 ${
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
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConversationMenuId((v) => (v === conv.id ? null : conv.id));
                      }}
                      aria-haspopup="menu"
                      aria-expanded={conversationMenuId === conv.id}
                      aria-label={dict.chat.conversationOptions}
                      className={`p-1.5 min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 flex items-center justify-center rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-all ${
                        conversationMenuId === conv.id
                          ? "opacity-100 bg-white/10 text-white"
                          : conv.id === activeId
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                      }`}
                      title={dict.chat.conversationOptions}
                    >
                      <MoreVertical size={14} />
                    </button>
                    {conversationMenuId === conv.id && (
                      <>
                        <button
                          aria-label={dict.chat.close}
                          className="fixed inset-0 z-40 cursor-default"
                          onClick={(e) => { e.stopPropagation(); setConversationMenuId(null); }}
                        />
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl"
                        >
                          <button
                            role="menuitem"
                            onClick={(e) => { e.stopPropagation(); startRename(conv.id, conv.title); }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
                          >
                            <Pencil size={12} />
                            {dict.chat.rename}
                          </button>
                          <button
                            role="menuitem"
                            onClick={(e) => { e.stopPropagation(); handleArchive(conv.id); }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
                          >
                            {conv.archived_at ? <RotateCcw size={12} /> : <Archive size={12} />}
                            {conv.archived_at ? dict.chat.restore : dict.chat.archiveAction}
                          </button>
                          {/* Come il bottone nell'intestazione: si può condividere
                              solo una chat già iniziata. */}
                          {conv.messages.length > 0 && (
                            <button
                              role="menuitem"
                              onClick={(e) => { e.stopPropagation(); openShare(conv.id); }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
                            >
                              <Share2 size={12} />
                              {dict.chat.shareConversation}
                            </button>
                          )}
                          {projects.length > 0 && (
                            <>
                              <div className="mx-2 my-1 border-t border-white/[0.06]" />
                              <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                                {dict.chat.moveToProject}
                              </p>
                              <div className="max-h-36 overflow-y-auto">
                                {projects.map((p) => (
                                  <button
                                    key={p.id}
                                    role="menuitem"
                                    onClick={(e) => { e.stopPropagation(); moveConversationToProject(conv.id, conv.projectId === p.id ? undefined : p.id); }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
                                  >
                                    <Folder size={12} className={conv.projectId === p.id ? "text-brand-400" : ""} />
                                    <span className="min-w-0 flex-1 truncate text-left">{p.name}</span>
                                    {conv.projectId === p.id && <Check size={12} className="shrink-0 text-emerald-400" />}
                                  </button>
                                ))}
                              </div>
                              {conv.projectId && (
                                <button
                                  role="menuitem"
                                  onClick={(e) => { e.stopPropagation(); moveConversationToProject(conv.id, undefined); }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all"
                                >
                                  <Folder size={12} />
                                  {dict.chat.removeFromProject}
                                </button>
                              )}
                            </>
                          )}
                          <button
                            role="menuitem"
                            onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-all"
                          >
                            <Trash2 size={12} />
                            {dict.chat.deleteConversation}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {conversationChips(conv)}
              </div>
            ))
          )}

          {/* File della conversazione — click apre l'anteprima laterale. */}
          {conversationFiles.length > 0 && (
            <div className="px-2.5 pb-3 pt-1">
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                {dict.chat.files.conversationFiles}
              </p>
              <div className="space-y-0.5">
                {conversationFiles.slice(0, 12).map(({ record }) => (
                  <button
                    key={record.slug}
                    type="button"
                    onClick={() => setPreviewSlug(record.slug)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all ${
                      previewSlug === record.slug
                        ? "bg-white/[0.06] text-white"
                        : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                    }`}
                  >
                    <FileText size={12} className="shrink-0 text-neutral-500" />
                    <span className="min-w-0 flex-1 truncate">{record.title || record.name}</span>
                    {record.currentVersion > 1 && (
                      <span className="shrink-0 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                        v{record.currentVersion}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Account: il click apre il menu account di fianco alla sidebar */}
        <div data-onboard="account" className="relative p-2 border-t border-white/[0.06]">
          <AccountMenu
            email={accountEmail}
            avatarUrl={accountAvatarUrl}
            labelBase={accountLabelBase}
            tooltip={accountTooltip}
            sidebarWidth={sidebarResize.width}
            isDesktop={sidebarResize.isDesktop}
            open={accountMenuOpen}
            onOpenChange={setAccountMenuOpen}
          />
        </div>
      </aside>
        {/* Maniglia di ridimensionamento: si trascina il bordo destro (solo
            desktop e solo con la sidebar aperta). */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={dict.chat.resizeSidebar}
          aria-valuenow={sidebarResize.width}
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          tabIndex={0}
          onPointerDown={sidebarResize.startResize}
          onKeyDown={sidebarResize.onKeyDown}
          className={`absolute inset-y-0 right-0 z-40 w-1.5 cursor-col-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 ${
            sidebarVisible ? "hidden lg:block" : "hidden"
          } ${sidebarResize.dragging ? "bg-brand-500/40" : "hover:bg-brand-500/20"}`}
        />
      </div>

      <div className="relative flex flex-1 flex-col min-w-0 overflow-hidden">
        <AppHeader
          variant="chat"
          agentLabel={activeAgentDisplayName}
          quickSettings={{
            agents: selectableAgents.map((a) => ({ slug: a.slug, name: a.name })),
            defaultAgentSlug,
            onDefaultAgentChange: handleDefaultAgentChange,
            textSize: chatTextSize,
            onTextSizeChange: handleChatTextSizeChange,
          }}
        />
        {/* Header trasparente sopra i messaggi: titolo + agente a sinistra,
            condivisione e dashboard a destra.
            In modalità Ghost il gradiente di sfondo diventa viola e il
            titolo è accompagnato dall'etichetta "non verrà salvata". */}
        <div
          className={`absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b ${
            isGhostMode
              ? "from-[#12101c] via-[#12101c]/70 to-transparent"
              : "from-neutral-900 via-neutral-900/70 to-transparent"
          } px-4 pb-5 pt-2 sm:px-6`}
        >
          <div className={`flex min-w-0 items-center gap-2 ${!sidebarVisible ? "pl-44" : ""}`}>
            <p className="truncate text-sm font-bold text-white">
              {activeConv?.title ?? dict.chat.newChat}
            </p>
            {selectedAgents.length > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-bold text-brand-300">
                <Bot size={10} />
                {activeAgentDisplayName}
              </span>
            )}
            {/* Etichetta discreta di modalità Ghost: dice chiaramente che la
                conversazione non verrà salvata. */}
            {isGhostMode && (
              <span
                role="status"
                className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold text-purple-200"
              >
                <Ghost size={11} aria-hidden="true" />
                <span className="truncate">{dict.chat.ghost.banner}</span>
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <GhostModeButton
              active={isGhostMode}
              label={isGhostMode ? dict.chat.ghost.exit : dict.chat.ghost.enter}
              onToggle={handleGhostToggle}
            />
            {/* Condividere una chat vuota non ha senso: il bottone compare
                solo quando la conversazione è iniziata. */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => activeId && openShare(activeId)}
                disabled={!activeId || activeIsEphemeral}
                aria-label={dict.chat.shareConversation}
                title={
                  activeIsEphemeral
                    ? dict.chat.ghost.shareDisabled
                    : dict.chat.shareConversation
                }
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-all hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <Share2 size={15} />
              </button>
            )}
            <Link
              href="/dashboard"
              aria-label="Dashboard"
              title="Dashboard"
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-all hover:bg-white/10 hover:text-white"
            >
              <Home size={15} />
            </Link>
          </div>
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          {/* Trigger sidebar su mobile: in modalità Ghost il drawer della
              cronologia resta disabilitato (l'icona fantasma resta visibile
              nell'header). */}
          {!isGhostMode && (
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-[calc(1rem+env(safe-area-inset-left))] z-10 w-11 h-11 bg-brand-500 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 hover:bg-brand-400 transition-all"
              title={dict.chat.openSidebar}
            >
              <MessageSquare size={18} className="text-white" />
            </button>
          )}

          {/* Riapertura sidebar su desktop: senza questo, una volta ristretta la
              sidebar restava chiusa fino al reload (era il difetto: esisteva
              solo `setSidebarOpen(false)`).(hidden sotto lg: il mobile usa il
              drawer e il FAB sopra)
              In modalità Ghost il bottone di riapertura non c'è: la sidebar
              resta nascosta finché la modalità è attiva. */}
          {!sidebarVisible && (
            <div className="hidden lg:flex absolute left-3 top-3 z-10 items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80"
                aria-label="AgentCloud"
              >
                <Image
                  src="/agentcloud.png"
                  alt="AgentCloud"
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
                <span className="text-sm font-bold tracking-tight text-white">AgentCloud</span>
              </Link>
              {!isGhostMode && (
                <button
                  onClick={() => setSidebar(true)}
                  aria-label={dict.chat.openSidebar}
                  title={`${dict.chat.openSidebar} (Ctrl+B)`}
                  className="flex w-9 h-9 items-center justify-center rounded-full text-neutral-500 transition-all hover:bg-white/10 hover:text-white"
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
            </div>
          )}

          {/* Area chat principale */}
          <main
            style={chatTextSize === "md" ? undefined : { zoom: chatTextZoom(chatTextSize) }}
            className={`flex-1 flex flex-col min-h-0 relative ${
              isGhostMode ? "bg-[#12101c]" : "bg-neutral-900"
            }`}
        onDragEnter={attach.onDragEnter}
        onDragOver={attach.onDragOver}
        onDragLeave={attach.onDragLeave}
        onDrop={attach.makeDrop(attachLabels)}
      >
        {/* ── Projects view ────────────────────────────────────── */}
        {sidebarView === "projects" && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-14 pb-6">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-gradient-to-br from-brand-500/20 to-purple-500/20">
                    <Folder size={18} className="text-brand-300" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-white mb-1">{dict.chat.projects}</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openProjectCreate}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-neutral-900 hover:bg-neutral-100 transition-all"
                >
                  <FolderPlus size={13} />
                  {dict.chat.newProject}
                </button>
              </div>
              {projects.length === 0 ? (
                <p className="rounded-xl border border-white/5 bg-neutral-800/30 px-4 py-6 text-center text-sm text-neutral-500">
                  {dict.chat.newProject}
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => {
                    const count = conversations.filter((c) => c.projectId === p.id && !c.deleted_at).length;
                    const selected = selectedProjectId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${selected ? "border-brand-500/40 bg-brand-500/5" : "border-white/5 bg-neutral-800/50"}`}
                      >
                        <Folder size={16} className={`shrink-0 ${selected ? "text-brand-400" : "text-neutral-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">{p.name}</p>
                          <p className="truncate text-xs text-neutral-500">
                            {count} · {p.agentSlugs.length > 0 ? p.agentSlugs.map((s) => agentsBySlug.get(s)?.name ?? s).join(", ") : dict.chat.assistantName}
                          </p>
                          {p.instructions && (
                            <p className="mt-0.5 truncate text-xs italic text-neutral-600">{p.instructions}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(selected ? null : p.id);
                            setSidebarView("chat");
                          }}
                          className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-all"
                        >
                          {selected ? dict.chat.close : dict.chat.open}
                        </button>
                        <button
                          type="button"
                          onClick={() => openProjectEdit(p.id)}
                          aria-label={`${dict.chat.projectEdit}: ${p.name}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-all hover:bg-white/10 hover:text-white"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Artifacts view ────────────────────────────────────── */}
        {sidebarView === "artifacts" && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-gradient-to-br from-brand-500/20 to-purple-500/20">
                  <FileText size={18} className="text-brand-300" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white mb-1">
                    {dict.chat.artifacts} {allFiles.length > 0 && <span className="text-sm text-neutral-500">· {allFiles.length}</span>}
                  </h2>
                </div>
              </div>
              {allFiles.length === 0 ? (
                <p className="rounded-xl border border-white/5 bg-neutral-800/30 px-4 py-6 text-center text-sm text-neutral-500">
                  {dict.chat.files.noFiles}
                </p>
              ) : (
                <div className="space-y-2">
                  {allFiles.map((f) => (
                    <button
                      key={`${f.convId}:${f.slug}`}
                      type="button"
                      onClick={() => openArtifact(f.convId, f.slug)}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-neutral-800/50 px-4 py-3 text-left transition-all hover:bg-neutral-800 hover:border-white/10"
                    >
                      <FileText size={16} className="shrink-0 text-neutral-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{f.name}</p>
                        <p className="truncate text-xs text-neutral-500">{f.convTitle}</p>
                      </div>
                      <ArrowRight size={14} className="text-neutral-600 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Personalization view ────────────────────────────────────── */}
        {sidebarView === "personalization" && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-gradient-to-br from-brand-500/20 to-purple-500/20">
                  <Sparkles size={18} className="text-brand-300" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white mb-1">{dict.dashboardShell.navPersonalization}</h2>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { href: "/dashboard/integrations", label: dict.dashboardShell.navIntegrations, icon: Plug },
                  { href: "/skills", label: dict.dashboardShell.navSkills, icon: Sparkles },
                  { href: "/plugins", label: dict.dashboardShell.navPlugins, icon: Blocks },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-neutral-800/50 px-4 py-3 transition-all hover:bg-neutral-800 hover:border-white/10"
                  >
                    <Icon size={16} className="shrink-0 text-neutral-400" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{label}</span>
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
              <div className="mb-6 flex items-center justify-center gap-3 text-center">
                <Image
                  src="/agentcloud.png"
                  alt="AgentCloud"
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0"
                />
                <h2 className="text-2xl font-bold text-white">
                  {dict.chat.emptyTitle}
                </h2>
              </div>
              <div className="mb-6 text-center -mt-4">
                <p className="text-sm text-neutral-400 max-w-lg leading-relaxed">
                  {dict.chat.emptySubtitle}
                </p>
              </div>

              {/* Input ridotto centrato */}
              <div className="w-full max-w-3xl px-4">
                {/* Budget di token: anche nella chat vuota l'utente deve
                    vedere quanto gliene resta. */}
                {tokenBudgetLine && (
                  <TokenBudgetLine
                    ratio={tokenBudgetLine.ratio}
                    level={tokenBudgetLine.level}
                    text={tokenBudgetLine.text}
                  />
                )}
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
                      imageAlt={dict.common.imageAttached}
                    />
                    {attach.notice && <p className="mb-2 text-center text-xs text-amber-400">{attach.notice}</p>}
                    <div className="relative bg-neutral-800 rounded-2xl border border-white/10 shadow-xl shadow-black/25 focus-within:border-brand-500/50 focus-within:shadow-lg focus-within:shadow-brand-500/5 transition-all">
                      <LinkAwareTextarea
                        inputRef={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onPaste={attach.makePaste(attachLabels)}
                        placeholder={dict.chat.placeholder}
                        rows={2}
                        wrapperClassName="w-full"
                        className="px-4 pt-3 pb-16"
                        style={{ minHeight: "84px", maxHeight: "280px" } as React.CSSProperties}
                      />
                      {/* Bottom toolbar: selettore agente accanto al "+", senza linea sopra */}
                      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-3 bg-neutral-800/50 backdrop-blur-sm rounded-b-2xl">
                        <ChatPlusMenu
                          labels={plusLabels}
                          disabled={isTyping}
                          onFiles={(files) => attach.addFiles(files, attachLabels)}
                          onScreenshot={(file) => attach.addFiles([file], attachLabels)}
                          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                          onSelectProject={addToProject}
                          repos={githubRepos}
                          activeRepo={activeGithubRepo}
                          onSelectRepo={selectGithubRepo}
                          onUnlinkRepo={unlinkGithubRepo}
                          onLinkRepo={linkGithubRepo}
                          githubConnected={githubConnected}
                          webSearch={webSearchEnabled}
                          onToggleWebSearch={setWebSearchEnabled}
                        />
                        {renderAgentPicker("left")}
                        <div className="flex-1 flex items-center justify-end gap-2">
                          <VoiceInput onTranscript={(text) => setInput((prev) => prev + (prev ? " " : "") + text)} onVoiceModeToggle={setIsVoiceMode} disabled={isTyping || !activeId} isVoiceMode={isVoiceMode} />
                          <button
                            onClick={handleSend}
                            disabled={(!input.trim() && attach.attachments.length === 0) || isTyping || !activeId}
                            aria-label={dict.chat.sendMessage}
                            title={dict.chat.sendMessage}
                            className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed ${
                              (!input.trim() && attach.attachments.length === 0) || isTyping || !activeId
                                ? "bg-neutral-800 text-neutral-600 shadow-none"
                                : "bg-gradient-to-br from-[#038bfe] to-[#0066cc] text-white shadow-[0_0_16px_rgba(3,139,254,0.45),0_4px_12px_rgba(0,0,0,0.3)] hover:brightness-110 hover:scale-105 hover:shadow-[0_0_22px_rgba(3,139,254,0.6),0_4px_12px_rgba(0,0,0,0.3)] active:scale-95"
                            }`}
                          >
                            <ArrowUp size={18} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-600 text-center mt-2">{dict.chat.disclaimer}</p>
                </div>
              </div>

              {/* Suggerimenti dinamici */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-3xl px-4">
                {dynamicSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(suggestion);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="group flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-left text-[13px] text-neutral-300 hover:bg-white/[0.06] hover:border-brand-500/30 hover:text-white transition-all duration-200"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 group-hover:bg-brand-500/20 transition-colors">
                      <MessageSquare size={12} />
                    </span>
                    <span className="truncate leading-snug">{suggestion}</span>
                  </button>
                ))}
              </div>
              {/* Prompt marketplace per utenti senza agenti */}
              {availableAgents.filter((a) => a.slug !== "").length === 0 && (
                <p className="mt-4 text-xs text-neutral-500 text-center">
                  {dict.chat.orBrowsePrefix}
                  <Link href="/agents" className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors">
                    {dict.chat.browseMarketplace}
                  </Link>
                  {dict.chat.discoverAgentsSuffix}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative flex-1 flex flex-col min-h-0"
            >
            <div
              ref={attachMessages}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto px-4 sm:px-6 pt-14 pb-48"
            >
            <div ref={contentRef} className="space-y-6 mx-auto max-w-4xl">
            {messages.map((msg, msgIndex) => {
              // Divisore di cambio agente: avviso visivo nella stessa chat,
              // mai inviato alle API. Mostra da quale agente a quale si passa.
              if (msg.role === "system" && msg.systemKind === "agent-switch") {
                const target = msg.agentSlug ? agentForMessage(msg) : null;
                const toName = msg.agentName ?? dict.chat.assistantName;
                return (
                  <div key={msg.id} className="flex items-center gap-3 py-1" role="separator" aria-label={t(dict.chat.nowChattingWith, { name: toName })}>
                    <span className="h-px flex-1 bg-white/10" />
                    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">
                      {target ? (
                        <AgentAvatar agent={target} size="sm" />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20">
                          <Image
                            src="/agentcloud.png"
                            alt="AgentCloud"
                            width={14}
                            height={14}
                            className="h-3.5 w-3.5"
                          />
                        </span>
                      )}
                      <span className="min-w-0 text-left">
                        <span className="block truncate font-bold text-neutral-200">
                          {t(dict.chat.nowChattingWith, { name: toName })}
                        </span>
                        <span className="block text-[11px] font-medium text-neutral-500">
                          {dict.chat.agentSwitchHint}
                        </span>
                      </span>
                    </span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                );
              }
              return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }${msg.role === "user" && msg.id === justSentId ? " animate-msg-send" : ""}`}
              >
                {/* Durante lo streaming l'avatar è sostituito dai tre
                    puntini (stesso ingombro): l'avatar dell'agente torna
                    visibile quando il messaggio è completo. */}
                {msg.role === "assistant" &&
                  (streamingMsgIds.includes(msg.id) ? (
                    <div className="mt-0.5 shrink-0">
                      <TypingDots size="sm" />
                    </div>
                  ) : agentForMessage(msg) ? (
                    <div className="mt-0.5 shrink-0">
                      <AgentAvatar agent={agentForMessage(msg)!} size="sm" />
                    </div>
                  ) : (
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-gradient-to-br from-brand-500/20 to-purple-500/20">
                      <Image
                        src="/agentcloud.png"
                        alt="AgentCloud"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </div>
                  ))}
                <div
                  className={`${
                    msg.role === "user"
                      // La bolla utente abbraccia il contenuto (senza w-full):
                      // i messaggi corti non si allargano per tutta la riga.
                      ? "order-1 max-w-[80%] sm:max-w-[55%]"
                      : "max-w-[85%] sm:max-w-[75%] w-full"
                  }`}
                >
                  {/* Chi sta parlando: nome dell'agente sopra la bolla */}
                  {msg.role === "assistant" && msg.agentName && (
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${agentForMessage(msg)?.accent ?? "bg-brand-400"}`} />
                      {msg.agentName}
                    </p>
                  )}
                  <div
                    className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "whitespace-pre-wrap bg-white/5 text-white rounded-2xl rounded-br-md border border-white/5"
                        : "text-neutral-200"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      (() => {
                        const providers = extractConnectProviders(msg.content);
                        const cartSlugs = extractCartSlugs(msg.content);
                        const disconnected = extractDisconnectedProviders(msg.content);
                        const cleanText = stripDisconnectedMarkers(stripCartMarkers(stripConnectMarkers(msg.content)));
                        // I blocchi <agentcloud_file> non si vedono mai come testo:
                        // il parser li estrae e al loro posto finisce la card.
                        const isLiveFileMessage =
                          isStreamingActive && msg.id === messages[messages.length - 1]?.id;
                        // I blocchi <agentcloud_file> vanno estratti SEMPRE, anche
                        // dopo lo streaming: altrimenti il contenuto del file resta
                        // sparso nel testo della bolla.
                        const parsedFiles = parseChatFiles(cleanText);
                        const msgFiles = filesOfMessage(msg, isLiveFileMessage);
                        // La card "Connetti" compare SOLO se l'utente l'ha chiesta
                        // esplicitamente nel messaggio che precede questa risposta
                        // ("collega Gmail"). Se il modello scrive il marker di sua
                        // iniziativa, il marker resta invisibile e nessuna card
                        // spinge alla connessione.
                        const prevUserText = [...messages.slice(0, msgIndex)]
                          .reverse()
                          .find((m) => m.role === "user")?.content;
                        const requested =
                          typeof prevUserText === "string"
                            ? new Set(requestedConnectProviders(prevUserText))
                            : new Set<string>();
                        const cardProvider = providers.find((p) => requested.has(p));
                        // Errore di generazione: card azionabile invece del testo tecnico.
                        if (msg.error) {
                          return (
                            <AgentErrorCard
                              message={cleanText || dict.common.aiUnavailable}
                              supportEmail={PUBLIC_SUPPORT_EMAIL}
                            />
                          );
                        }
                        const steps = msg.activity ?? [];
                        const runningStep = steps.find((s) => s.status === "running");
                        const isLive =
                          runningStep !== undefined &&
                          streamingConvs.includes(activeId ?? "");
                        return (
                          <>
                            {isLive && <WorkingIndicator label={runningStep.label} />}
                            {steps.length > 0 && <ActivityFeed steps={steps} />}
                            {parsedFiles.text && <MarkdownText text={parsedFiles.text} onReply={handleReplyToPhrase} />}
                            {cardProvider && (
                              <InlineConnectCard provider={cardProvider} />
                            )}
                            {cartSlugs.map((slug) => (
                              <InlineCartCard key={slug} slug={slug} />
                            ))}
                            {disconnected.map((prov) => (
                              <p key={prov} className="my-2 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                                <Plug size={12} aria-hidden className="text-neutral-500" />
                                {prov} disconnesso — l&apos;agente non vi accede più.
                              </p>
                            ))}
                            {msgFiles.map((record) => (
                              <FileCard
                                key={record.slug}
                                record={record}
                                streaming={isLiveFileMessage && record.versions[record.versions.length - 1]?.content !== parsedFiles.files.find((f) => f.id === record.slug)?.content}
                                onOpen={setPreviewSlug}
                                onRetry={retryFile}
                                disabled={isTyping && !isLiveFileMessage}
                              />
                            ))}
                          </>
                        );
                      })()
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
                                  alt={file.name || dict.common.imageAttached}
                                  className="max-h-36 max-w-[180px] rounded-lg object-cover border border-white/10"
                                  loading="lazy"
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
                  <div
                    className="relative mt-0.5 order-2 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-700"
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
                      className="text-white"
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
              );
            })}

          {/* Indicatori di generazione.
              I tre puntini SOSTITUISCONO l'avatar dell'agente (stesso ingombro,
              così le righe non saltano) e l'avatar torna a comparire quando il
              messaggio è completo: vedi `streamingMsgId` nel render dei
              messaggi. Qui sotto restano solo le etichette di contesto
              ("sta lavorando su", "sta pensando"), senza la bolla con i
              puntini che sarebbe ora un duplicato. */}
          {isTyping && !hasPartialReply && (
            <div className="flex items-start gap-3">
              <TypingDots size="sm" />
              <div className="max-w-[85%] pt-1">
                {activeWorkingApps.length > 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20">
                      <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {dict.chat.workingOn}
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
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-300">
                    {dict.chat.thinking}
                  </div>
                )}
              </div>
            </div>
          )}

            </div>
        </div>

        {/* Torna in fondo: visibile quando l'utente è risalito a leggere
            (anche durante la generazione). Riaggancia l'auto-scroll. */}
        <AnimatePresence>
          {!isAtBottom && (
            <motion.button
              key="go-bottom"
              type="button"
              onClick={() => pinToBottom(true, true)}
              aria-label={dict.chat.goBottom}
              title={dict.chat.goBottom}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-36 left-1/2 z-20 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-neutral-800/95 text-neutral-300 shadow-xl shadow-black/40 backdrop-blur transition-colors hover:bg-neutral-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <ArrowDown size={16} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input in basso: fondo pieno con bordo superiore, niente trasparenza */}
        <div
          data-onboard="chat-input"
          className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-neutral-900 via-neutral-900/85 to-transparent px-4 sm:px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-8"
          onDragEnter={attach.onDragEnter}
          onDragOver={attach.onDragOver}
          onDragLeave={attach.onDragLeave}
          onDrop={attach.makeDrop(attachLabels)}
        >
          <div className="relative mx-auto max-w-4xl">
            {/* Budget di token del piano: quanto hai usato, quanto ti resta e
                quando il budget si rinnova. È la sola cosa che l'utente deve
                poter leggere per capire se l'agente può ancora lavorare. */}
            {tokenBudgetLine && (
              <TokenBudgetLine
                ratio={tokenBudgetLine.ratio}
                level={tokenBudgetLine.level}
                text={tokenBudgetLine.text}
              />
            )}
            {/* Budget giornaliero freemium sopra l'input, con ora locale del reset */}
            {dailyLimit && !dailyLimit.unlimited && limitSlug && (
              <p className="mb-2 text-center text-[11px] font-semibold text-neutral-500">
                {t(dict.chat.dailyLimit, {
                  remaining: dailyLimit.remaining,
                  limit: dailyLimit.limit,
                  time: dailyLimit.resetAt
                    ? new Date(dailyLimit.resetAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—",
                })}
              </p>
            )}
            {/* Riga sopra l'input: comandi (PDF / Looker Studio) a sinistra e
                selettore agente a destra, fuori dall'input. */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <ExportReportButton
                    variant="floating"
                    type="chat"
                    messages={messages
                      .filter((m) => m.role !== "system")
                      .map((m) => ({
                        role: m.role as "user" | "assistant",
                        content: m.content,
                        agentName:
                          m.role === "assistant"
                            ? (m.agentName ?? activeAgentDisplayName)
                            : undefined,
                        timestamp: m.created_at,
                      }))}
                    agentName={activeAgentDisplayName || "AgentCloud"}
                    agentSlug={activeAgentId || "agent"}
                  />
                )}
              </div>
              {renderAgentPicker("right")}
            </div>
            {paywallSlug && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                <p className="text-xs font-semibold text-amber-300">
                  {dict.paywallModal.limitReached} — 5/5
                </p>
                <button
                  onClick={() => setPaywallSlug(paywallSlug)}
                  className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white hover:bg-amber-400"
                >
                  {dict.paywallModal.subscribe}
                </button>
              </div>
            )}
            <DropHint visible={attach.dragOver} text={attachLabels.dropHint} />
            <AttachmentChips
              items={attach.attachments}
              onRemove={attach.remove}
              removeLabel={(name) => dict.chat.removeAttachment.replace("{name}", name)}
              imageAlt={dict.common.imageAttached}
            />
            {attach.notice && <p className="mb-2 text-center text-xs text-amber-400">{attach.notice}</p>}
            {pendingApproval && pendingApproval.convId === activeId && (
              <div
                role="alertdialog"
                aria-label={dict.chat.activity.toolApprovalTitle}
                className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5"
              >
                <p className="text-xs font-bold text-amber-200">
                  {dict.chat.activity.toolApprovalTitle}
                </p>
                <p className="mt-1 font-mono text-[11px] text-amber-100/80">
                  {pendingApproval.toolName}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={approvePending}
                    className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white hover:bg-amber-400"
                  >
                    {dict.chat.activity.toolApprovalApprove}
                  </button>
                  <button
                    type="button"
                    onClick={denyPending}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-neutral-200 hover:bg-white/20"
                  >
                    {dict.chat.activity.toolApprovalDeny}
                  </button>
                </div>
              </div>
            )}
            {/* Input su una riga: "+" a sinistra, testo al centro, comandi a
                destra. Il selettore agente è fuori, nella riga sopra. */}
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-neutral-800 px-3 py-2 shadow-xl shadow-black/25 focus-within:border-brand-500/50 focus-within:shadow-lg focus-within:shadow-brand-500/5 transition-all">
              <div className="flex h-11 shrink-0 items-center">
                <ChatPlusMenu
                  labels={plusLabels}
                  disabled={isTyping}
                  onFiles={(files) => attach.addFiles(files, attachLabels)}
                  onScreenshot={(file) => attach.addFiles([file], attachLabels)}
                  projects={projects.map((p) => ({ id: p.id, name: p.name }))}
                  onSelectProject={addToProject}
                  repos={githubRepos}
                  activeRepo={activeGithubRepo}
                  onSelectRepo={selectGithubRepo}
                  onUnlinkRepo={unlinkGithubRepo}
                  onLinkRepo={linkGithubRepo}
                  githubConnected={githubConnected}
                  webSearch={webSearchEnabled}
                  onToggleWebSearch={setWebSearchEnabled}
                />
              </div>
              <LinkAwareTextarea
                inputRef={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={attach.makePaste(attachLabels)}
                placeholder={dict.chat.placeholder}
                rows={1}
                wrapperClassName="flex-1"
                className="py-2.5"
                style={{ fieldSizing: "content", maxHeight: "160px" } as React.CSSProperties}
              />
              <div className="flex shrink-0 items-center gap-2">
                  <VoiceInput onTranscript={(text) => setInput((prev) => prev + (prev ? " " : "") + text)} onVoiceModeToggle={setIsVoiceMode} disabled={isTyping || !activeId} isVoiceMode={isVoiceMode} />
                  {isTyping ? (
                    <button
                      onClick={() => activeId && stopStreaming(activeId)}
                      aria-label={dict.chat.activity.stopGeneration}
                      title={dict.chat.activity.stopGeneration}
                      className="w-9 h-9 rounded-lg flex items-center justify-center bg-neutral-700 text-white hover:bg-neutral-600 transition-all shrink-0 shadow-lg shadow-black/20"
                    >
                      <Square size={16} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={(!input.trim() && attach.attachments.length === 0) || isTyping || !activeId}
                      aria-label={dict.chat.sendMessage}
                      title={dict.chat.sendMessage}
                      className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed ${
                        (!input.trim() && attach.attachments.length === 0) || isTyping || !activeId
                          ? "bg-neutral-800 text-neutral-600 shadow-none"
                          : "bg-gradient-to-br from-[#038bfe] to-[#0066cc] text-white shadow-[0_0_16px_rgba(3,139,254,0.45),0_4px_12px_rgba(0,0,0,0.3)] hover:brightness-110 hover:scale-105 hover:shadow-[0_0_22px_rgba(3,139,254,0.6),0_4px_12px_rgba(0,0,0,0.3)] active:scale-95"
                      }`}
                    >
                      <ArrowUp size={18} strokeWidth={2.5} />
                    </button>
                  )}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-neutral-600 text-center mt-2">{dict.chat.disclaimer}</p>
        </div>
        </motion.div>
          )}
        </AnimatePresence>
        )}
        </main>
        <AnimatePresence>
          {activePreviewFile && (
            <PreviewPanel
              key={activePreviewFile.slug}
              record={activePreviewFile}
              streaming={isPreviewStreaming}
              epoch={panelEpoch}
              onClose={() => setPreviewSlug(null)}
              onRetry={retryFile}
              onSaveToIntegration={saveFileToIntegration}
              onRestore={handleRestoreFile}
              onEdit={handleEditFile}
            />
          )}
        </AnimatePresence>
        </div>
      </div>
      {/* Dialog di conferma della modalità Ghost:
          - "enter": la chat aperta ha messaggi → parte una NUOVA chat fantasma
            e quella corrente resta intatta in cronologia;
          - "exit": la chat fantasma ha messaggi → vengono eliminati per sempre. */}
      {ghostDialog === "enter" && (
        <GhostConfirmDialog
          title={dict.chat.ghost.confirmEnterTitle}
          body={dict.chat.ghost.confirmEnterBody}
          confirmLabel={dict.chat.ghost.confirmEnterCta}
          cancelLabel={dict.chat.ghost.cancel}
          onConfirm={confirmGhostEnter}
          onCancel={() => setGhostDialog(null)}
        />
      )}
      {ghostDialog === "exit" && (
        <GhostConfirmDialog
          title={dict.chat.ghost.confirmExitTitle}
          body={dict.chat.ghost.confirmExitBody}
          confirmLabel={dict.chat.ghost.confirmExitCta}
          cancelLabel={dict.chat.ghost.cancel}
          tone="danger"
          onConfirm={confirmGhostExit}
          onCancel={() => setGhostDialog(null)}
        />
      )}
      {/* Modale condivisione in sola lettura: crea/copia/revoca il link. */}
      {shareConvId && (() => {
        const conv = conversations.find((c) => c.id === shareConvId);
        if (!conv) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={dict.chat.shareTitle}>
            <button
              type="button"
              aria-label={dict.chat.close}
              className="absolute inset-0 cursor-default bg-black/60"
              onClick={() => setShareConvId(null)}
            />
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-2xl shadow-black/60">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                  <Share2 size={16} />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-white">{dict.chat.shareTitle}</h2>
                  <p className="truncate text-xs text-neutral-500">{conv.title}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-neutral-400">{dict.chat.shareWarning}</p>
              {shareError && (
                <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
                  {shareError}
                </p>
              )}
              {shareNotice && (
                <p role="status" className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                  {shareNotice}
                </p>
              )}
              {conv.shareToken ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <Link2 size={14} className="shrink-0 text-neutral-500" />
                    <span className="min-w-0 flex-1 truncate text-xs text-neutral-300">
                      {shareUrlFor(conv.shareToken)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => copyShareLink(conv.shareToken!)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold text-neutral-900 hover:bg-neutral-100 transition-all"
                    >
                      {shareCopied ? <Check size={13} /> : <Copy size={13} />}
                      {shareCopied ? dict.chat.shareCopied : dict.chat.shareCopyLink}
                    </button>
                    <button
                      type="button"
                      disabled={shareBusy}
                      onClick={() => revokeShareLink(conv.id, conv.shareToken!)}
                      className="flex-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      {dict.chat.shareRevoke}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={shareBusy || conv.messages.length === 0}
                  onClick={() => createShareLink(conv.id)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-500 px-3 py-2.5 text-sm font-bold text-white hover:bg-brand-400 transition-all disabled:opacity-50"
                >
                  <Link2 size={14} />
                  {dict.chat.shareCreateLink}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShareConvId(null)}
                className="mt-3 w-full rounded-full px-3 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-all"
              >
                {dict.chat.close}
              </button>
            </div>
          </div>
        );
      })()}
      {/* Modale crea/modifica progetto */}
      {projectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={dict.chat.projects}>
          <button
            type="button"
            aria-label={dict.chat.close}
            className="absolute inset-0 cursor-default bg-black/60"
            onClick={() => setProjectModal(null)}
          />
          <div className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-2xl shadow-black/60">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                <Folder size={16} />
              </span>
              <h2 className="text-sm font-bold text-white">
                {projectModal.mode === "create" ? dict.chat.newProject : dict.chat.projectEdit}
              </h2>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                {dict.chat.projectName}
              </span>
              <input
                value={projectFormName}
                onChange={(e) => setProjectFormName(e.target.value)}
                placeholder={dict.chat.projectName}
                maxLength={80}
                className="w-full rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-500"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                {dict.chat.projectInstructions}
              </span>
              <textarea
                value={projectFormInstructions}
                onChange={(e) => setProjectFormInstructions(e.target.value)}
                placeholder={dict.chat.projectInstructionsHint}
                rows={3}
                maxLength={4000}
                className="w-full resize-y rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-sm leading-relaxed text-white placeholder-neutral-500 outline-none focus:border-brand-500"
              />
            </label>
            {selectableAgents.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  {dict.chat.projectAgentsHint}
                </p>
                <div className="max-h-36 space-y-0.5 overflow-y-auto rounded-xl border border-white/10 bg-neutral-800/50 p-1">
                  {selectableAgents.map((a) => {
                    const on = projectFormAgents.includes(a.slug);
                    const full = agentsBySlug.get(a.slug);
                    return (
                      <button
                        key={a.slug}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setProjectFormAgents((prev) => (on ? prev.filter((s) => s !== a.slug) : [...prev, a.slug]))}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold transition-all ${on ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white"}`}
                      >
                        {full ? <AgentAvatar agent={full} size="sm" /> : <Bot size={12} />}
                        <span className="min-w-0 flex-1 truncate">{a.name}</span>
                        {on && <Check size={12} className="shrink-0 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={!projectFormName.trim()}
                onClick={saveProjectModal}
                className="flex-1 rounded-full bg-brand-500 px-3 py-2.5 text-sm font-bold text-white hover:bg-brand-400 transition-all disabled:opacity-50"
              >
                {projectModal.mode === "create" ? dict.chat.projectCreate : dict.chat.projectSave}
              </button>
              <button
                type="button"
                onClick={() => setProjectModal(null)}
                className="rounded-full px-3 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-all"
              >
                {dict.chat.close}
              </button>
            </div>
            {projectModal.mode === "edit" && (
              <button
                type="button"
                onClick={() => {
                  if (!projectDeleteArmed) {
                    setProjectDeleteArmed(true);
                    return;
                  }
                  deleteProject(projectModal.id);
                }}
                className={`mt-2 w-full rounded-full px-3 py-2 text-xs font-bold transition-all ${projectDeleteArmed ? "bg-red-500 text-white hover:bg-red-400" : "text-red-400 hover:bg-red-500/15"}`}
              >
                {projectDeleteArmed ? dict.chat.projectConfirmDelete : dict.chat.projectDelete}
              </button>
            )}
          </div>
        </div>
      )}
      {paywallSlug && (
        <SubscribePaywallModal
          open={!!paywallSlug}
          onClose={() => setPaywallSlug(null)}
          agentName={
            agentsBySlug.get(paywallSlug)?.name ??
            paywallSlug
          }
          agentSlug={paywallSlug}
        />
      )}
    </div>
  );
}
