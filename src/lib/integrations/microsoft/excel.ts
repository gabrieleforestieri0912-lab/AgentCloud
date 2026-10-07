/**
 * Excel (.xlsx) — creazione e modifica tramite le API workbook di Graph.
 *
 * Excel è l'unico dei quattro dove Graph ha API native di modifica
 * (`/workbook/worksheets`, `/range`, `/tables`): non serve scaricare e
 * ricaricare il file per scrivere una cella. Per questo qui non c'è il
 * download/upload che invece usa Word.
 *
 * La creazione di un file nuovo passa da exceljs e dall'upload: Graph non crea
 * un workbook da zero, e generarlo è deterministico.
 *
 * Nessun import da `@/`: il client Graph arriva già risolto.
 */

import ExcelJS from "exceljs";
import type { GraphClient, GraphResult } from "./graph";

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Celle accettate dal modello: i tipi che ExcelJS e Graph serializzano. */
export type CellValue = string | number | boolean | null;

export type SheetSpec = { name: string; rows: CellValue[][] };

export async function buildWorkbook(sheets: SheetSpec[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    // Excel limita il nome del foglio a 31 caratteri.
    const ws = wb.addWorksheet((s.name || "Sheet1").slice(0, 31));
    ws.addRows(s.rows);
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as unknown as ArrayBuffer);
}

function rangePath(itemId: string, sheet: string, address: string): string {
  // Il nome del foglio va nel path: la forma tra apici gestisce spazi e caratteri
  // speciali (`worksheets('Q1 2026')`).
  return (
    `/me/drive/items/${encodeURIComponent(itemId)}/workbook/worksheets('${encodeURIComponent(sheet)}')` +
    `/range(address='${encodeURIComponent(address)}')`
  );
}

export type RangeData = { address: string; values: CellValue[][] };

export async function readRange(
  client: GraphClient,
  opts: { itemId: string; sheet: string; address: string },
): Promise<GraphResult<RangeData>> {
  const res = await client.json<{ address?: string; values?: CellValue[][] }>(
    rangePath(opts.itemId, opts.sheet, opts.address),
  );
  if (!res.ok) return res;
  return {
    ok: true,
    data: { address: res.data.address ?? opts.address, values: res.data.values ?? [] },
  };
}

export async function writeRange(
  client: GraphClient,
  opts: { itemId: string; sheet: string; address: string; values: CellValue[][] },
): Promise<GraphResult<RangeData>> {
  const res = await client.json<{ address?: string; values?: CellValue[][] }>(
    rangePath(opts.itemId, opts.sheet, opts.address),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: opts.values }),
    },
  );
  if (!res.ok) return res;
  return {
    ok: true,
    data: { address: res.data.address ?? opts.address, values: res.data.values ?? opts.values },
  };
}

/**
 * Aggiunge righe in fondo. Graph non ha un "append" generico: si legge
 * `usedRange`, si calcola la prima riga libera e si scrive lì. Il calcolo è
 * fatto sul contenuto (l'ultima riga non vuota), non su `rowCount`, che resta
 * gonfiato dalle righe formattate ma vuote.
 */
export async function appendRows(
  client: GraphClient,
  opts: { itemId: string; sheet: string; rows: CellValue[][] },
): Promise<GraphResult<RangeData>> {
  const used = await client.json<{ values?: CellValue[][] }>(
    `/me/drive/items/${encodeURIComponent(opts.itemId)}/workbook/worksheets('${encodeURIComponent(opts.sheet)}')/usedRange`,
  );
  if (!used.ok) return used;

  const existing = used.data.values ?? [];
  let lastRow = 0;
  for (let i = 0; i < existing.length; i++) {
    if ((existing[i] ?? []).some((c) => c !== null && c !== "")) lastRow = i + 1;
  }
  const startRow = lastRow + 1;
  const width = Math.max(1, ...opts.rows.map((r) => r.length));
  const endRow = startRow + opts.rows.length - 1;
  const address = `A${startRow}:${columnLetter(width)}${endRow}`;

  return writeRange(client, { ...opts, address, values: opts.rows });
}

/** Aggiunge una tabella su un intervallo (Graph pretende gli header). */
export async function createTable(
  client: GraphClient,
  opts: { itemId: string; sheet: string; address: string },
): Promise<GraphResult<{ id?: string; name?: string }>> {
  return client.json(
    `/me/drive/items/${encodeURIComponent(opts.itemId)}/workbook/worksheets('${encodeURIComponent(opts.sheet)}')/tables/add`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: opts.address, hasHeaders: true }),
    },
  );
}

export async function createWorkbook(
  client: GraphClient,
  opts: { name: string; sheets: SheetSpec[] },
): Promise<GraphResult<{ id: string; name: string; webUrl?: string }>> {
  const bytes = await buildWorkbook(opts.sheets);
  const uploaded = await client.uploadFile(opts.name, bytes, XLSX_MIME, "rename");
  if (!uploaded.ok) return uploaded;
  return {
    ok: true,
    data: { id: uploaded.data.id, name: uploaded.data.name, webUrl: uploaded.data.webUrl },
  };
}

/** 1 → A, 27 → AA. */
export function columnLetter(n: number): string {
  let s = "";
  let x = Math.max(1, Math.floor(n));
  while (x > 0) {
    const rem = (x - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}
