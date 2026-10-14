import { marked } from "marked";
import DOMPurify from "dompurify";

/** Markdown → HTML sanitizzato (stesse regole della chat web: niente script/handler). */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-]|$))/i,
  });
}

export type ChatFile = {
  id: string;
  name: string;
  type: string;
  title?: string;
  content: string;
  complete: boolean;
};

const OPEN_RE = /<agentcloud_file\b([^>]*)>/i;
const ATTR_RE = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const CLOSE_TAG = "</agentcloud_file>";

/** Estrae i blocchi file dal testo (port del parser web, display-only). */
export function parseChatFiles(raw: string): { text: string; files: ChatFile[] } {
  const files: ChatFile[] = [];
  let plain = "";
  let cursor = 0;
  for (;;) {
    const rest = raw.slice(cursor);
    const open = OPEN_RE.exec(rest);
    if (!open || open.index === undefined) {
      const partial = rest.indexOf("<agentcloud_file");
      plain += partial === -1 ? rest : rest.slice(0, partial);
      break;
    }
    const partial = rest.indexOf("<agentcloud_file");
    if (partial !== -1 && partial < open.index) {
      plain += rest.slice(0, partial);
      break;
    }
    plain += rest.slice(0, open.index);
    const afterOpen = cursor + open.index + open[0].length;
    const closeIndex = raw.indexOf(CLOSE_TAG, afterOpen);
    const complete = closeIndex !== -1;
    const body = complete ? raw.slice(afterOpen, closeIndex) : raw.slice(afterOpen);
    const attrs: Record<string, string> = {};
    let m: RegExpExecArray | null;
    ATTR_RE.lastIndex = 0;
    while ((m = ATTR_RE.exec(open[1] ?? "")) !== null) {
      attrs[m[1].toLowerCase()] = (m[2] ?? m[3] ?? "").trim();
    }
    const name = (attrs["name"] || attrs["title"] || "file.txt").trim();
    files.push({
      id: attrs["id"] || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      type: (attrs["type"] || "text").trim().toLowerCase(),
      title: attrs["title"] || undefined,
      content: body.replace(/^\n/, "").replace(/\s+$/, ""),
      complete,
    });
    if (!complete) break;
    cursor = closeIndex + CLOSE_TAG.length;
  }
  // Marker di connessione: la card è separata.
  const text = plain.replace(/\[\[CONNECT:[a-zA-Z0-9_-]+\]\]/g, "").trim();
  return { text, files };
}
