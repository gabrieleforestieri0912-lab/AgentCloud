/**
 * PowerPoint (.pptx) — creazione.
 *
 * Graph non ha API per costruire o modificare slide: il deck si genera in
 * memoria con `pptxgenjs` e si carica come file. Per questo qui esiste solo la
 * creazione, non un "append su slide esistente": senza un parser OOXML completo
 * un append su un deck esistente perderebbe tema e layout, ed è un limite reale,
 * non una dimenticanza.
 *
 * Nessun import da `@/`.
 */

import PptxGenJS from "pptxgenjs";
import type { GraphClient, GraphResult } from "./graph";

export const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** Tetto per chiamata: un deck enorme è quasi sempre un errore del modello. */
export const MAX_SLIDES = 40;

export type SlideSpec = {
  title?: string;
  bullets?: string[];
  /** Immagine da URL pubblico. Immagini binarie non passano dal modello. */
  imageUrl?: string;
  /** Note del relatore. */
  notes?: string;
};

export async function buildPresentation(
  slides: SlideSpec[],
  opts: { title?: string } = {},
): Promise<Uint8Array> {
  if (slides.length > MAX_SLIDES) {
    throw new Error(`Troppe slide (${slides.length}): il massimo per chiamata è ${MAX_SLIDES}.`);
  }
  const pptx = new PptxGenJS();
  if (opts.title) pptx.title = opts.title;

  for (const s of slides) {
    const slide = pptx.addSlide();
    if (s.title) {
      slide.addText(s.title, { x: 0.5, y: 0.4, w: 9, h: 1, fontSize: 28, bold: true });
    }
    if (s.bullets?.length) {
      slide.addText(
        s.bullets.map((text) => ({ text, options: { bullet: true } })),
        { x: 0.5, y: 1.5, w: s.imageUrl ? 5.5 : 9, h: 4, fontSize: 18 },
      );
    }
    if (s.imageUrl) {
      slide.addImage({ path: s.imageUrl, x: 6, y: 1.5, w: 3, h: 3 });
    }
    if (s.notes) {
      slide.addNotes(s.notes);
    }
  }

  const out = await pptx.write({ outputType: "uint8array" });
  return out as Uint8Array;
}

export async function createPresentation(
  client: GraphClient,
  opts: { name: string; slides: SlideSpec[]; title?: string },
): Promise<GraphResult<{ id: string; name: string; webUrl?: string }>> {
  let bytes: Uint8Array;
  try {
    bytes = await buildPresentation(opts.slides, { title: opts.title });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "pptx non generabile" };
  }
  const uploaded = await client.uploadFile(opts.name, bytes, PPTX_MIME, "rename");
  if (!uploaded.ok) return uploaded;
  return {
    ok: true,
    data: { id: uploaded.data.id, name: uploaded.data.name, webUrl: uploaded.data.webUrl },
  };
}
