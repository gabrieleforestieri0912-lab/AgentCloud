"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronLeft,
  Copy,
  Download,
  FileText,
  MoreHorizontal,
  X,
  WrapText,
} from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { copyToClipboard, downloadTextFile } from "@/lib/chat-files-client";
import {
  byteLength,
  compareCells,
  countLines,
  currentVersion,
  exportFileName,
  formatBytes,
  hardenHtmlDocument,
  parseCsv,
  sanitizeSvg,
  toPlainText,
  type ChatFileRecord,
} from "@/lib/chat-files";
import { highlightCode, loadHighlighter, type Highlighter } from "@/lib/code-highlight";
import MarkdownText from "./MarkdownText";

/**
 * "File generati" in dashboard: elenco dei file prodotti in chat, filtrabile
 * per agente e per data, con anteprima e download. Non dipende dalla
 * cronologia localStorage: legge da /api/chat/files.
 */

type Range = "7" | "30" | "all";

interface Row extends ChatFileRecord {
  agentSlug?: string;
}

function withinRange(iso: string, range: Range): boolean {
  if (range === "all") return true;
  const then = Date.now() - Number(range) * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= then;
}

function CodeBlockView({ language, content, wrap }: { language?: string; content: string; wrap: boolean }) {
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
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-neutral-300 hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="flex overflow-auto">
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

function CsvBlock({ content }: { content: string }) {
  const table = useMemo(() => parseCsv(content), [content]);
  const [sort, setSort] = useState<{ col: number; asc: boolean } | null>(null);
  const rows = useMemo(() => {
    if (!sort) return table.rows;
    const copy = [...table.rows];
    copy.sort((a, b) => {
      const res = compareCells(a[sort.col] ?? "", b[sort.col] ?? "");
      return sort.asc ? res : -res;
    });
    return copy;
  }, [table.rows, sort]);
  if (!table.headers.length) return <p className="p-4 text-sm text-neutral-500">—</p>;
  return (
    <div className="max-h-full overflow-auto rounded-xl border border-white/10">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-neutral-900">
          <tr>
            {table.headers.map((h, i) => (
              <th
                key={`${h}-${i}`}
                scope="col"
                aria-sort={sort?.col === i ? (sort.asc ? "ascending" : "descending") : "none"}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSort((s) => (s?.col === i ? { col: i, asc: !s.asc } : { col: i, asc: true }))
                  }
                  className="flex w-full items-center gap-1 border-b border-white/10 px-3 py-2 font-bold text-neutral-300 hover:bg-white/5 hover:text-white"
                >
                  <span className="truncate">{h}</span>
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

/** Dettaglio + anteprima del file. Montato con key={slug}: stato nuovo a ogni file. */
function FileDetail({ row, onClose }: { row: Row; onClose: () => void }) {
  const { dict } = useLanguage();
  const labels = dict.chat.files;
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [wrap, setWrap] = useState(false);
  const content = currentVersion(row).content;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const codeLanguage =
    row.type === "markdown" ? "markdown" : row.type === "html" ? "xml" : row.language;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-neutral-950">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.back}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 hover:text-white"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
          {row.title || row.name}
        </span>
        <div className="flex rounded-full border border-white/10 bg-white/5 p-0.5">
          <button
            type="button"
            onClick={() => setTab("preview")}
            aria-pressed={tab === "preview"}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              tab === "preview" ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"
            }`}
          >
            {labels.preview}
          </button>
          <button
            type="button"
            onClick={() => setTab("code")}
            aria-pressed={tab === "code"}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              tab === "code" ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"
            }`}
          >
            {labels.code}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void copyToClipboard(content)}
          aria-label={labels.copy}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          onClick={() => downloadTextFile(row.name, content, row.type)}
          aria-label={labels.download}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
        >
          <Download size={14} />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={labels.downloadAs}
            aria-expanded={menuOpen}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                tabIndex={-1}
                aria-label={labels.close}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-white/10 bg-neutral-900 py-1 shadow-2xl">
                {(["md", "html", "txt"] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => {
                      downloadTextFile(
                        exportFileName(row, format),
                        format === "txt" ? toPlainText(row, content) : content,
                        format,
                      );
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-200 hover:bg-white/5"
                  >
                    <Download size={12} className="text-neutral-500" />
                    {exportFileName(row, format)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      <div className="max-h-[420px] overflow-auto p-3">
        {!content.trim() ? (
          <p className="p-4 text-sm text-neutral-500">{labels.empty}</p>
        ) : tab === "code" ? (
          <CodeBlockView language={codeLanguage} content={content} wrap={wrap} />
        ) : row.type === "markdown" ? (
          <div className="text-sm leading-relaxed text-neutral-200">
            <MarkdownText text={content} />
          </div>
        ) : row.type === "html" ? (
          <iframe
            title="Anteprima HTML"
            srcDoc={hardenHtmlDocument(content)}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            className="h-[420px] w-full rounded-xl border border-white/10 bg-white"
          />
        ) : row.type === "csv" ? (
          <CsvBlock content={content} />
        ) : row.type === "svg" ? (
          <div
            className="overflow-auto rounded-xl border border-white/10 bg-white/95 p-4"
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(content) }}
          />
        ) : row.type === "text" ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-neutral-200">
            {content}
          </pre>
        ) : (
          <CodeBlockView language={row.language} content={content} wrap={wrap} />
        )}
      </div>

      {row.type === "code" && (
        <div className="border-t border-white/10 px-3 py-2">
          <button
            type="button"
            onClick={() => setWrap((v) => !v)}
            aria-pressed={wrap}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
              wrap
                ? "border-brand-500/40 bg-brand-500/10 text-brand-200"
                : "border-white/10 bg-white/5 text-neutral-400 hover:text-white"
            }`}
          >
            <WrapText size={11} />
            Wrap
          </button>
        </div>
      )}
    </div>
  );
}

export interface GeneratedFilesPanelProps {
  /** Slug dell'agente: mostra solo i file di quell'agente. */
  agentSlug?: string;
  className?: string;
}

export default function GeneratedFilesPanel({ agentSlug, className = "" }: GeneratedFilesPanelProps) {
  const { dict } = useLanguage();
  const labels = dict.chat.files;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [range, setRange] = useState<Range>("30");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const query = agentSlug ? `?agent=${encodeURIComponent(agentSlug)}` : "";
      const res = await fetch(`/api/chat/files${query}`);
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as { files?: Row[] };
      setRows(data.files ?? []);
    } catch {
      setRows([]);
    }
  }, [agentSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => (rows ?? []).filter((r) => withinRange(r.created_at, range)), [rows, range]);
  const selected = useMemo(() => visible.find((r) => r.slug === open) ?? null, [visible, open]);

  return (
    <div className={`rounded-lg border border-white/5 bg-neutral-900 p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <FileText size={18} className="text-brand-300" />
          {labels.conversationFiles}
        </h2>
        <div className="flex rounded-full border border-white/10 bg-white/5 p-0.5 text-[11px] font-bold">
          {(["7", "30", "all"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`rounded-full px-2.5 py-1 transition-colors ${
                range === r ? "bg-white text-neutral-900" : "text-neutral-400 hover:text-white"
              }`}
            >
              {r === "all" ? "—" : `${r}g`}
            </button>
          ))}
        </div>
      </div>

      {rows === null ? (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-neutral-400">{labels.noFiles}</p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((row) => (
            <li
              key={row.slug}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <FileText size={14} className="shrink-0 text-neutral-500" />
              <button
                type="button"
                onClick={() => setOpen(row.slug === open ? null : row.slug)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-semibold text-white">
                  {row.title || row.name}
                </span>
                <span className="block truncate text-[11px] text-neutral-500">
                  {row.name} · {countLines(currentVersion(row).content)} {labels.lines} ·{" "}
                  {formatBytes(byteLength(currentVersion(row).content))}
                  {row.agentSlug ? ` · ${row.agentSlug}` : ""}
                </span>
              </button>
              {row.currentVersion > 1 && (
                <span className="shrink-0 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                  v{row.currentVersion}
                </span>
              )}
              <button
                type="button"
                onClick={() => downloadTextFile(row.name, currentVersion(row).content, row.type)}
                aria-label={`${labels.download}: ${row.name}`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
              >
                <Download size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && <FileDetail key={selected.slug} row={selected} onClose={() => setOpen(null)} />}
    </div>
  );
}