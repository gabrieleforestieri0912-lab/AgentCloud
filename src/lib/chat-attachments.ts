/**
 * Helper client-side per gli allegati (file/immagini) della chat.
 *
 * Come funziona: quando l'utente trascina, incolla o seleziona dei file, il
 * contenuto viene letto nel browser e normalizzato in un `ChatAttachment`
 * tipizzato. A seconda del tipo il contenuto è: testo grezzo (file di testo,
 * es. CSV/CV da far leggere all'agente), data URL (immagini, per l'anteprima
 * e per il tool `read_file`) o un breve segnaposto (binari illeggibili). I
 * limiti (8 MB per file, 6 file, 80k caratteri di testo) evitano che un
 * allegato enorme saturi la memoria del client o il contesto del modello.
 */

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
  /** Corpo testuale, data URL (immagini) o breve segnaposto per i binari. */
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
  // Posti ancora liberi nel limite di file per messaggio.
  const room = Math.max(0, CHAT_ATTACH_MAX_FILES - existingCount);

  if (files.length + existingCount > CHAT_ATTACH_MAX_FILES) {
    errors.push("tooMany");
  }

  // I file in eccesso rispetto al limite vengono ignorati, non letti inutilmente.
  for (const file of files.slice(0, room)) {
    if (file.size > CHAT_ATTACH_MAX_BYTES) {
      errors.push(`tooLarge:${file.name}`);
      continue;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      if (isImageFile(file)) {
        // Le immagini restano come data URL: servono per l'anteprima nella bolla
        // e possono essere passate al tool read_file dell'agente.
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
        // I file di testo vengono letti e troncati a un tetto per non saturare
        // il contesto del modello con documenti enormi.
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
        // Binari (pdf/doc/...) : non leggibili nel browser, si manda solo un
        // segnaposto descrittivo così l'agente sa che esiste ma non può leggerlo.
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

// Mappa nome-file → contenuto: è il formato che gli endpoint agente (/api/agent/run)
// accettano nel campo `files`, così i tool come read_file trovano i file per nome.
export function toFilesMap(items: ChatAttachment[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of items) {
    out[item.name] = item.content;
  }
  return out;
}

/**
 * Compone il contenuto del messaggio utente che viene inviato all'API.
 *
 * Le immagini NON vengono incluse come testo con nome file: sono inviate a
 * parte come blocchi vision (base64) così Claude le vede davvero. Il nome
 * file non compare mai nel messaggio AI (richiesta: non mostrare filename).
 * Per i file di testo il contenuto viene incluso senza header col filename.
 */
export function composeUserContent(text: string, items: ChatAttachment[]): string {
  const trimmed = text.trim();
  const nonImage = items.filter((i) => i.kind !== "image");
  if (nonImage.length === 0) return trimmed;

  const lines = [
    trimmed,
    trimmed ? "" : "",
    "---",
    "Allegati dell'utente:",
  ];

  for (const item of nonImage) {
    if (item.kind === "text") {
      lines.push("", item.content);
    } else {
      // file binario: segnaposto già senza nome file visibile? lo manteniamo generico
      lines.push("", item.content);
    }
  }

  return lines.filter((l, i) => !(i === 0 && l === "")).join("\n").trim();
}

/**
 * Estrae i blocchi vision per le immagini allegate (Anthropic image blocks).
 * Ritorna array pronto per LLMMessage content. Il nome file non è mai esposto.
 */
export function toVisionBlocks(items: ChatAttachment[]): Array<{ type: "image"; source: { type: "base64"; media_type: string; data: string } }> {
  const blocks: Array<{ type: "image"; source: { type: "base64"; media_type: string; data: string } }> = [];
  for (const item of items) {
    if (item.kind !== "image") continue;
    const url = item.content; // data URL
    const m = url.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) continue;
    const mediaType = m[1] || item.mime || "image/png";
    const data = m[2];
    // Anthropic supporta: image/jpeg, image/png, image/gif, image/webp
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const normalized = allowed.includes(mediaType) ? mediaType : "image/png";
    blocks.push({ type: "image", source: { type: "base64", media_type: normalized, data } });
  }
  return blocks;
}

// Libera l'URL blob dell'anteprima quando l'allegato viene rimosso: senza
// revoke ogni immagine trascinata lascerebbe una perdita di memoria nel browser.
export function revokeAttachmentPreview(item: ChatAttachment) {
  if (item.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(item.previewUrl);
  }
}
