/**
 * Operazioni Microsoft Graph per Outlook (email + calendario), usate dai tool
 * `outlook_*` (vedi src/lib/agents/outlook-tools.ts).
 *
 * Perché un modulo e non chiamate inline: la serializzazione Graph (destinatari,
 * date con fuso, body HTML/testo, errori 403 per scope mancanti) è la parte che
 * sbaglia più facilmente, e qui è testabile senza token.
 *
 * Come gli altri moduli microsoft/*, questo file non importa `@/`: prende un
 * `GraphClient` già autenticato (vedi ./tenant.ts `outlookClientForTenant`) e
 * parla solo con Graph. Retry/backoff su 429 e 5xx: `providerRequest` dietro
 * `client.json`, che rispetta `Retry-After` (throttling Outlook: 10.000
 * richieste/10min per app+mailbox — i tool restano ampiamente sotto).
 *
 * Privacy: si legge solo ciò che serve alla richiesta corrente (niente
 * indicizzazione dei corpi, niente ricerche globali oltre il filtro dato).
 */

import type { GraphClient, GraphResult } from "./graph";

export type OutlookRecipient = { address: string; name?: string };

export type OutlookMessage = {
  id: string;
  subject: string;
  from?: string;
  to?: string[];
  receivedAt?: string;
  isRead?: boolean;
  preview?: string;
  body?: string;
  webLink?: string;
};

export type OutlookEvent = {
  id: string;
  subject: string;
  start?: string;
  end?: string;
  timeZone?: string;
  location?: string;
  attendees?: string[];
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
  webLink?: string;
};

type GraphCollection<T> = { value?: T[] };

function err(res: { ok: false; error: string }): GraphResult<never> {
  return res;
}

function asEmail(addr: unknown): string | undefined {
  if (!addr || typeof addr !== "object") return undefined;
  const a = (addr as Record<string, unknown>).emailAddress as
    | Record<string, unknown>
    | undefined;
  if (!a || typeof a.address !== "string") return undefined;
  return a.address;
}

function asMessage(json: unknown): OutlookMessage | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  if (typeof j.id !== "string") return null;
  const body = j.body as Record<string, unknown> | undefined;
  return {
    id: j.id,
    subject: typeof j.subject === "string" ? j.subject : "(senza oggetto)",
    from: asEmail(j.from),
    to: Array.isArray(j.toRecipients)
      ? j.toRecipients
          .map(asEmail)
          .filter((e): e is string => typeof e === "string")
      : undefined,
    receivedAt:
      typeof j.receivedDateTime === "string" ? j.receivedDateTime : undefined,
    isRead: typeof j.isRead === "boolean" ? j.isRead : undefined,
    preview: typeof j.bodyPreview === "string" ? j.bodyPreview : undefined,
    body: body && typeof body.content === "string" ? body.content : undefined,
    webLink: typeof j.webLink === "string" ? j.webLink : undefined,
  };
}

function asEvent(json: unknown): OutlookEvent | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  if (typeof j.id !== "string") return null;
  const start = j.start as Record<string, unknown> | undefined;
  const end = j.end as Record<string, unknown> | undefined;
  const loc = j.location as Record<string, unknown> | undefined;
  const online = j.onlineMeeting as Record<string, unknown> | undefined;
  return {
    id: j.id,
    subject: typeof j.subject === "string" ? j.subject : "(senza titolo)",
    start: start && typeof start.dateTime === "string" ? start.dateTime : undefined,
    end: end && typeof end.dateTime === "string" ? end.dateTime : undefined,
    timeZone:
      start && typeof start.timeZone === "string" ? start.timeZone : undefined,
    location:
      loc && typeof loc.displayName === "string" ? loc.displayName : undefined,
    attendees: Array.isArray(j.attendees)
      ? j.attendees
          .map(asEmail)
          .filter((e): e is string => typeof e === "string")
      : undefined,
    isOnlineMeeting:
      typeof j.isOnlineMeeting === "boolean" ? j.isOnlineMeeting : undefined,
    onlineMeetingUrl:
      online && typeof online.joinUrl === "string" ? online.joinUrl : undefined,
    webLink: typeof j.webLink === "string" ? j.webLink : undefined,
  };
}

function toRecipients(list: OutlookRecipient[]): { emailAddress: { address: string; name?: string } }[] {
  return list.map((r) => ({
    emailAddress: r.name ? { address: r.address, name: r.name } : { address: r.address },
  }));
}

function invalidScopeHint(error: string): string {
  // 403 con ErrorAccessDenied = il consenso non copre lo scope: succede quando
  // l'utente ha collegato Microsoft 365 (file) invece di Outlook. Il messaggio
  // guida alla riconnessione giusta invece di un generico "errore Graph".
  if (/access\s*denied|authorization_requestdenied|insufficient/i.test(error)) {
    return `${error} — Se hai collegato solo Microsoft 365 (file), collega anche Microsoft Outlook dalla dashboard Integrazioni: servono i permessi email/calendario.`;
  }
  return error;
}

/** Cerca messaggi con ricerca full-text di Graph ($search richiede header ConsistencyLevel). */
export async function searchMessages(
  client: GraphClient,
  query: string,
  limit = 20,
): Promise<GraphResult<OutlookMessage[]>> {
  const top = Math.min(50, Math.max(1, limit));
  const res = await client.json<GraphCollection<unknown>>(
    `/me/messages?$search=${encodeURIComponent(`"${query}"`)}&$top=${top}&$select=id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,webLink`,
    { headers: { ConsistencyLevel: "eventual" } },
  );
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  const items = (res.data.value ?? []).map(asMessage).filter((m): m is OutlookMessage => m !== null);
  return { ok: true, data: items };
}

/** Legge un messaggio completo (corpo incluso). */
export async function readMessage(
  client: GraphClient,
  messageId: string,
): Promise<GraphResult<OutlookMessage>> {
  const res = await client.json<unknown>(
    `/me/messages/${encodeURIComponent(messageId)}?$select=id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,body,webLink`,
  );
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  const msg = asMessage(res.data);
  if (!msg) return { ok: false, error: "Outlook: risposta messaggio inattesa" };
  return { ok: true, data: msg };
}

/** Ultimi messaggi non letti (cartella Posta in arrivo). */
export async function listUnread(
  client: GraphClient,
  limit = 20,
): Promise<GraphResult<OutlookMessage[]>> {
  const top = Math.min(50, Math.max(1, limit));
  const res = await client.json<GraphCollection<unknown>>(
    `/me/mailFolders/inbox/messages?$filter=isRead eq false&$orderby=receivedDateTime desc&$top=${top}&$select=id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,webLink`,
  );
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  const items = (res.data.value ?? []).map(asMessage).filter((m): m is OutlookMessage => m !== null);
  return { ok: true, data: items };
}

export type DraftInput = {
  to: OutlookRecipient[];
  cc?: OutlookRecipient[];
  subject: string;
  body: string;
  /** true = HTML, false = testo (default: testo). */
  isHtml?: boolean;
};

/** Crea una bozza (non invia). Ritorna id bozza + link. */
export async function createDraft(
  client: GraphClient,
  input: DraftInput,
): Promise<GraphResult<{ id: string; webLink?: string }>> {
  const res = await client.json<{ id?: unknown; webLink?: unknown }>(`/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: input.subject,
      body: { contentType: input.isHtml ? "HTML" : "Text", content: input.body },
      toRecipients: toRecipients(input.to),
      ...(input.cc?.length ? { ccRecipients: toRecipients(input.cc) } : {}),
    }),
  });
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  if (typeof res.data.id !== "string") {
    return { ok: false, error: "Outlook: risposta creazione bozza inattesa" };
  }
  return {
    ok: true,
    data: {
      id: res.data.id,
      webLink: typeof res.data.webLink === "string" ? res.data.webLink : undefined,
    },
  };
}

/** Crea una bozza di risposta a un messaggio (non invia). */
export async function createReplyDraft(
  client: GraphClient,
  messageId: string,
  body: string,
): Promise<GraphResult<{ id: string }>> {
  const res = await client.json<{ id?: unknown }>(
    `/me/messages/${encodeURIComponent(messageId)}/createReply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: { contentType: "Text", content: body } }),
    },
  );
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  if (typeof res.data.id !== "string") {
    return { ok: false, error: "Outlook: risposta creazione bozza di risposta inattesa" };
  }
  return { ok: true, data: { id: res.data.id } };
}

/**
 * Invia un messaggio (high risk: il tool richiede approvazione esplicita —
 * vedi tool-confirmation.ts — prima di arrivare qui).
 */
export async function sendMessage(
  client: GraphClient,
  input: DraftInput,
): Promise<GraphResult<{ sent: true }>> {
  const res = await client.json<unknown>(`/me/sendMail`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: { contentType: input.isHtml ? "HTML" : "Text", content: input.body },
        toRecipients: toRecipients(input.to),
        ...(input.cc?.length ? { ccRecipients: toRecipients(input.cc) } : {}),
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  return { ok: true, data: { sent: true as const } };
}

/** Eventi in un intervallo (calendarView richiede startDateTime/endDateTime). */
export async function listEvents(
  client: GraphClient,
  startDateTime: string,
  endDateTime: string,
  limit = 20,
): Promise<GraphResult<OutlookEvent[]>> {
  const top = Math.min(50, Math.max(1, limit));
  const res = await client.json<GraphCollection<unknown>>(
    `/me/calendarView?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$orderby=start/dateTime&$top=${top}&$select=id,subject,start,end,location,attendees,isOnlineMeeting,onlineMeeting,webLink`,
  );
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  const items = (res.data.value ?? []).map(asEvent).filter((e): e is OutlookEvent => e !== null);
  return { ok: true, data: items };
}

export type FreeBusyInput = {
  emails: string[];
  startDateTime: string;
  endDateTime: string;
};

/**
 * Disponibilità free/busy via getSchedule: non legge titoli né dettagli, solo
 * lo stato degli slot (minimizzazione dati per la scelta "quando sei libero?").
 */
export async function getFreeBusy(
  client: GraphClient,
  input: FreeBusyInput,
): Promise<GraphResult<{ email: string; status: { start: string; end: string; availability: string }[] }[]>> {
  const res = await client.json<{ value?: { scheduleId?: string; scheduleItems?: { start?: { dateTime?: string }; end?: { dateTime?: string }; status?: string }[] }[] }>(
    `/me/calendar/getSchedule`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schedules: input.emails,
        startTime: { dateTime: input.startDateTime, timeZone: "UTC" },
        endTime: { dateTime: input.endDateTime, timeZone: "UTC" },
        availabilityViewInterval: 30,
      }),
    },
  );
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  const out = (res.data.value ?? []).map((s) => ({
    email: typeof s.scheduleId === "string" ? s.scheduleId : "",
    status: (s.scheduleItems ?? []).map((it) => ({
      start: it.start?.dateTime ?? "",
      end: it.end?.dateTime ?? "",
      availability: typeof it.status === "string" ? it.status : "unknown",
    })),
  }));
  return { ok: true, data: out };
}

export type CreateEventInput = {
  subject: string;
  start: string;
  end: string;
  timeZone?: string;
  location?: string;
  attendees?: OutlookRecipient[];
  body?: string;
  /** true = riunione Teams (solo se l'account lo supporta, altrimenti l'evento resta senza link). */
  onlineMeeting?: boolean;
  reminderMinutes?: number;
};

/** Crea un evento. Il link Teams arriva solo se l'account lo supporta. */
export async function createEvent(
  client: GraphClient,
  input: CreateEventInput,
): Promise<GraphResult<OutlookEvent>> {
  const res = await client.json<unknown>(`/me/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: input.subject,
      start: { dateTime: input.start, timeZone: input.timeZone ?? "UTC" },
      end: { dateTime: input.end, timeZone: input.timeZone ?? "UTC" },
      ...(input.location ? { location: { displayName: input.location } } : {}),
      ...(input.attendees?.length
        ? {
            attendees: input.attendees.map((a) => ({
              emailAddress: { address: a.address, ...(a.name ? { name: a.name } : {}) },
              type: "required",
            })),
          }
        : {}),
      ...(input.body ? { body: { contentType: "Text", content: input.body } } : {}),
      ...(input.onlineMeeting ? { isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness" } : {}),
      ...(typeof input.reminderMinutes === "number"
        ? { reminderMinutesBeforeStart: input.reminderMinutes, isReminderOn: true }
        : {}),
    }),
  });
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  const evt = asEvent(res.data);
  if (!evt) return { ok: false, error: "Outlook: risposta creazione evento inattesa" };
  return { ok: true, data: evt };
}

/** Aggiorna un evento esistente (solo i campi passati). */
export async function updateEvent(
  client: GraphClient,
  eventId: string,
  patch: Partial<CreateEventInput>,
): Promise<GraphResult<OutlookEvent>> {
  const body: Record<string, unknown> = {};
  if (patch.subject !== undefined) body.subject = patch.subject;
  if (patch.start !== undefined)
    body.start = { dateTime: patch.start, timeZone: patch.timeZone ?? "UTC" };
  if (patch.end !== undefined)
    body.end = { dateTime: patch.end, timeZone: patch.timeZone ?? "UTC" };
  if (patch.location !== undefined) body.location = { displayName: patch.location };
  if (patch.attendees !== undefined)
    body.attendees = patch.attendees.map((a) => ({
      emailAddress: { address: a.address, ...(a.name ? { name: a.name } : {}) },
      type: "required",
    }));
  if (patch.body !== undefined) body.body = { contentType: "Text", content: patch.body };
  if (typeof patch.reminderMinutes === "number") {
    body.reminderMinutesBeforeStart = patch.reminderMinutes;
    body.isReminderOn = true;
  }
  const res = await client.json<unknown>(`/me/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  const evt = asEvent(res.data);
  if (!evt) return { ok: false, error: "Outlook: risposta aggiornamento evento inattesa" };
  return { ok: true, data: evt };
}

/**
 * Cancella un evento (medium risk + approvazione: vedi tool-confirmation.ts —
 * una cancellazione sbagliata perde la riunione per tutti gli invitati).
 */
export async function cancelEvent(
  client: GraphClient,
  eventId: string,
): Promise<GraphResult<{ cancelled: true }>> {
  const res = await client.json<unknown>(`/me/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  if (!res.ok) return err({ ok: false, error: invalidScopeHint(res.error) });
  return { ok: true, data: { cancelled: true as const } };
}
