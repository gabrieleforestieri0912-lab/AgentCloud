"use client";

/**
 * UI condivisa per gli allegati della chat (usata da tutte le chat del sito).
 *
 * Fornisce:
 * - `useChatAttachments()`: hook di stato — aggiunge/rimuove/svuota allegati,
 *   gestisce drag & drop (con contatore di profondità per i drag-enter annidati),
 *   l'incolla da clipboard e i messaggi d'errore (troppi file / file troppo grandi).
 * - `AttachPlusButton`: bottone "+" che apre il selettore file.
 * - `AttachmentChips`: chip con anteprima immagine o icona file + rimozione.
 * - `DropHint`: overlay "Rilascia qui..." mostrato durante il trascinamento.
 */
import { useCallback, useRef, useState } from "react";
import { Plus, FileText, X } from "lucide-react";
import {
  CHAT_ATTACH_ACCEPT,
  type ChatAttachment,
  readDroppedFiles,
  revokeAttachmentPreview,
} from "@/lib/chat-attachments";

export type Labels = {
  attachAria: string;
  dropHint: string;
  removeAttachment: string;
  fileTooLarge: (name: string) => string;
  tooManyFiles: string;
  unsupportedFile: (name: string) => string;
};

export function useChatAttachments() {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dragDepth = useRef(0);
  const attachmentsRef = useRef<ChatAttachment[]>([]);
  // eslint-disable-next-line react-hooks/refs
  attachmentsRef.current = attachments;

  const addFiles = useCallback(async (list: FileList | File[] | null, labels: Labels) => {
    if (!list || list.length === 0) return;
    const { attachments: next, errors } = await readDroppedFiles(
      list,
      attachmentsRef.current.length,
    );
    if (errors.some((e) => e === "tooMany")) setNotice(labels.tooManyFiles);
    else if (errors.some((e) => e.startsWith("tooLarge:"))) {
      const name = errors
        .find((e) => e.startsWith("tooLarge:"))!
        .slice("tooLarge:".length);
      setNotice(labels.fileTooLarge(name));
    } else if (errors.length) {
      const failed = errors.find((e) => e.startsWith("failed:"));
      setNotice(
        failed
          ? labels.unsupportedFile(failed.slice("failed:".length))
          : labels.tooManyFiles,
      );
    } else {
      setNotice(null);
    }
    if (next.length) {
      attachmentsRef.current = [...attachmentsRef.current, ...next];
      setAttachments(attachmentsRef.current);
    }
  }, []);

  const remove = useCallback((id: string) => {
    const item = attachmentsRef.current.find((a) => a.id === id);
    if (item) revokeAttachmentPreview(item);
    attachmentsRef.current = attachmentsRef.current.filter((a) => a.id !== id);
    setAttachments(attachmentsRef.current);
  }, []);

  const clear = useCallback(() => {
    attachmentsRef.current.forEach(revokeAttachmentPreview);
    attachmentsRef.current = [];
    setAttachments([]);
    setNotice(null);
  }, []);

  const take = useCallback((): ChatAttachment[] => {
    const snapshot = attachmentsRef.current;
    attachmentsRef.current = [];
    setAttachments([]);
    setNotice(null);
    return snapshot;
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    if (e.dataTransfer.types.includes("Files")) setDragOver(true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }, []);

  const makeDrop =
    (labels: Labels) =>
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current = 0;
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files?.length) await addFiles(files, labels);
    };

  const makePaste =
    (labels: Labels) =>
    async (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length === 0) return;
      e.preventDefault();
      await addFiles(files, labels);
    };

  return {
    attachments,
    dragOver,
    notice,
    addFiles,
    remove,
    clear,
    take,
    onDragEnter,
    onDragOver,
    onDragLeave,
    makeDrop,
    makePaste,
  };
}

export function AttachPlusButton({
  labels,
  onPick,
  disabled,
}: {
  labels: Labels;
  onPick: (files: FileList | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={CHAT_ATTACH_ACCEPT}
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label={labels.attachAria}
        title={labels.attachAria}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
      >
        <Plus size={18} strokeWidth={2.25} />
      </button>
    </>
  );
}

export function AttachmentChips({
  items,
  onRemove,
  removeLabel,
}: {
  items: ChatAttachment[];
  onRemove: (id: string) => void;
  removeLabel: (name: string) => string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-1 pb-2">
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex items-center gap-1.5 max-w-55 rounded-xl border border-white/10 bg-neutral-900/80 pl-1 pr-1.5 py-1 text-xs text-neutral-200"
        >
          {item.kind === "image" && item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.previewUrl}
              alt=""
              className="h-8 w-8 rounded-lg object-cover shrink-0"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-brand-400 shrink-0">
              <FileText size={14} />
            </span>
          )}
          <span className="truncate">{item.name}</span>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={removeLabel(item.name)}
            className="rounded-md p-0.5 text-neutral-500 hover:text-red-400"
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}

export function DropHint({ visible, text }: { visible: boolean; text: string }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand-400 bg-brand-500/15 backdrop-blur-[1px]">
      <p className="text-sm font-semibold text-white px-4 text-center">{text}</p>
    </div>
  );
}

export function chatAttachLabels(dict: {
  chat: {
    attachAria: string;
    dropHint: string;
    removeAttachment: string;
    fileTooLarge: string;
    tooManyFiles: string;
    unsupportedFile: string;
  };
}): Labels {
  const c = dict.chat;
  return {
    attachAria: c.attachAria,
    dropHint: c.dropHint,
    removeAttachment: c.removeAttachment,
    fileTooLarge: (name) => c.fileTooLarge.replace("{name}", name).replace("{max}", "8 MB"),
    tooManyFiles: c.tooManyFiles.replace("{n}", "6"),
    unsupportedFile: (name) => c.unsupportedFile.replace("{name}", name),
  };
}
