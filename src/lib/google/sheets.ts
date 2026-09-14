import { createAdminClient } from "@/lib/supabase/admin";
import { decryptMaybe, encryptToken } from "@/lib/integrations/encryption";

/**
 * Google Sheets — token e chiamate API lato server.
 *
 * Perché esiste: a differenza di Gmail/Calendar (che usano `google_connections`),
 * la connessione Google Sheets di un tenant vive in `tenant_integrations`
 * (provider `google_sheets`, `tenant_id` = utente). Questo modulo è il gemello
 * di lib/google/token.ts per quella tabella: decripta i token a riposo,
 * rinfresca l'access token scaduto e riscrive la riga, così gli agenti possono
 * leggere e scrivere spreadsheet senza mai toccare OAuth o HTTP grezzo.
 */

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // rinfresca 5 minuti prima della scadenza
const MAX_READ_ROWS = 200;
const MAX_WRITE_CELLS = 2000;

type SheetsRow = {
  status: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  external_account_id: string | null;
};

export type GoogleSheetsToken = {
  accessToken: string;
  /** Account Google collegato (email), se disponibile. */
  account: string | null;
};

/** True se un token con questa scadenza va rinfrescato ora. */
function shouldRefresh(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return true;
  return expiry - Date.now() <= REFRESH_MARGIN_MS;
}

/** Rinfresca l'access token Google Sheets tramite l'endpoint token di Google. */
async function refreshSheetsAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    return {
      accessToken: json.access_token,
      expiresAt: new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Recupera (e se serve rinfresca) l'access token Google Sheets di un tenant.
 * Restituisce null quando la connessione non esiste, non è `connected` o i
 * token non sono decifrabili.
 */
export async function resolveGoogleSheetsToken(
  tenantId: string,
): Promise<GoogleSheetsToken | null> {
  if (!tenantId) return null;
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("tenant_integrations")
    .select("status, access_token, refresh_token, expires_at, external_account_id")
    .eq("tenant_id", tenantId)
    .eq("provider", "google_sheets")
    .maybeSingle();
  if (error || !data) return null;

  const row = data as SheetsRow;
  if (row.status && row.status !== "connected") return null;

  let accessToken = decryptMaybe(row.access_token);
  if (!accessToken) return null;

  const refreshToken = decryptMaybe(row.refresh_token);
  if (refreshToken && shouldRefresh(row.expires_at)) {
    const refreshed = await refreshSheetsAccessToken(refreshToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      await admin
        .from("tenant_integrations")
        .update({
          access_token: encryptToken(refreshed.accessToken),
          expires_at: refreshed.expiresAt,
          status: "connected",
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .eq("provider", "google_sheets");
    }
  }

  return { accessToken, account: row.external_account_id };
}

export type GoogleSheetsAction = "getValues" | "updateValues" | "appendValues";

export type GoogleSheetsResult =
  | { ok: true; data: string }
  | { ok: false; error: string };

/**
 * Accetta sia l'ID puro sia l'URL completo di un foglio
 * (https://docs.google.com/spreadsheets/d/<id>/edit...), perché è quello che
 * gli utenti incollano normalmente.
 */
export function extractSpreadsheetId(value: string): string {
  const trimmed = (value || "").trim();
  const fromUrl = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return (fromUrl?.[1] ?? trimmed).trim();
}

/** Normalizza le righe ricevute dal modello in una matrice di celle testuali. */
function normalizeValues(values: unknown): string[][] | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  const rows: string[][] = [];
  let cells = 0;
  for (const rawRow of values) {
    const row = Array.isArray(rawRow) ? rawRow : [rawRow];
    const normalized = row.map((cell) =>
      cell === null || cell === undefined ? "" : String(cell),
    );
    cells += normalized.length;
    if (cells > MAX_WRITE_CELLS) return null;
    rows.push(normalized);
  }
  return rows;
}

/** Rende leggibile il risultato di una lettura per l'agente. */
function formatValues(range: string, values: unknown): string {
  const rows = Array.isArray(values) ? values : [];
  if (rows.length === 0) return `Range ${range} is empty.`;
  const shown = rows.slice(0, MAX_READ_ROWS);
  const lines = shown.map((rawRow, index) => {
    const cells = Array.isArray(rawRow)
      ? rawRow.map((cell) => String(cell ?? "")).join(" | ")
      : String(rawRow ?? "");
    return `${index + 1}. ${cells}`;
  });
  const truncated =
    rows.length > shown.length ? `\n... ${rows.length - shown.length} more rows not shown.` : "";
  return `${range} (${shown.length} rows):\n${lines.join("\n")}${truncated}`;
}

/**
 * Esegue una lettura/scrittura su Google Sheets per conto di un tenant.
 * `params.values` è richiesto per updateValues/appendValues.
 */
export async function googleSheetsRequest(
  action: GoogleSheetsAction,
  params: {
    spreadsheetId?: string;
    range?: string;
    values?: unknown;
    valueInputOption?: string;
  },
  tenantId: string,
): Promise<GoogleSheetsResult> {
  const spreadsheetId = extractSpreadsheetId(params.spreadsheetId || "");
  const range = (params.range || "").trim();
  if (!spreadsheetId) return { ok: false, error: "A spreadsheet id (or URL) is required." };
  if (!range) return { ok: false, error: "A range (e.g. Sheet1!A1:C10) is required." };

  let values: string[][] | null = null;
  if (action !== "getValues") {
    values = normalizeValues(params.values);
    if (!values) {
      return {
        ok: false,
        error: `values must be a non-empty array of rows (max ${MAX_WRITE_CELLS} cells).`,
      };
    }
  }

  const token = await resolveGoogleSheetsToken(tenantId);
  if (!token) {
    return {
      ok: false,
      error:
        "No Google Sheets account connected. Ask the user to connect Google Sheets from the dashboard (Integrations), then retry.",
    };
  }

  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const valueInputOption = encodeURIComponent(params.valueInputOption || "USER_ENTERED");
  const headers: Record<string, string> = { Authorization: `Bearer ${token.accessToken}` };

  try {
    if (action === "getValues") {
      const res = await fetch(base, { headers });
      const json = (await res.json().catch(() => ({}))) as {
        values?: unknown;
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          ok: false,
          error: `Sheets API error: ${res.status} ${res.statusText} - ${json.error?.message ?? ""}`,
        };
      }
      return { ok: true, data: formatValues(range, json.values) };
    }

    if (action === "updateValues") {
      const res = await fetch(`${base}?valueInputOption=${valueInputOption}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ range, majorDimension: "ROWS", values }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        updatedRange?: string;
        updatedRows?: number;
        updatedCells?: number;
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          ok: false,
          error: `Sheets API error: ${res.status} ${res.statusText} - ${json.error?.message ?? ""}`,
        };
      }
      return {
        ok: true,
        data: `✅ Updated ${json.updatedRange ?? range} (${json.updatedRows ?? 0} rows, ${json.updatedCells ?? 0} cells).`,
      };
    }

    const res = await fetch(`${base}:append?valueInputOption=${valueInputOption}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ range, majorDimension: "ROWS", values }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      updates?: { updatedRange?: string; updatedRows?: number; updatedCells?: number };
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        error: `Sheets API error: ${res.status} ${res.statusText} - ${json.error?.message ?? ""}`,
      };
    }
    return {
      ok: true,
      data: `✅ Appended ${json.updates?.updatedRows ?? 0} rows at ${json.updates?.updatedRange ?? range}.`,
    };
  } catch (e) {
    return {
      ok: false,
      error: `Sheets network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
