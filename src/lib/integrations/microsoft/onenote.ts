/**
 * OneNote — Graph OneNote API.
 *
 * Perché solo permessi delegati: l'API OneNote non supporta più l'autenticazione
 * app-only, quindi tutto passa dal token dell'utente. Una conseguenza pratica è
 * che gli appunti creati finiscono nei notebook dell'utente, non in una cartella
 * applicativa come per gli altri file.
 *
 * Il contenuto delle pagine è HTML (non OOXML): crea e append usano HTML, la
 * lettura restituisce l'HTML della pagina. Nessun import da `@/`.
 */

import type { GraphClient, GraphResult } from "./graph";

export type Notebook = { id: string; displayName: string };
export type Section = { id: string; displayName: string; webUrl?: string };
export type NotePage = { id: string; title: string; webUrl?: string };

const MAX_PAGES = 25;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function listNotebooks(client: GraphClient): Promise<GraphResult<Notebook[]>> {
  const res = await client.json<{ value?: Notebook[] }>(
    `/me/onenote/notebooks?$select=id,displayName&$top=${MAX_PAGES}`,
  );
  if (!res.ok) return res;
  return { ok: true, data: res.data.value ?? [] };
}

export async function listSections(
  client: GraphClient,
  opts: { notebookId?: string } = {},
): Promise<GraphResult<Section[]>> {
  const path = opts.notebookId
    ? `/me/onenote/notebooks/${encodeURIComponent(opts.notebookId)}/sections?$select=id,displayName`
    : `/me/onenote/sections?$select=id,displayName&$top=${MAX_PAGES}`;
  const res = await client.json<{ value?: Section[] }>(path);
  if (!res.ok) return res;
  return { ok: true, data: res.data.value ?? [] };
}

/** HTML completo che OneNote pretende alla creazione di una pagina. */
export function buildPageHtml(title: string, bodyHtml: string): string {
  return (
    `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title></head>` +
    `<body>${bodyHtml}</body></html>`
  );
}

export async function createPage(
  client: GraphClient,
  opts: { sectionId: string; title: string; html: string },
): Promise<GraphResult<NotePage>> {
  const res = await client.json<{ id?: string; title?: string; links?: { oneNoteWebUrl?: { href?: string } } }>(
    `/me/onenote/sections/${encodeURIComponent(opts.sectionId)}/pages`,
    {
      method: "POST",
      headers: { "Content-Type": "text/html" },
      body: buildPageHtml(opts.title, opts.html),
    },
  );
  if (!res.ok) return res;
  if (!res.data.id) return { ok: false, error: "OneNote: la pagina non ha un id" };
  return {
    ok: true,
    data: {
      id: res.data.id,
      title: res.data.title ?? opts.title,
      webUrl: res.data.links?.oneNoteWebUrl?.href,
    },
  };
}

/** Aggiunge HTML in fondo a una pagina esistente (PATCH content). */
export async function appendToPage(
  client: GraphClient,
  opts: { pageId: string; html: string },
): Promise<GraphResult<{ ok: true }>> {
  const res = await client.request(
    `/me/onenote/pages/${encodeURIComponent(opts.pageId)}/content`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ target: "body", action: "append", content: opts.html }]),
    },
  );
  if (!res.ok) return { ok: false, error: res.error ?? `OneNote PATCH failed (${res.status})` };
  return { ok: true, data: { ok: true } };
}

/** Legge l'HTML della pagina. */
export async function getPageContent(
  client: GraphClient,
  opts: { pageId: string },
): Promise<GraphResult<{ html: string }>> {
  const res = await client.request(`/me/onenote/pages/${encodeURIComponent(opts.pageId)}/content`);
  if (!res.ok) return { ok: false, error: res.error ?? `OneNote content failed (${res.status})` };
  return { ok: true, data: { html: res.text } };
}
