/**
 * Tool agente per Microsoft 365.
 *
 * Perché in un modulo dedicato: tengono `integration-tools.ts` leggibile e
 * raccolgono in un punto le conversioni input→tipi dei quattro documenti, che è
 * la parte che sbaglia più facilmente (il modello manda JSON, non stringhe).
 *
 * Solo i tool richiesti sono esposti: i tool di lettura e di creazione non
 * chiedono conferma, quelli che modificano un file/documento esistente sì
 * (`toolRequiresConfirmation`, vedi `tool-confirmation.ts`). Le funzioni
 * `graphClientForTenant` risolvono (e se serve rinfrescano) il token del tenant.
 */

import type { LLMTool } from "@/lib/llm";
import { graphClientForTenant } from "@/lib/integrations/microsoft/tenant";
import { createDocument, appendToDocument, readDocument, type DocBlock } from "@/lib/integrations/microsoft/word";
import { createWorkbook, readRange, writeRange, type CellValue, type SheetSpec } from "@/lib/integrations/microsoft/excel";
import { createPresentation, type SlideSpec } from "@/lib/integrations/microsoft/powerpoint";
import { listNotebooks, listSections, createPage, appendToPage, getPageContent } from "@/lib/integrations/microsoft/onenote";

export const MICROSOFT_TOOL_NAMES = [
  "word_create",
  "word_append",
  "word_read",
  "excel_create",
  "excel_read_range",
  "excel_write_range",
  "powerpoint_create",
  "onenote_list",
  "onenote_create_page",
  "onenote_append",
  "onenote_read",
] as const;

export function isMicrosoftTool(name: string): boolean {
  return (MICROSOFT_TOOL_NAMES as readonly string[]).includes(name);
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

/**
 * Il modello manda array/oggetti come JSON. Accettiamo sia il valore già
 * strutturato sia la stringa JSON, perché secondo il provider l'input può
 * arrivare nei due modi.
 */
function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asDocBlocks(value: unknown, fallbackText: string): DocBlock[] {
  const arr = asArray(value);
  if (arr.length === 0) return fallbackText ? [{ text: fallbackText }] : [];
  return arr.map((raw) => {
    const b = (raw ?? {}) as Record<string, unknown>;
    const heading = b.heading ? clean(b.heading, 200) : undefined;
    return { heading, text: clean(b.text ?? b.body ?? "", 8000) };
  });
}

function asSheets(value: unknown): SheetSpec[] {
  return asArray(value).map((raw) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const rows = asArray(s.rows).map((r) =>
      (Array.isArray(r) ? r : [r]).map((c) => (c === null || c === undefined ? null : (c as CellValue))),
    );
    return { name: clean(s.name ?? "Sheet1", 31), rows };
  });
}

function asSlides(value: unknown): SlideSpec[] {
  return asArray(value).map((raw) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const bullets = asArray(s.bullets).map((b) => clean(b, 500));
    return {
      title: s.title ? clean(s.title, 200) : undefined,
      bullets: bullets.length ? bullets : undefined,
      imageUrl: s.imageUrl ? clean(s.imageUrl, 1000) : undefined,
      notes: s.notes ? clean(s.notes, 2000) : undefined,
    };
  });
}

function asCellRows(value: unknown): CellValue[][] {
  return asArray(value).map((r) =>
    (Array.isArray(r) ? r : [r]).map((c) => (c === null || c === undefined ? null : (c as CellValue))),
  );
}

/** Campi obbligatori per tool (solo quelli stringa: array/oggetti sono validati nel case). */
const REQUIRED_FIELDS: Record<string, string[]> = {
  word_create: ["name"],
  word_append: ["itemId"],
  word_read: ["itemId"],
  excel_create: ["name"],
  excel_read_range: ["itemId", "sheet", "address"],
  excel_write_range: ["itemId", "sheet", "address"],
  powerpoint_create: ["name"],
  onenote_create_page: ["sectionId", "title"],
  onenote_append: ["pageId", "html"],
  onenote_read: ["pageId"],
};

/**
 * Validazione fail-fast PRIMA di risolvere il token: se manca un campo
 * obbligatorio, l'errore utile è "manca X", non "Microsoft non è collegato".
 * Inoltre rende la validazione testabile senza una connessione reale.
 */
function missingRequired(name: string, input: Record<string, unknown>): string | null {
  const required = REQUIRED_FIELDS[name];
  if (!required) return null;
  const missing = required.filter((k) => !clean(input[k], 1));
  return missing.length ? `${name} requires ${missing.join(", ")}.` : null;
}

export const MICROSOFT_TOOL_DEFINITIONS: Record<string, LLMTool> = {
  word_create: {
    name: "word_create",
    description:
      "Create a new Word document (.docx) in the user's OneDrive (AgentCloud folder). Provide a file name and the content as blocks [{heading, text}]. Returns the file link and a text preview.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "File name, e.g. 'Q1 report.docx'" },
        blocks: {
          type: "array",
          description: "Document content: [{heading?: string, text: string}]",
          items: { type: "object" },
        },
      },
      required: ["name", "blocks"],
    },
  },
  word_append: {
    name: "word_append",
    description:
      "Append paragraphs to an existing Word document (keeps the current content and formatting). Requires explicit user confirmation before running. Give the file id from word_create/a previous result, and the paragraphs to add.",
    input_schema: {
      type: "object",
      properties: {
        itemId: { type: "string", description: "Drive item id of the .docx" },
        paragraphs: { type: "array", items: { type: "string" }, description: "Paragraphs to add" },
      },
      required: ["itemId", "paragraphs"],
    },
  },
  word_read: {
    name: "word_read",
    description: "Read the text of a Word document (.docx) by its Drive item id.",
    input_schema: {
      type: "object",
      properties: { itemId: { type: "string", description: "Drive item id of the .docx" } },
      required: ["itemId"],
    },
  },
  excel_create: {
    name: "excel_create",
    description:
      "Create a new Excel workbook (.xlsx) in the OneDrive AgentCloud folder. Sheets: [{name, rows:[[...]]}]. Returns the file link.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "File name, e.g. 'sales.xlsx'" },
        sheets: {
          type: "array",
          description: "Sheets: [{name: string, rows: array of arrays}]",
          items: { type: "object" },
        },
      },
      required: ["name", "sheets"],
    },
  },
  excel_read_range: {
    name: "excel_read_range",
    description:
      "Read a range from an Excel file already in OneDrive using the Excel Graph API. Sheet name and address like 'A1:D20'.",
    input_schema: {
      type: "object",
      properties: {
        itemId: { type: "string" },
        sheet: { type: "string", description: "Worksheet name" },
        address: { type: "string", description: "Range address, e.g. A1:D20" },
      },
      required: ["itemId", "sheet", "address"],
    },
  },
  excel_write_range: {
    name: "excel_write_range",
    description:
      "Write values into a range of an existing Excel file. Requires explicit user confirmation before running. Values is an array of rows.",
    input_schema: {
      type: "object",
      properties: {
        itemId: { type: "string" },
        sheet: { type: "string" },
        address: { type: "string", description: "Range address, e.g. A1:B2" },
        values: { type: "array", description: "Rows of values: [[...], [...]]", items: { type: "array" } },
      },
      required: ["itemId", "sheet", "address", "values"],
    },
  },
  powerpoint_create: {
    name: "powerpoint_create",
    description:
      "Create a new PowerPoint presentation (.pptx) in the OneDrive AgentCloud folder. Slides: [{title, bullets[], imageUrl?, notes?}]. Returns the file link.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "File name, e.g. 'pitch.pptx'" },
        title: { type: "string", description: "Optional presentation title" },
        slides: {
          type: "array",
          description: "Slides: [{title?, bullets?: string[], imageUrl?, notes?}]",
          items: { type: "object" },
        },
      },
      required: ["name", "slides"],
    },
  },
  onenote_list: {
    name: "onenote_list",
    description:
      "List the user's OneNote notebooks, or the sections of one notebook when notebookId is given. Use the returned ids with onenote_create_page.",
    input_schema: {
      type: "object",
      properties: {
        notebookId: { type: "string", description: "Optional notebook id to list its sections" },
      },
    },
  },
  onenote_create_page: {
    name: "onenote_create_page",
    description:
      "Create a new OneNote page in a section. The body is HTML (simple tags: p, h1-h3, ul/li, table). Returns the page link.",
    input_schema: {
      type: "object",
      properties: {
        sectionId: { type: "string", description: "Section id from onenote_list" },
        title: { type: "string" },
        html: { type: "string", description: "Page body as HTML" },
      },
      required: ["sectionId", "title", "html"],
    },
  },
  onenote_append: {
    name: "onenote_append",
    description:
      "Append HTML to an existing OneNote page. Requires explicit user confirmation before running.",
    input_schema: {
      type: "object",
      properties: {
        pageId: { type: "string" },
        html: { type: "string", description: "HTML to append" },
      },
      required: ["pageId", "html"],
    },
  },
  onenote_read: {
    name: "onenote_read",
    description: "Read the HTML content of a OneNote page by its id.",
    input_schema: {
      type: "object",
      properties: { pageId: { type: "string" } },
      required: ["pageId"],
    },
  },
};

function link(name: string, webUrl: string | undefined, id: string): string {
  return `${name}${webUrl ? ` — ${webUrl}` : ""} (id: ${id})`;
}

/**
 * Esegue un tool Microsoft. L'input arriva dal modello come JSON: le conversioni
 * con `asArray`/`asSheets`/`asSlides` sono difensive perché un argomento
 * malformato non deve far esplodere il loop dei tool.
 */
export async function executeMicrosoftTool(
  name: string,
  input: Record<string, unknown>,
  tenantId: string,
): Promise<string> {
  const missing = missingRequired(name, input);
  if (missing) return missing;

  const client = await graphClientForTenant(tenantId);
  if (!client.ok) return client.error;
  const g = client.data;

  switch (name) {
    case "word_create": {
      const fileName = clean(input.name, 200);
      if (!fileName) return "word_create requires name.";
      const blocks = asDocBlocks(input.blocks, clean(input.text, 8000));
      if (blocks.length === 0) return "word_create requires blocks or text.";
      const r = await createDocument(g, { name: fileName, blocks });
      if (!r.ok) return r.error;
      return `Created Word document ${link(r.data.name, r.data.webUrl, r.data.id)}. Preview: ${r.data.text.slice(0, 400)}`;
    }

    case "word_append": {
      const itemId = clean(input.itemId, 200);
      if (!itemId) return "word_append requires itemId.";
      const paragraphs = asArray(input.paragraphs).map((p) => clean(p, 8000));
      if (paragraphs.length === 0) return "word_append requires paragraphs.";
      const r = await appendToDocument(g, { itemId, paragraphs });
      if (!r.ok) return r.error;
      return `Updated Word document ${link(r.data.name, r.data.webUrl, r.data.id)} (+${paragraphs.length} paragraphs).`;
    }

    case "word_read": {
      const itemId = clean(input.itemId, 200);
      if (!itemId) return "word_read requires itemId.";
      const r = await readDocument(g, { itemId });
      if (!r.ok) return r.error;
      return r.data.text.slice(0, 20000);
    }

    case "excel_create": {
      const fileName = clean(input.name, 200);
      if (!fileName) return "excel_create requires name.";
      const sheets = asSheets(input.sheets);
      if (sheets.length === 0) return "excel_create requires sheets.";
      const r = await createWorkbook(g, { name: fileName, sheets });
      if (!r.ok) return r.error;
      return `Created workbook ${link(r.data.name, r.data.webUrl, r.data.id)} with ${sheets.length} sheet(s).`;
    }

    case "excel_read_range": {
      const itemId = clean(input.itemId, 200);
      const sheet = clean(input.sheet, 64);
      const address = clean(input.address, 32);
      if (!itemId || !sheet || !address) return "excel_read_range requires itemId, sheet and address.";
      const r = await readRange(g, { itemId, sheet, address });
      if (!r.ok) return r.error;
      return `${r.data.address}: ${JSON.stringify(r.data.values).slice(0, 8000)}`;
    }

    case "excel_write_range": {
      const itemId = clean(input.itemId, 200);
      const sheet = clean(input.sheet, 64);
      const address = clean(input.address, 32);
      if (!itemId || !sheet || !address) return "excel_write_range requires itemId, sheet and address.";
      const values = asCellRows(input.values);
      if (values.length === 0) return "excel_write_range requires values.";
      const r = await writeRange(g, { itemId, sheet, address, values });
      if (!r.ok) return r.error;
      return `Wrote ${values.length} row(s) to ${r.data.address}.`;
    }

    case "powerpoint_create": {
      const fileName = clean(input.name, 200);
      if (!fileName) return "powerpoint_create requires name.";
      const slides = asSlides(input.slides);
      if (slides.length === 0) return "powerpoint_create requires slides.";
      const r = await createPresentation(g, {
        name: fileName,
        slides,
        title: input.title ? clean(input.title, 200) : undefined,
      });
      if (!r.ok) return r.error;
      return `Created presentation ${link(r.data.name, r.data.webUrl, r.data.id)} with ${slides.length} slide(s).`;
    }

    case "onenote_list": {
      const notebookId = input.notebookId ? clean(input.notebookId, 200) : "";
      if (notebookId) {
        const r = await listSections(g, { notebookId });
        if (!r.ok) return r.error;
        if (r.data.length === 0) return "No sections in this notebook.";
        return r.data.map((s) => `${s.displayName} (id: ${s.id})`).join("\n");
      }
      const r = await listNotebooks(g);
      if (!r.ok) return r.error;
      if (r.data.length === 0) return "No OneNote notebooks found.";
      return r.data.map((n) => `${n.displayName} (id: ${n.id})`).join("\n");
    }

    case "onenote_create_page": {
      const sectionId = clean(input.sectionId, 200);
      const title = clean(input.title, 200);
      if (!sectionId || !title) return "onenote_create_page requires sectionId and title.";
      const html = clean(input.html, 40000);
      const r = await createPage(g, { sectionId, title, html });
      if (!r.ok) return r.error;
      return `Created OneNote page ${link(r.data.title, r.data.webUrl, r.data.id)}.`;
    }

    case "onenote_append": {
      const pageId = clean(input.pageId, 200);
      if (!pageId) return "onenote_append requires pageId.";
      const html = clean(input.html, 40000);
      if (!html) return "onenote_append requires html.";
      const r = await appendToPage(g, { pageId, html });
      if (!r.ok) return r.error;
      return "Appended content to the OneNote page.";
    }

    case "onenote_read": {
      const pageId = clean(input.pageId, 200);
      if (!pageId) return "onenote_read requires pageId.";
      const r = await getPageContent(g, { pageId });
      if (!r.ok) return r.error;
      return r.data.html.slice(0, 20000);
    }

    default:
      return `Tool "${name}" is not implemented`;
  }
}
