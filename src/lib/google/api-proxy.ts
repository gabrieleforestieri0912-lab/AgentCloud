import { getValidGoogleAccessToken } from "./token";

/**
 * Phase 3 — typed Google API proxy (read-only).
 *
 * Central access point for Gmail + Google Calendar. Resolves the caller's
 * OAuth token (with automatic refresh) and calls the Google REST APIs,
 * returning normalized, compact results. The AI agents never touch tokens or
 * raw HTTP — they always go through this module (and its HTTP wrapper at
 * /api/google/proxy).
 *
 * Actions (Fase 1-4 scope, read-only):
 *   - list_emails(query?, max_results?)            → Gmail
 *   - get_calendar_events(date_from, date_to)      → Calendar
 */

export type GoogleProxyAction = "list_emails" | "get_calendar_events";

export type GoogleProxyResult = { ok: true; data: unknown } | { ok: false; error: string };

const MAX_EMAILS = 20;
const MAX_EVENTS = 50;
const MAX_CALENDAR_RANGE_DAYS = 31;

/** Normalize a Gmail message into a compact readable block. */
export function normalizeEmailMessage(
  msg: { id?: string; snippet?: string; payload?: { headers?: Array<{ name?: string; value?: string }> } },
): string {
  const headers = msg.payload?.headers ?? [];
  const get = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    "";
  return [
    `From: ${get("From") || "unknown"}`,
    `Subject: ${get("Subject") || "(no subject)"}`,
    `Date: ${get("Date") || ""}`,
    `Preview: ${(msg.snippet || "").replace(/\s+/g, " ").trim().slice(0, 200)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Normalize a Calendar event into a compact readable block. */
export function normalizeCalendarEvent(
  ev: {
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    location?: string;
    htmlLink?: string;
  },
): string {
  const start = ev.start?.dateTime || ev.start?.date || "unknown";
  const end = ev.end?.dateTime || ev.end?.date || "";
  return [
    `${ev.summary || "(untitled event)"}`,
    `When: ${start}${end ? ` → ${end}` : ""}`,
    ev.location ? `Where: ${ev.location}` : null,
    ev.htmlLink ? `Link: ${ev.htmlLink}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

export async function googleApiProxy(
  action: GoogleProxyAction,
  params: Record<string, string>,
  userId: string,
): Promise<GoogleProxyResult> {
  const token = await getValidGoogleAccessToken(userId);
  if (!token) {
    return {
      ok: false,
      error:
        "No Google account connected. Ask the user to connect Gmail and Calendar from the dashboard settings (OAuth), then retry.",
    };
  }

  switch (action) {
    case "list_emails": {
      const query = (params.query || "").trim();
      const maxResults = Math.min(
        MAX_EMAILS,
        Math.max(1, Number(params.max_results) || 10),
      );
      try {
        const qs = new URLSearchParams({
          maxResults: String(maxResults),
        });
        if (query) qs.set("q", query);
        const listRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?${qs.toString()}`,
          { headers: { Authorization: `Bearer ${token.accessToken}` } },
        );
        if (!listRes.ok) {
          return {
            ok: false,
            error: `Gmail API error: ${listRes.status} ${listRes.statusText}`,
          };
        }
        const listJson = (await listRes.json()) as {
          messages?: Array<{ id: string }>;
        };
        const messages = listJson.messages ?? [];
        if (messages.length === 0) {
          return { ok: true, data: "No emails found." };
        }

        const details = await Promise.all(
          messages.map(async (m) => {
            const res = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
              { headers: { Authorization: `Bearer ${token.accessToken}` } },
            );
            if (!res.ok) return null;
            return (await res.json()) as Parameters<typeof normalizeEmailMessage>[0];
          }),
        );
        const valid = details.filter(
          (d): d is NonNullable<typeof d> => d !== null,
        );
        if (valid.length === 0) {
          return {
            ok: false,
            error: "Emails were found but their details could not be loaded.",
          };
        }
        return {
          ok: true,
          data: valid.map(normalizeEmailMessage).join("\n\n"),
        };
      } catch (e) {
        return {
          ok: false,
          error: `Gmail network error: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    case "get_calendar_events": {
      const dateFrom = params.date_from || "";
      const dateTo = params.date_to || "";
      if (!dateFrom || !dateTo) {
        return {
          ok: false,
          error: "get_calendar_events requires date_from and date_to.",
        };
      }
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return {
          ok: false,
          error: "get_calendar_events requires valid ISO date strings.",
        };
      }
      if (to <= from) {
        return { ok: false, error: "date_to must be after date_from." };
      }
      if (to.getTime() - from.getTime() > 1000 * 60 * 60 * 24 * MAX_CALENDAR_RANGE_DAYS) {
        return {
          ok: false,
          error: `Requested calendar range cannot exceed ${MAX_CALENDAR_RANGE_DAYS} days.`,
        };
      }
      try {
        const qs = new URLSearchParams({
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: String(MAX_EVENTS),
        });
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?${qs.toString()}`,
          { headers: { Authorization: `Bearer ${token.accessToken}` } },
        );
        if (!res.ok) {
          return {
            ok: false,
            error: `Calendar API error: ${res.status} ${res.statusText}`,
          };
        }
        const json = (await res.json()) as { items?: Parameters<typeof normalizeCalendarEvent>[0][] };
        const items = json.items ?? [];
        if (items.length === 0) {
          return { ok: true, data: "No events in the requested range." };
        }
        return { ok: true, data: items.map(normalizeCalendarEvent).join("\n\n") };
      } catch (e) {
        return {
          ok: false,
          error: `Calendar network error: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    default:
      return { ok: false, error: `Unknown Google action: ${String(action)}` };
  }
}