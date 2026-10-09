"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownUp,
  Check,
  ChevronLeft,
  Copy,
  Loader2,
  Download,
  MoreHorizontal,
  X,
  WrapText,
} from "lucide-react";
import MarkdownText from "./MarkdownText";
import { useLanguage } from "./LanguageProvider";
import { INTEGRATIONS } from "@/lib/integrations";
import { copyToClipboard, downloadTextFile } from "@/lib/chat-files-client";
import {
  compareCells,
  countLines,
  currentVersion,
  exportFileName,
  hardenHtmlDocument,
  htmlToPlainText,
  parseCsv,
  sanitizeSvg,
  toPlainText,
  type ChatFileRecord,
  type ChatFileType,
} from "@/lib/chat-files";
import { highlightCode, loadHighlighter, type Highlighter } from "@/lib/code-highlight";

/**
 * Pannello di anteprima del file generato.
 *
 * Desktop: colonna a destra ridimensionabile (min 360px, max 70% viewport),
 * larghezza ricordata. Mobile/tablet: pannello a tutta schermata con "Indietro".
 * Il contenuto scorre solo dentro il pannello, mai la pagina.
 */

const WIDTH_KEY = "agentcloud_preview_width";
const WIDTH_EVENT = "agentcloud:preview-width";
const MIN_WIDTH = 360;

const PREVIEW_TABS: Record<ChatFileType, { preview: boolean }> = {
  markdown: { preview: true },
  html: { preview: true },
  code: { preview: false },
  csv: { preview: true },
  svg: { preview: true },
  text: { preview: false },
};

function readStoredWidth(fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(WIDTH_KEY);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value >= MIN_WIDTH ? value : fallback;
}

/* ── Renderer ─────────────────────────────────────────────────────────── */

/** Codice con highlight, numeri di riga, copia e a capo opzionale. */
function CodeView({ language, content, wrap }: { language?: string; content: string; wrap: boolean }) {
  const { dict } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [hljs, setHljs] = useState<Highlighter | null>(null);
  useEffect(() => {
    let alive = true;
    void loadHighlighter().then((h) => {
      if (alive && h) setHljs(h);
    });
    return () => {
      alive = false;
    };
  }, []);

  const html = useMemo(
    () => (hljs ? highlightCode(hljs, language ?? "", content) : null),
    [hljs, language, content],
  );
  const lines = useMemo(() => content.replace(/\n$/, "").split("\n"), [content]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={() =>
            void copyToClipboard(content).then((ok) => {
              if (!ok) return;
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
          }
          aria-label={dict.chat.files.copy}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? dict.chat.files.copied : dict.chat.files.copy}
        </button>
      </div>
      <div className="flex max-h-full overflow-auto">
        <div
          aria-hidden="true"
          className="shrink-0 select-none border-r border-white/5 py-3 pr-2.5 pl-3 text-right font-mono text-xs leading-relaxed text-neutral-600 tabular-nums"
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre
          className={`min-w-0 flex-1 py-3 pr-3 text-xs leading-relaxed text-brand-100 ${
            wrap ? "whitespace-pre-wrap break-words" : "overflow-x-auto"
          }`}
        >
          {html !== null ? (
            <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <code>{content}</code>
          )}
        </pre>
      </div>
    </div>
  );
}

/** Tabella CSV ordinabile con intestazione sticky e scroll interno. */
function CsvView({ content }: { content: string }) {
  const { dict } = useLanguage();
  const table = useMemo(() => parseCsv(content), [content]);
  const [sort, setSort] = useState<{ col: number; asc: boolean } | null>(null);

  const rows = useMemo(() => {
    if (!sort) return table.rows;
    const sorted = [...table.rows];
    sorted.sort((a, b) => {
      const res = compareCells(a[sort.col] ?? "", b[sort.col] ?? "");
      return sort.asc ? res : -res;
    });
    return sorted;
  }, [table.rows, sort]);

  if (table.headers.length === 0) {
    return <p className="p-4 text-sm text-neutral-500">{dict.chat.files.empty}</p>;
  }

  return (
    <div className="max-h-full overflow-auto rounded-xl border border-white/10">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-neutral-900">
          <tr>
            {table.headers.map((header, i) => (
              <th
                key={`${header}-${i}`}
                scope="col"
                aria-sort={sort?.col === i ? (sort.asc ? "ascending" : "descending") : "none"}
              >
                <button
                  type="button"
                  onClick={() => setSort((s) => (s?.col === i ? { col: i, asc: !s.asc } : { col: i, asc: true }))}
                  className="flex w-full items-center gap-1 border-b border-white/10 px-3 py-2 font-bold text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <span className="truncate">{header}</span>
                  <ArrowDownUp size={10} className={sort?.col === i ? "text-brand-300" : "text-neutral-600"} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
              {row.map((cell, c) => (
                <td key={c} className="px-3 py-1.5 align-top text-neutral-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Markdown → anteprima formattata; il parser di progetto non esegue HTML. */
function MarkdownView({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed text-neutral-200">
      <MarkdownText text={content} />
    </div>
  );
}

/** HTML → iframe sandbox con origine opaca e CSP restrittiva. */
function HtmlView({ content }: { content: string }) {
  const doc = useMemo(() => hardenHtmlDocument(content), [content]);
  return (
    <iframe
      title="Anteprima HTML"
      srcDoc={doc}
      // sandbox senza allow-same-origin: origine opaca, nessun accesso a
      // cookie, storage o sessione di AgentCloud. allow-scripts serve per gli
      // JS inline della pagina, che restano comunque confinati.
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      className="h-full min-h-[60vh] w-full rounded-xl border border-white/10 bg-white"
    />
  );
}

/** SVG → markup sanitizzato in allowlist, senza script né handler. */
function SvgView({ content }: { content: string }) {
  const safe = useMemo(() => sanitizeSvg(content), [content]);
  if (!safe.trim()) {
    return <p className="p-4 text-sm text-neutral-500">—</p>;
  }
  return (
    <div
      className="overflow-auto rounded-xl border border-white/10 bg-white/95 p-4"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function TextView({ content }: { content: string }) {
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-neutral-200">
      {content}
    </pre>
  );
}

/* ── Pannello ─────────────────────────────────────────────────────────── */

export interface PreviewPanelProps {
  record: ChatFileRecord | null;
  /** true mentre il contenuto arriva dallo streaming: auto-scroll + indicatore. */
  streaming?: boolean;
  onClose: () => void;
  onRetry?: (record: ChatFileRecord) => void;
  /** Callback per "Salva su Drive / Notion" quando l'integrazione è collegata. */
  onSaveToIntegration?: (provider: "google-drive" | "notion", record: ChatFileRecord, content: string) => void;
}

export default function PreviewPanel({
  record,
  streaming = false,
  onClose,
  onRetry,
  onSaveToIntegration,
}: PreviewPanelProps) {
  const { dict } = useLanguage();
  const labels = dict.chat.files;
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Un file nuovo riparte dalla versione più recente e dalla tab Anteprima:
  // lo fa il `key={slug}` con cui il padre monta il pannello, non un effect.
  // La larghezza ricordata vive in localStorage letta come snapshot esterno:
  // così niente setState dentro un effect.
  const storedWidth = useSyncExternalStore(
    useCallback((onChange: () => void) => {
      window.addEventListener(WIDTH_EVENT, onChange);
      return () => window.removeEventListener(WIDTH_EVENT, onChange);
    }, []),
    () => readStoredWidth(560),
    () => 560,
  );
  const [width, setWidth] = useState<number | null>(null);
  const effectiveWidth = width ?? storedWidth;

  const content = useMemo(
    () => (record ? currentVersion(record, selectedVersion).content : ""),
    [record, selectedVersion],
  );
  const version = record ? currentVersion(record, selectedVersion).version : 1;

  // Auto-scroll solo mentre il file è in creazione.
  useEffect(() => {
    if (!streaming) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [content, streaming]);

  useEffect(() => {
    if (!record) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [record, onClose]);

  const startResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = document.getElementById("agentcloud-preview-panel")?.clientWidth ?? 560;
    const move = (e: PointerEvent) => {
      const max = Math.round(window.innerWidth * 0.7);
      const next = Math.min(max, Math.max(MIN_WIDTH, startWidth - (e.clientX - startX)));
      setWidth(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const el = document.getElementById("agentcloud-preview-panel");
      if (el) {
        window.localStorage.setItem(WIDTH_KEY, String(el.clientWidth));
        window.dispatchEvent(new Event(WIDTH_EVENT));
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [setWidth]);

  const copy = useCallback(async () => {
    const ok = await copyToClipboard(content);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  // "Salva su Drive / Notion" compare solo se l'integrazione è collegata:
  // le integrazioni "in arrivo" (available: false) non sono proprio nel elenco.
  const [connected, setConnected] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!menuOpen || Object.keys(connected).length > 0) return;
    let alive = true;
    void fetch("/api/integrations/status")
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((data: { providers?: { provider: string; status: string }[] }) => {
        if (!alive) return;
        const map: Record<string, string> = {};
        for (const p of data.providers ?? []) {
          if (p.status === "connected") map[p.provider] = p.provider;
        }
        setConnected(map);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [menuOpen, connected]);

  const saveTargets = useMemo(
    () =>
      INTEGRATIONS.filter(
        (i) =>
          i.available &&
          onSaveToIntegration &&
          (/drive/i.test(i.name) ? connected.google_drive : /notion/i.test(i.name) ? connected.notion : false),
      ),
    [connected, onSaveToIntegration],
  );

  if (!record) return null;

  const showTabs = PREVIEW_TABS[record.type]?.preview ?? false;
  const typeLabel: Record<ChatFileType, string> = {
    markdown: "MD",
    html: "HTML",
    code: record.language?.toUpperCase() ?? "CODE",
    csv: "CSV",
    svg: "SVG",
    text: "TXT",
  };

  const renderBody = (): ReactNode => {
    if (!content.trim()) {
      return <p className="p-4 text-sm text-neutral-500">{labels.empty}</p>;
    }
    if (tab === "code") {
      if (record.type === "markdown") return <CodeView language="markdown" content={content} wrap={wrap} />;
      if (record.type === "html") return <CodeView language="xml" content={content} wrap={wrap} />;
      if (record.type === "csv") return <CodeView language="plaintext" content={content} wrap={wrap} />;
      return <CodeView language={record.language} content={content} wrap={wrap} />;
    }
    switch (record.type) {
      case "markdown":
        return <MarkdownView content={content} />;
      case "html":
        return <HtmlView content={content} />;
      case "csv":
        return <CsvView content={content} />;
      case "svg":
        return <SvgView content={content} />;
      case "text":
        return <TextView content={content} />;
      default:
        return <CodeView language={record.language} content={content} wrap={wrap} />;
    }
  };

  const downloadAs = (format: "md" | "html" | "txt") => {
    const name = exportFileName(record, format);
    const payload =
      format === "txt" ? toPlainText(record, content) : content;
    downloadTextFile(name, payload, format);
    setMenuOpen(false);
  };

  return (
    <motion.aside
      id="agentcloud-preview-panel"
      role="dialog"
      aria-modal="false"
      aria-label={`${labels.preview}: ${record.title || record.name}`}
      initial={reduceMotion ? { opacity: 0 } : { x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { x: 40, opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
      style={{ width: `${effectiveWidth}px` }}
      className="relative flex h-full w-full shrink-0 flex-col border-l border-white/10 bg-neutral-950 max-lg:w-full max-lg:border-l-0"
    >
      {/* Maniglia di ridimensionamento (solo desktop). */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={labels.resize}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setWidth((w) => Math.min(Math.round(window.innerWidth * 0.7), (w ?? effectiveWidth) + 32));
          if (e.key === "ArrowRight") setWidth((w) => Math.max(MIN_WIDTH, (w ?? effectiveWidth) - 32));
        }}
        className="absolute -left-1 top-0 hidden h-full w-2 cursor-col-resize hover:bg-brand-500/10 lg:block"
      />

      <header className="flex shrink-0 flex-col gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-start gap-2">
          {/* Su mobile il pannello è a schermo intero: torna indietro. */}
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.back}
            className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-white">
              {record.title || record.name}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-neutral-500">
              <span className="truncate">{record.name}</span>
              <span aria-hidden="true">·</span>
              <span>{countLines(content)} {labels.lines}</span>
              <span aria-hidden="true">·</span>
              <span className="rounded bg-white/5 px-1 py-0.5 font-mono text-[10px]">{typeLabel[record.type]}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {record.versions.length > 1 && (
              <label className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-neutral-300">
                <span className="sr-only">{labels.updated}</span>
                <select
                  value={version}
                  onChange={(e) => setSelectedVersion(Number(e.target.value))}
                  className="bg-transparent font-bold outline-none"
                  aria-label={`${labels.updated} — v${version}`}
                >
                  {record.versions.map((v) => (
                    <option key={v.version} value={v.version} className="bg-neutral-900">
                      v{v.version}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={() => void copy()}
              aria-label={labels.copy}
              title={labels.copy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            <button
              type="button"
              onClick={() => downloadTextFile(record.name, content, record.type)}
              aria-label={`${labels.download}: ${record.name}`}
              title={labels.download}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download size={14} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={labels.downloadAs}
                aria-expanded={menuOpen}
                title={labels.downloadAs}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label={labels.close}
                    tabIndex={-1}
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 py-1 shadow-2xl shadow-black/60">
                    {(["md", "html", "txt"] as const).map((format) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => downloadAs(format)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-200 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <Download size={12} className="text-neutral-500" />
                        {exportFileName(record, format)}
                      </button>
                    ))}
                    {saveTargets.map((integ) => {
                      const provider = /drive/i.test(integ.name) ? "google-drive" : "notion";
                      return (
                        <button
                          key={integ.name}
                          type="button"
                          onClick={() => {
                            onSaveToIntegration?.(
                              provider,
                              record,
                              record.type === "html" ? htmlToPlainText(content) : content,
                            );
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-200 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <Check size={12} className="text-neutral-500" />
                          {provider === "google-drive" ? labels.saveDrive : labels.saveNotion}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={labels.close}
              title={labels.close}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {(showTabs || record.type === "code") && (
          <div className="flex items-center gap-2">
            {showTabs && (
              <div className="flex rounded-full border border-white/10 bg-white/5 p-0.5">
                <button
                  type="button"
                  onClick={() => setTab("preview")}
                  aria-pressed={tab === "preview"}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                    tab === "preview" ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {labels.preview}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("code")}
                  aria-pressed={tab === "code"}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                    tab === "code" ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {labels.code}
                </button>
              </div>
            )}
            {record.type === "code" && (
              <button
                type="button"
                onClick={() => setWrap((v) => !v)}
                aria-pressed={wrap}
                aria-label="A capo automatico"
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                  wrap
                    ? "border-brand-500/40 bg-brand-500/10 text-brand-200"
                    : "border-white/10 bg-white/5 text-neutral-400 hover:text-white"
                }`}
              >
                <WrapText size={11} />
                Wrap
              </button>
            )}
            {streaming && (
              <span className="inline-flex items-center gap-1 text-[11px] text-brand-300">
                <Loader2 size={11} className="animate-spin" />
                {labels.writing}
              </span>
            )}
            {!streaming && record.versions.length > 1 && (
              <button
                type="button"
                onClick={() => setSelectedVersion(record.currentVersion)}
                className="text-[11px] text-purple-300 hover:text-purple-200"
              >
                {labels.updated} · v{record.currentVersion}
              </button>
            )}
            {!streaming && onRetry && record.versions.length === 0 && (
              <button type="button" onClick={() => onRetry(record)} className="text-[11px] text-amber-300 hover:text-amber-200">
                {labels.retry}
              </button>
            )}
          </div>
        )}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-4">
        {renderBody()}
      </div>

      {/* Stato vuoto quando il file non ha ancora contenuto. */}
      {!streaming && !content.trim() && (
        <AnimatePresence>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
            <p className="rounded-full border border-white/10 bg-neutral-900/90 px-3 py-1.5 text-[11px] text-neutral-400">
              {labels.empty}
            </p>
          </div>
        </AnimatePresence>
      )}
    </motion.aside>
  );
}