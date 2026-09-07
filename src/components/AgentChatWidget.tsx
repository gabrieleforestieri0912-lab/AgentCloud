"use client";

/**
 * Componente AgentChatWidget per Next.js e React.
 *
 * Questo componente fornisce una finestra di chat interattiva ed elegante
 * che le Piccole e Medie Imprese (PMI) possono includere nelle proprie applicazioni
 * Next.js.
 *
 * Funzionalità principali:
 * - Supporto multi-tenant completo con isolamento dei dati (`tenantId`).
 * - Streaming in tempo reale delle risposte dell'agente IA tramite Server-Sent Events (SSE).
 * - Sanitizzazione integrata dei contenuti per prevenire attacchi XSS.
 * - Branding personalizzabile (colori, titoli, sottotitoli, avatar).
 * - Accessibilità (chiusura con tasto ESC, attributi ARIA, focus management).
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Bot, RotateCcw } from "lucide-react";
import { sanitizeHtml } from "@/lib/security";
import {
  AttachPlusButton,
  AttachmentChips,
  DropHint,
  type Labels,
  useChatAttachments,
} from "@/components/ChatAttachments";
import { composeUserContent } from "@/lib/chat-attachments";
import type { ChatAttachment } from "@/lib/chat-attachments";

/**
 * Proprietà di configurazione accettate dal componente AgentChatWidget.
 */
export type AgentChatWidgetProps = {
  /** Identificativo univoco dell'agente (es. "quote-agent", "reviews-agent") */
  slug: string;
  /** Identificativo del tenant per l'isolamento multi-tenant (default: "default") */
  tenantId?: string;
  /** Titolo personalizzato visualizzato nell'intestazione */
  title?: string;
  /** Sottotitolo o descrizione dello stato (es. "Risponde in tempo reale") */
  subtitle?: string;
  /** Messaggio iniziale di benvenuto mostrato all'apertura della chat */
  initialMessage?: string;
  /** Testo segnaposto all'interno della casella di digitazione */
  placeholder?: string;
  /** Posizione sullo schermo del pulsante fluttuante */
  position?: "bottom-right" | "bottom-left";
  /** Colore primario del tema in formato esadecimale (default: "#038bfe") */
  primaryColor?: string;
  /** Se true, la chat si apre automaticamente al caricamento iniziale */
  defaultOpen?: boolean;
};

/**
 * Modello interno per i messaggi scambiati nella chat.
 */
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  // Allegati inviati dall'utente con questo messaggio (anteprime / chip).
  attachments?: Pick<ChatAttachment, "id" | "name" | "kind" | "previewUrl">[];
};

// Etichette di default per allegati e drag & drop (il widget non usa i
// dizionari i18n dell'app: il resto delle stringhe è già in italiano).
const WIDGET_ATTACH_LABELS: Labels = {
  attachAria: "Allega file o immagini",
  dropHint: "Rilascia qui per allegare file o immagini",
  removeAttachment: "Rimuovi {name}",
  fileTooLarge: (name) => `«${name}» è troppo grande (max 8 MB)`,
  tooManyFiles: "Puoi allegare al massimo 6 file",
  unsupportedFile: (name) => `Impossibile leggere «${name}»`,
};

export function AgentChatWidget({
  slug,
  tenantId = "default",
  title,
  subtitle,
  initialMessage,
  placeholder,
  position = "bottom-right",
  primaryColor = "#038bfe",
  defaultOpen = false,
}: AgentChatWidgetProps) {
  // Stato di apertura/chiusura del modale della chat
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Messaggio iniziale di benvenuto
  const welcomeText = initialMessage || "Ciao! Come posso aiutarti oggi?";

  // Lista cronologica dei messaggi
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-init",
      role: "assistant",
      content: welcomeText,
    },
  ]);

  // Testo dell'input corrente
  const [input, setInput] = useState("");
  // Flag che indica se una risposta è attualmente in streaming dall'agente
  const [isStreaming, setIsStreaming] = useState(false);

  // Gestione allegati (file/immagini) condivisa: + button, drag & drop, paste.
  const attach = useChatAttachments();

  // Riferimento per lo scroll automatico all'ultimo messaggio
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Effettua lo scroll verso il basso per visualizzare l'ultimo messaggio ricevuto.
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Aggiorna lo scroll all'arrivo di nuovi messaggi o all'apertura del modale
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Porta il focus sul campo input all'apertura
      inputRef.current?.focus();
    }
  }, [messages, isOpen, scrollToBottom]);

  /**
   * Gestione accessibilità: chiusura del modale premendo il tasto Escape.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  /**
   * Ripristina la conversazione allo stato iniziale.
   */
  const handleReset = () => {
    attach.clear();
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: welcomeText,
      },
    ]);
  };

  /**
   * Invia un messaggio all'agente ed elabora lo streaming della risposta.
   */
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawText = input.trim();
    const pending = attach.attachments;
    if ((!rawText && pending.length === 0) || isStreaming) return;

    // Sanitizza l'input dell'utente prima di memorizzarlo e inviarlo
    const text = sanitizeHtml(rawText);

    // Il corpo completo (contenuto dei file inclusi) va all'API così l'agente
    // può leggere gli allegati; la bolla visibile mostra solo il testo più i
    // chip compatti.
    const apiContent = composeUserContent(text || "", pending) || text;
    const displayContent =
      text || pending.map((a) => a.name).join(", ");

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        role: "user",
        content: displayContent,
        attachments: pending.map((a) => ({
          id: a.id,
          name: a.name,
          kind: a.kind,
          previewUrl: a.previewUrl,
        })),
      },
    ];

    setMessages(newMessages);
    setInput("");
    attach.clear();
    setIsStreaming(true);

    try {
      // Invia la cronologia della conversazione all'API di chat. La cronologia
      // conserva il testo visibile; solo l'ultimo messaggio trasporta il corpo
      // completo con gli allegati.
      const apiMessages = [
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content: apiContent },
      ];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: slug,
          tenantId,
          messages: apiMessages,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      // Prepara un messaggio vuoto per accogliere lo streaming progressivo
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: "" },
      ]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text" && typeof data.content === "string") {
                  assistantText += data.content;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: assistantText }
                        : msg,
                    ),
                  );
                }
              } catch {
                // Ignora chunk malformati
              }
            }
          }
        }
      }
    } catch {
      // Messaggio di errore user-friendly in caso di fallimento della connessione
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Spiacente, si è verificato un errore di connessione. Riprova tra poco.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  // Posizionamento del widget a schermo (destra o sinistra)
  const posClasses =
    position === "bottom-left" ? "left-6 bottom-6" : "right-6 bottom-6";

  // Titolo di fallback derivato dallo slug se non specificato
  const displayTitle =
    title ||
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const displaySubtitle = subtitle || "Online";

  return (
    <div
      className={`fixed ${posClasses} z-50 flex flex-col font-sans`}
      style={{ isolation: "isolate" }}
    >
      {/* Finestra modale fluttuante della Chat */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={displayTitle}
          className="mb-4 flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl transition-all"
          onDragEnter={attach.onDragEnter}
          onDragOver={attach.onDragOver}
          onDragLeave={attach.onDragLeave}
          onDrop={attach.makeDrop(WIDGET_ATTACH_LABELS)}
          style={{
            width: "380px",
            height: "520px",
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "calc(100vh - 100px)",
          }}
        >
          {/* Intestazione (Header) */}
          <div
            className="flex items-center justify-between border-b border-neutral-800 px-4 py-3"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}15, #000000 85%)`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-tight">
                  {displayTitle}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] text-neutral-400">{displaySubtitle}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="Ricomincia chat"
                aria-label="Ricomincia chat"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Chiudi chat"
                aria-label="Chiudi chat"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Area scorrimento messaggi */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "text-white shadow-sm"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-200 shadow-sm"
                  }`}
                  style={
                    m.role === "user"
                      ? { backgroundColor: primaryColor }
                      : undefined
                  }
                >
                  {m.content}
                  {m.attachments && m.attachments.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {m.attachments.map((f) =>
                        f.kind === "image" && f.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={f.id}
                            src={f.previewUrl}
                            alt={f.name}
                            className="max-h-24 max-w-[120px] rounded-lg object-cover"
                          />
                        ) : (
                          <span
                            key={f.id}
                            className="inline-flex items-center rounded-lg bg-white/15 px-2 py-0.5 text-[11px]"
                          >
                            {f.name}
                          </span>
                        ),
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {/* Animazione dei puntini durante lo streaming della risposta */}
            {isStreaming && (
              <div className="flex items-center gap-1.5 text-neutral-500 text-xs pl-2 py-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" />
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Barra di inserimento messaggio (Input Bar) */}
          <form
            onSubmit={handleSend}
            className="relative border-t border-neutral-800 p-3 bg-neutral-900/60"
          >
            <DropHint
              visible={attach.dragOver}
              text={WIDGET_ATTACH_LABELS.dropHint}
            />
            <AttachmentChips
              items={attach.attachments}
              onRemove={attach.remove}
              removeLabel={(name) =>
                WIDGET_ATTACH_LABELS.removeAttachment.replace("{name}", name)
              }
            />
            {attach.notice && (
              <p className="mb-1 text-[11px] text-amber-400">{attach.notice}</p>
            )}
            <div className="flex items-center gap-2">
              <AttachPlusButton
                labels={WIDGET_ATTACH_LABELS}
                disabled={isStreaming}
                onPick={(files) => {
                  void attach.addFiles(files, WIDGET_ATTACH_LABELS);
                }}
              />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder || "Scrivi un messaggio..."}
                disabled={isStreaming}
                aria-label="Messaggio da inviare all'assistente"
                className="flex-1 rounded-xl bg-neutral-800/80 border border-neutral-700/60 px-3.5 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={
                  (!input.trim() && attach.attachments.length === 0) ||
                  isStreaming
                }
                aria-label="Invia messaggio"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-30 shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Badge footer */}
          <div className="py-1 px-3 bg-neutral-950 border-t border-neutral-900 text-center text-[10px] text-neutral-500">
            Powered by{" "}
            <span className="font-semibold text-neutral-400">AgentCloud</span>
          </div>
        </div>
      )}

      {/* Pulsante Fluttuante di Apertura/Chiusura (FAB Trigger) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Chiudi chat" : "Apri chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, #d4538a)`,
          boxShadow: `0 8px 24px ${primaryColor}40`,
        }}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}

export default AgentChatWidget;
