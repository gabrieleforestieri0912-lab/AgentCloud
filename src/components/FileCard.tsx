"use client";

import { memo, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { downloadTextFile } from "@/lib/chat-files-client";
import {
  MAX_FILE_BYTES,
  byteLength,
  countLines,
  formatBytes,
  type ChatFileRecord,
  type ChatFileType,
} from "@/lib/chat-files";

/**
 * Card file in fondo al messaggio.
 *
 * Click sulla card (fuori da "Scarica") apre il pannello di anteprima; il
 * bottone scarica direttamente il file senza aprire nulla. La card è
 * focusabile e si apre con Invio/Spazio.
 */

const ICONS: Record<ChatFileType, typeof FileText> = {
  markdown: FileText,
  html: Globe,
  code: FileCode2,
  csv: FileSpreadsheet,
  svg: ImageIcon,
  text: FileText,
};

const TYPE_LABEL: Record<ChatFileType, string> = {
  markdown: "Markdown",
  html: "HTML",
  code: "Codice",
  csv: "CSV",
  svg: "SVG",
  text: "Testo",
};

export interface FileCardProps {
  record: ChatFileRecord;
  /** true mentre il modello sta ancora scrivendo il contenuto. */
  streaming?: boolean;
  onOpen?: (slug: string) => void;
  /** Riprova: chiede al modello di rigenerare il file interrotto. */
  onRetry?: (record: ChatFileRecord) => void;
  disabled?: boolean;
}

function FileCard({ record, streaming = false, onOpen, onRetry, disabled }: FileCardProps) {
  const { dict } = useLanguage();
  const labels = dict.chat.files;
  const [downloaded, setDownloaded] = useState(false);

  const content = record.versions[record.versions.length - 1]?.content ?? "";
  const lines = useMemo(() => countLines(content), [content]);
  const tooLarge = byteLength(content) > MAX_FILE_BYTES;
  const Icon = ICONS[record.type] ?? FileText;
  const incomplete = tooLarge || record.versions.length === 0;

  const handleDownload = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (tooLarge) return;
    downloadTextFile(record.name, content, record.type);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="mt-3 max-w-[480px]">
      <div
        role={onOpen && !incomplete ? "button" : undefined}
        tabIndex={onOpen && !incomplete ? 0 : undefined}
        aria-label={`${labels.open}: ${record.title || record.name}`}
        aria-disabled={incomplete || undefined}
        onClick={() => {
          if (onOpen && !incomplete) onOpen(record.slug);
        }}
        onKeyDown={(e) => {
          if (!onOpen || incomplete) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(record.slug);
          }
        }}
        className={`group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-neutral-900/70 p-3 text-left transition-colors ${
          incomplete ? "border-amber-500/30" : "hover:border-white/20 hover:bg-neutral-800/70"
        } ${onOpen && !incomplete ? "cursor-pointer" : ""} ${
          disabled ? "pointer-events-none opacity-60" : ""
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 ${
            incomplete ? "bg-amber-500/10 text-amber-400" : "bg-brand-500/10 text-brand-300"
          }`}
        >
          <Icon size={16} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-white">
              {record.title || record.name}
            </span>
            {record.currentVersion > 1 && (
              <span className="shrink-0 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                v{record.currentVersion}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-neutral-500">
            <span className="truncate">{record.name}</span>
            {lines > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {lines} {labels.lines}
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{TYPE_LABEL[record.type] ?? record.type}</span>
            {content && (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatBytes(byteLength(content))}</span>
              </>
            )}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[11px]">
            {streaming ? (
              <span className="inline-flex items-center gap-1 text-brand-300">
                <Loader2 size={10} className="animate-spin" />
                {labels.creating}
              </span>
            ) : tooLarge ? (
              <span className="inline-flex items-center gap-1 text-amber-400">
                <AlertTriangle size={10} />
                {labels.tooLarge}
              </span>
            ) : record.updated ? (
              <span className="inline-flex items-center gap-1 text-purple-300">
                <Check size={10} />
                {labels.updated} · v{record.currentVersion}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Check size={10} />
                {labels.ready}
              </span>
            )}
          </span>
        </span>

        {tooLarge ? (
          onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(record);
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-neutral-200 transition-colors hover:bg-white/10"
            >
              <RefreshCw size={11} />
              {labels.retry}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={handleDownload}
            disabled={streaming}
            aria-label={`${labels.download}: ${record.name}`}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            {downloaded ? <Check size={14} className="text-emerald-400" /> : <Download size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(FileCard);