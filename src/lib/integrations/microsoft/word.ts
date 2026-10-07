/**
 * Word (.docx) — creazione, append e lettura.
 *
 * Perché `docx` per creare e `jszip` per l'append: Graph NON ha un'API per
 * modificare il contenuto di un .docx (a differenza di Excel, che ha /workbook).
 * Quindi:
 *  - creare un file nuovo = generarlo in memoria con `docx` e caricarlo;
 *  - appendere a un file esistente = scaricarlo, iniettare i paragrafi nel
 *    `word/document.xml` e ricaricarlo.
 * L'iniezione XML (non un rebuild da testo estratto) è deliberata: ricostruire
 * il documento da `mammoth` perderebbe immagini, stili e tabelle, e un "append"
 * che cancella il resto del file è peggio di non averlo.
 *
 * Questo modulo non importa nulla da `@/`: prende un `GraphClient` già risolto.
 * Così è testabile e non duplica token/refresh.
 */

import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import mammoth from "mammoth";
import JSZip from "jszip";
import type { GraphClient, GraphResult } from "./graph";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type DocBlock = { heading?: string; text: string };

export type WordFile = {
  id: string;
  name: string;
  webUrl?: string;
  /** Testo estratto, così l'agente può linkare e citare nello stesso passaggio. */
  text: string;
};

/** Costruisce un .docx in memoria. Funzione pura: nessuna rete. */
export async function buildDocx(opts: {
  blocks: DocBlock[];
}): Promise<Uint8Array> {
  const children = opts.blocks.flatMap((b) => {
    const out: Paragraph[] = [];
    if (b.heading) {
      out.push(new Paragraph({ text: b.heading, heading: HeadingLevel.HEADING_1 }));
    }
    out.push(new Paragraph({ text: b.text }));
    return out;
  });
  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}

/** Estrae il testo da un .docx. Funzione pura. */
export async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return result.value;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Inietta paragrafi alla fine di un .docx esistente, preservando tutto il resto.
 * Ogni riga diventa un `<w:p>` con `xml:space="preserve"` per non perdere gli
 * spazi ai bordi.
 */
export async function appendParagraphsToDocx(
  bytes: Uint8Array,
  paragraphs: string[],
): Promise<Uint8Array> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    // Byte che non sono uno zip (quindi non un .docx): messaggio comprensibile
    // invece dell'errore di basso livello di JSZip.
    throw new Error("Il file non è un .docx valido (archivio illeggibile)");
  }
  const entry = zip.file("word/document.xml");
  if (!entry) {
    throw new Error("Il file non è un .docx valido (word/document.xml assente)");
  }
  const xml = await entry.async("string");
  const closeBody = xml.lastIndexOf("</w:body>");
  if (closeBody === -1) {
    throw new Error("Il file non è un .docx valido (</w:body> assente)");
  }
  const injected = paragraphs
    .filter((p) => p.trim().length > 0)
    .map(
      (p) =>
        `<w:p><w:r><w:t xml:space="preserve">${escapeXml(p)}</w:t></w:r></w:p>`,
    )
    .join("");
  const next = `${xml.slice(0, closeBody)}${injected}${xml.slice(closeBody)}`;
  zip.file("word/document.xml", next);
  return new Uint8Array(
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
  );
}

/** Crea un nuovo documento nella cartella AgentCloud. */
export async function createDocument(
  client: GraphClient,
  opts: { name: string; blocks: DocBlock[] },
): Promise<GraphResult<WordFile>> {
  const bytes = await buildDocx({ blocks: opts.blocks });
  // mode "rename": la creazione di un file nuovo non deve sovrascrivere niente.
  const uploaded = await client.uploadFile(opts.name, bytes, DOCX_MIME, "rename");
  if (!uploaded.ok) return uploaded;
  return {
    ok: true,
    data: {
      id: uploaded.data.id,
      name: uploaded.data.name,
      webUrl: uploaded.data.webUrl,
      text: await extractDocxText(bytes),
    },
  };
}

/** Aggiunge paragrafi a un documento esistente (scarica → modifica → ricarica). */
export async function appendToDocument(
  client: GraphClient,
  opts: { itemId: string; paragraphs: string[] },
): Promise<GraphResult<WordFile>> {
  const downloaded = await client.downloadFile(opts.itemId);
  if (!downloaded.ok) return downloaded;

  let bytes: Uint8Array;
  try {
    bytes = await appendParagraphsToDocx(downloaded.data, opts.paragraphs);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "docx non valido" };
  }

  // Nome reale del file: serve per sovrascrivere quello giusto nella cartella.
  const name = (await itemName(client, opts.itemId)) ?? "document.docx";

  // mode "replace": stiamo aggiornando un file preciso, non creandone uno nuovo.
  const uploaded = await client.uploadFile(name, bytes, DOCX_MIME, "replace");
  if (!uploaded.ok) return uploaded;
  return {
    ok: true,
    data: {
      id: uploaded.data.id,
      name: uploaded.data.name,
      webUrl: uploaded.data.webUrl,
      text: await extractDocxText(bytes),
    },
  };
}

/** Legge il testo di un documento esistente. */
export async function readDocument(
  client: GraphClient,
  opts: { itemId: string },
): Promise<GraphResult<{ name: string; text: string }>> {
  const downloaded = await client.downloadFile(opts.itemId);
  if (!downloaded.ok) return downloaded;
  const name = (await itemName(client, opts.itemId)) ?? "document.docx";
  try {
    const text = await extractDocxText(downloaded.data);
    return { ok: true, data: { name, text } };
  } catch (e) {
    return {
      ok: false,
      error: `Non riesco a leggere il .docx: ${e instanceof Error ? e.message : "formato inatteso"}`,
    };
  }
}

/** Nome del DriveItem da id (usato per sovrascrivere il file giusto). */
async function itemName(client: GraphClient, itemId: string): Promise<string | null> {
  const res = await client.json<{ name?: string }>(
    `/me/drive/items/${encodeURIComponent(itemId)}`,
  );
  if (!res.ok) return null;
  return typeof res.data.name === "string" ? res.data.name : null;
}
