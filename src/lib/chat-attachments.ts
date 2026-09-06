/** Client-side helpers for chat file/image attachments. */

export const CHAT_ATTACH_ACCEPT =
  "image/*,.txt,.csv,.md,.json,.html,.xml,.log,.tsv,.yml,.yaml,.pdf,.doc,.docx";

export const CHAT_ATTACH_MAX_BYTES = 8 * 1024 * 1024;
export const CHAT_ATTACH_MAX_FILES = 6;
export const CHAT_ATTACH_TEXT_CAP = 80_000;

const TEXT_EXT = /\.(txt|csv|md|json|html|htm|xml|log|tsv|yml|yaml|css|js|ts|tsx|py|rb|go|sql)$/i;

export type ChatAttachmentKind = "image" | "text" | "file";

export type ChatAttachment = {
  id: string;
  name: string;
  kind: ChatAttachmentKind;
  mime: string;
  size: number;
  /** Text body, data URL (images), or a short placeholder for binaries. */
  content: string;
  previewUrl?: string;
};

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name);
}

function isTextFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  if (file.type === "application/json") return true;
  return TEXT_EXT.test(file.name);
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function readDroppedFiles(
  list: FileList | File[],
  existingCount: number,
): Promise<{ attachments: ChatAttachment[]; errors: string[] }> {
  const files = Array.from(list);
  const errors: string[] = [];
  const attachments: ChatAttachment[] = [];
  const room = Math.max(0, CHAT_ATTACH_MAX_FILES - existingCount);

  if (files.length + existingCount > CHAT_ATTACH_MAX_FILES) {
    errors.push("tooMany");
  }

  for (const file of files.slice(0, room)) {
    if (file.size > CHAT_ATTACH_MAX_BYTES) {
      errors.push(`tooLarge:${file.name}`);
      continue;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      if (isImageFile(file)) {
        const content = await readAsDataUrl(file);
        attachments.push({
          id,
          name: file.name,
          kind: "image",
          mime: file.type || "image/*",
          size: file.size,
          content,
          previewUrl: URL.createObjectURL(file),
        });
      } else if (isTextFile(file)) {
        const raw = await readAsText(file);
        attachments.push({
          id,
          name: file.name,
          kind: "text",
          mime: file.type || "text/plain",
          size: file.size,
          content: raw.slice(0, CHAT_ATTACH_TEXT_CAP),
        });
      } else {
        attachments.push({
          id,
          name: file.name,
          kind: "file",
          mime: file.type || "application/octet-stream",
          size: file.size,
          content: `[file binario: ${file.name}, ${file.type || "unknown"}, ${file.size} byte]`,
        });
      }
    } catch {
      errors.push(`failed:${file.name}`);
    }
  }

  return { attachments, errors };
}

export function toFilesMap(items: ChatAttachment[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of items) {
    out[item.name] = item.content;
  }
  return out;
}

export function composeUserContent(text: string, items: ChatAttachment[]): string {
  const trimmed = text.trim();
  if (items.length === 0) return trimmed;

  const lines = [
    trimmed,
    trimmed ? "" : "",
    "---",
    "Allegati dell'utente:",
  ];

  for (const item of items) {
    if (item.kind === "text") {
      lines.push("", `### ${item.name}`, item.content);
    } else if (item.kind === "image") {
      lines.push(
        "",
        `### ${item.name}`,
        `Immagine allegata (${item.mime}, ${item.size} byte). Usa read_file con filename "${item.name}" se ti serve il contenuto.`,
      );
    } else {
      lines.push("", `### ${item.name}`, item.content);
    }
  }

  return lines.filter((l, i) => !(i === 0 && l === "")).join("\n").trim();
}

export function revokeAttachmentPreview(item: ChatAttachment) {
  if (item.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(item.previewUrl);
  }
}
