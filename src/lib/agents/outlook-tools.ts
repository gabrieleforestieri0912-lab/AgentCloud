/**
 * Tool agente per Microsoft Outlook (email + calendario) via Microsoft Graph.
 *
 * Perché un modulo dedicato: come microsoft-tools.ts per Word/Excel, raccoglie
 * definizioni + handler e conversioni input→Graph, che è la parte che sbaglia
 * più facilmente (il modello manda JSON, non stringhe).
 *
 * Rischio e approvazione: le letture e le bozze non chiedono conferma; gli invii
 * e le cancellazioni sì (`toolRequiresConfirmation` in tool-confirmation.ts —
 * outlook_send_message, outlook_cancel_event). Le descrizioni dei tool high lo
 * dicono esplicitamente al modello, così propone l'approvazione invece di
 * presumere l'invio.
 *
 * Il client Graph arriva da `outlookClientForTenant` (provider
 * `microsoft_outlook`, consenso incrementale separato da Microsoft 365 file).
 */

import type { LLMTool } from "@/lib/llm";
import { outlookClientForTenant } from "@/lib/integrations/microsoft/tenant";
import {
  searchMessages,
  readMessage,
  listUnread,
  createDraft,
  createReplyDraft,
  sendMessage,
  listEvents,
  getFreeBusy,
  createEvent,
  updateEvent,
  cancelEvent,
  type OutlookRecipient,
} from "@/lib/integrations/microsoft/outlook";

export const OUTLOOK_TOOL_NAMES = [
  "outlook_search_messages",
  "outlook_read_message",
  "outlook_list_unread",
  "outlook_create_draft",
  "outlook_create_reply_draft",
  "outlook_send_message",
  "outlook_list_events",
  "outlook_get_free_busy",
  "outlook_create_event",
  "outlook_update_event",
  "outlook_cancel_event",
] as const;

export function isOutlookTool(name: string): boolean {
  return (OUTLOOK_TOOL_NAMES as readonly string[]).includes(name);
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function parseLimit(value: unknown, fallback = 20): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(50, Math.max(1, Math.floor(n)));
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Il modello manda i destinatari come array di stringhe, array di oggetti o
 * singola stringa separata da virgole/punto e virgola. Si accetta tutto e si
 * scartano le email malformate (meglio una bozza senza un destinatario errato
 * che un 400 di Graph).
 */
function asRecipients(value: unknown): OutlookRecipient[] {
  const raw: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? value.split(/[,;]/)
      : [];
  const out: OutlookRecipient[] = [];
  for (const r of raw) {
    if (typeof r === "string") {
      const address = r.trim().slice(0, 200);
      if (address && isValidEmail(address)) out.push({ address });
    } else if (r && typeof r === "object") {
      const o = r as Record<string, unknown>;
      const address = String(o.address ?? o.email ?? "").trim().slice(0, 200);
      const name =
        typeof o.name === "string" ? o.name.trim().slice(0, 100) : undefined;
      if (address && isValidEmail(address)) out.push({ address, name });
    }
  }
  return out;
}

/** Campi obbligatori (solo stringhe semplici: array/oggetti validati nel case). */
const REQUIRED_FIELDS: Record<string, string[]> = {
  outlook_read_message: ["messageId"],
  outlook_create_draft: ["subject", "body"],
  outlook_create_reply_draft: ["messageId", "body"],
  outlook_send_message: ["subject", "body"],
  outlook_list_events: ["start", "end"],
  outlook_get_free_busy: ["start", "end"],
  outlook_create_event: ["subject", "start", "end"],
  outlook_update_event: ["eventId"],
  outlook_cancel_event: ["eventId"],
};

/**
 * Validazione fail-fast PRIMA di risolvere il token: se manca un campo
 * l'errore utile è "manca X", non "Outlook non è collegato".
 */
function missingRequired(name: string, input: Record<string, unknown>): string | null {
  const required = REQUIRED_FIELDS[name];
  if (!required) return null;
  const miss = required.filter((k) => !clean(input[k], 1));
  return miss.length ? `${name} requires ${miss.join(", ")}.` : null;
}

export const OUTLOOK_TOOL_DEFINITIONS: Record<string, LLMTool> = {
  outlook_search_messages: {
    name: "outlook_search_messages",
    description:
      "Search the connected Outlook mailbox (subject/body/sender). Returns id, subject, sender, date and preview — use the id with outlook_read_message. Read-only: never invent inbox content.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words to search for, e.g. 'fattura Rossi'" },
        limit: { type: "integer", description: "Max messages (default 20, max 50)" },
      },
      required: ["query"],
    },
  },
  outlook_read_message: {
    name: "outlook_read_message",
    description: "Read one Outlook message by id (full body included). Get the id from outlook_search_messages or outlook_list_unread.",
    input_schema: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "Outlook message id" },
      },
      required: ["messageId"],
    },
  },
  outlook_list_unread: {
    name: "outlook_list_unread",
    description: "List unread messages in the Outlook inbox, newest first. Read-only triage starting point.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max messages (default 20, max 50)" },
      },
    },
  },
  outlook_create_draft: {
    name: "outlook_create_draft",
    description:
      "Create an email DRAFT in Outlook. It does NOT send: the user reviews and sends it from Outlook. Provide to (array of emails), subject and body.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "array", description: "Recipient emails", items: { type: "string" } },
        cc: { type: "array", description: "CC emails (optional)", items: { type: "string" } },
        subject: { type: "string", maxLength: 200 },
        body: { type: "string", description: "Email body (plain text)" },
      },
      required: ["to", "subject", "body"],
    },
  },
  outlook_create_reply_draft: {
    name: "outlook_create_reply_draft",
    description:
      "Create a reply DRAFT to an Outlook message. It does NOT send. Get messageId from search/unread first.",
    input_schema: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "Outlook message id to reply to" },
        body: { type: "string", description: "Reply body (plain text)" },
      },
      required: ["messageId", "body"],
    },
  },
  outlook_send_message: {
    name: "outlook_send_message",
    description:
      "SEND an email from Outlook. Requires explicit user confirmation before running: always show to/subject/body and get a clear 'send/invia' approval first, then call. Never send without approval.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "array", description: "Recipient emails", items: { type: "string" } },
        cc: { type: "array", description: "CC emails (optional)", items: { type: "string" } },
        subject: { type: "string", maxLength: 200 },
        body: { type: "string", description: "Email body (plain text)" },
      },
      required: ["to", "subject", "body"],
    },
  },
  outlook_list_events: {
    name: "outlook_list_events",
    description:
      "List Outlook calendar events in a date range (ISO datetimes). Returns id, subject, start/end, location, attendees and meeting link.",
    input_schema: {
      type: "object",
      properties: {
        start: { type: "string", description: "Range start, ISO e.g. 2026-10-14T00:00:00" },
        end: { type: "string", description: "Range end, ISO e.g. 2026-10-21T00:00:00" },
        limit: { type: "integer", description: "Max events (default 20, max 50)" },
      },
      required: ["start", "end"],
    },
  },
  outlook_get_free_busy: {
    name: "outlook_get_free_busy",
    description:
      "Check free/busy availability for email addresses in a time range. Returns only slot status (free/busy), not event details — use this to propose meeting times.",
    input_schema: {
      type: "object",
      properties: {
        emails: { type: "array", description: "Emails to check", items: { type: "string" } },
        start: { type: "string", description: "Range start, ISO" },
        end: { type: "string", description: "Range end, ISO" },
      },
      required: ["emails", "start", "end"],
    },
  },
  outlook_create_event: {
    name: "outlook_create_event",
    description:
      "Create an Outlook calendar event. Set onlineMeeting true for a Teams meeting (link only if the account supports it, otherwise the event is created without a link — never invent one).",
    input_schema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        start: { type: "string", description: "Start, ISO e.g. 2026-10-15T15:30:00" },
        end: { type: "string", description: "End, ISO" },
        timeZone: { type: "string", description: "IANA zone, e.g. Europe/Rome (default UTC)" },
        location: { type: "string" },
        attendees: { type: "array", description: "Attendee emails", items: { type: "string" } },
        body: { type: "string", description: "Event description (optional)" },
        onlineMeeting: { type: "boolean", description: "Create as Teams meeting" },
        reminderMinutes: { type: "integer", description: "Reminder before start (optional)" },
      },
      required: ["subject", "start", "end"],
    },
  },
  outlook_update_event: {
    name: "outlook_update_event",
    description:
      "Update an existing Outlook event (only the fields given change). Get eventId from outlook_list_events first.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        subject: { type: "string" },
        start: { type: "string", description: "New start, ISO" },
        end: { type: "string", description: "New end, ISO" },
        location: { type: "string" },
        body: { type: "string" },
        reminderMinutes: { type: "integer" },
      },
      required: ["eventId"],
    },
  },
  outlook_cancel_event: {
    name: "outlook_cancel_event",
    description:
      "CANCEL (delete) an Outlook event. Requires explicit user confirmation before running: cancelling notifies all attendees. Get eventId from outlook_list_events first.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
      },
      required: ["eventId"],
    },
  },
};

function fmtMsg(m: { subject: string; from?: string; receivedAt?: string; preview?: string; id: string; webLink?: string }): string {
  return `- ${m.subject} — da ${m.from ?? "?"} (${m.receivedAt ?? "?"})${m.preview ? `\n  ${m.preview.slice(0, 200)}` : ""}\n  id: ${m.id}${m.webLink ? ` — ${m.webLink}` : ""}`;
}

function fmtEvt(e: { subject: string; start?: string; end?: string; location?: string; attendees?: string[]; onlineMeetingUrl?: string; id: string; webLink?: string }): string {
  const when = `${e.start ?? "?"} → ${e.end ?? "?"}`;
  return `- ${e.subject} — ${when}${e.location ? ` @ ${e.location}` : ""}${e.attendees?.length ? ` (invitati: ${e.attendees.join(", ")})` : ""}${e.onlineMeetingUrl ? `\n  Teams: ${e.onlineMeetingUrl}` : ""}\n  id: ${e.id}${e.webLink ? ` — ${e.webLink}` : ""}`;
}

/** Esegue un tool Outlook. Input difensivo: un argomento malformato non deve far esplodere il loop. */
export async function executeOutlookTool(
  name: string,
  input: Record<string, unknown>,
  tenantId: string,
): Promise<string> {
  const missing = missingRequired(name, input);
  if (missing) return missing;

  const client = await outlookClientForTenant(tenantId);
  if (!client.ok) return client.error;
  const g = client.data;

  switch (name) {
    case "outlook_search_messages": {
      const query = clean(input.query, 200);
      if (!query) return "outlook_search_messages requires query.";
      const r = await searchMessages(g, query, parseLimit(input.limit));
      if (!r.ok) return r.error;
      if (r.data.length === 0) return "No Outlook messages found.";
      return r.data.map(fmtMsg).join("\n");
    }

    case "outlook_read_message": {
      const r = await readMessage(g, clean(input.messageId, 300));
      if (!r.ok) return r.error;
      const m = r.data;
      return `${m.subject}\nDa: ${m.from ?? "?"}\nData: ${m.receivedAt ?? "?"}\n\n${m.body ?? m.preview ?? "(vuoto)"}`;
    }

    case "outlook_list_unread": {
      const r = await listUnread(g, parseLimit(input.limit));
      if (!r.ok) return r.error;
      if (r.data.length === 0) return "No unread messages in Outlook.";
      return r.data.map(fmtMsg).join("\n");
    }

    case "outlook_create_draft": {
      const to = asRecipients(input.to);
      if (to.length === 0) return "outlook_create_draft requires at least one valid email in to.";
      const r = await createDraft(g, {
        to,
        cc: asRecipients(input.cc),
        subject: clean(input.subject, 200),
        body: clean(input.body, 20000),
      });
      if (!r.ok) return r.error;
      return `Bozza creata (id: ${r.data.id})${r.data.webLink ? ` — ${r.data.webLink}` : ""}. Non inviata: rivedila in Outlook.`;
    }

    case "outlook_create_reply_draft": {
      const r = await createReplyDraft(g, clean(input.messageId, 300), clean(input.body, 20000));
      if (!r.ok) return r.error;
      return `Bozza di risposta creata (id: ${r.data.id}). Non inviata: rivedila in Outlook.`;
    }

    case "outlook_send_message": {
      const to = asRecipients(input.to);
      if (to.length === 0) return "outlook_send_message requires at least one valid email in to.";
      const r = await sendMessage(g, {
        to,
        cc: asRecipients(input.cc),
        subject: clean(input.subject, 200),
        body: clean(input.body, 20000),
      });
      if (!r.ok) return r.error;
      return `Email inviata a ${to.map((t) => t.address).join(", ")}.`;
    }

    case "outlook_list_events": {
      const r = await listEvents(g, clean(input.start, 40), clean(input.end, 40), parseLimit(input.limit));
      if (!r.ok) return r.error;
      if (r.data.length === 0) return "No Outlook events in this range.";
      return r.data.map(fmtEvt).join("\n");
    }

    case "outlook_get_free_busy": {
      const emails = asRecipients(input.emails).map((r) => r.address);
      if (emails.length === 0) return "outlook_get_free_busy requires at least one valid email.";
      const r = await getFreeBusy(g, {
        emails,
        startDateTime: clean(input.start, 40),
        endDateTime: clean(input.end, 40),
      });
      if (!r.ok) return r.error;
      return r.data
        .map((s) => `${s.email}:\n${s.status.map((it) => `  ${it.start} → ${it.end}: ${it.availability}`).join("\n") || "  (nessuno slot)"}`)
        .join("\n");
    }

    case "outlook_create_event": {
      const attendees = asRecipients(input.attendees);
      const reminder =
        input.reminderMinutes !== undefined ? Number(input.reminderMinutes) : undefined;
      const r = await createEvent(g, {
        subject: clean(input.subject, 200),
        start: clean(input.start, 40),
        end: clean(input.end, 40),
        timeZone: clean(input.timeZone, 60) || undefined,
        location: clean(input.location, 200) || undefined,
        attendees: attendees.length ? attendees : undefined,
        body: clean(input.body, 8000) || undefined,
        onlineMeeting: input.onlineMeeting === true,
        reminderMinutes: Number.isFinite(reminder) ? reminder : undefined,
      });
      if (!r.ok) return r.error;
      return `Evento creato:\n${fmtEvt(r.data)}`;
    }

    case "outlook_update_event": {
      const patch: Parameters<typeof updateEvent>[2] = {};
      if (clean(input.subject, 1)) patch.subject = clean(input.subject, 200);
      if (clean(input.start, 1)) patch.start = clean(input.start, 40);
      if (clean(input.end, 1)) patch.end = clean(input.end, 40);
      if (clean(input.location, 1)) patch.location = clean(input.location, 200);
      if (clean(input.body, 1)) patch.body = clean(input.body, 8000);
      if (input.reminderMinutes !== undefined && Number.isFinite(Number(input.reminderMinutes))) {
        patch.reminderMinutes = Number(input.reminderMinutes);
      }
      if (Object.keys(patch).length === 0) {
        return "outlook_update_event requires at least one field to update.";
      }
      const r = await updateEvent(g, clean(input.eventId, 300), patch);
      if (!r.ok) return r.error;
      return `Evento aggiornato:\n${fmtEvt(r.data)}`;
    }

    case "outlook_cancel_event": {
      const r = await cancelEvent(g, clean(input.eventId, 300));
      if (!r.ok) return r.error;
      return "Evento cancellato. Gli invitati sono stati avvisati.";
    }

    default:
      return `Tool "${name}" is not implemented`;
  }
}
