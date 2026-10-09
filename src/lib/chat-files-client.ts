/**
 * Download e copia lato browser.
 *
 * Un solo punto di uscita per i file generati dalla chat: qui vivono sia il
 * download con il MIME type corretto sia il fallback di clipboard per
 * contesti non sicuri (http su LAN, WebView).
 */

import { formatBytes, mimeForFile } from "./chat-files";

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadTextFile(name: string, content: string, type?: string): void {
  const blob = new Blob([content], { type: mimeForFile(name, type) });
  triggerBlobDownload(blob, name);
}

/** true se il download è partito davvero. */
export function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    void (async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          resolve(true);
          return;
        }
      } catch {
        // Clipboard API non disponibile (http non sicuro): fallback manuale.
      }
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        resolve(ok);
      } catch {
        resolve(false);
      }
    })();
  });
}

export { formatBytes };