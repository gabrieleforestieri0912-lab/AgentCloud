/**
 * Subscription expiry notifications.
 *
 * When a user's subscription is about to expire (or has been set to cancel at
 * period end) we surface an in-app bell notification AND a transactional email
 * from AgentCloud. Detection is derived from the `user_agents` rows that the
 * Stripe webhook keeps in sync (`current_period_end`, `config.cancelAtPeriodEnd`).
 *
 * Email sending is idempotent per subscription via `config.renewalNotifiedAt`,
 * so re-running the check (cron or lazily on page load) never double-emails.
 *
 * Server-only: imports the Resend client and Supabase admin client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getResend } from "@/lib/resend";
import { FROM_EMAIL } from "@/lib/email-config";
import { getDictionary, t, type Dictionary } from "@/lib/i18n/dictionaries";
import { AGENTS } from "@/lib/agents";

/** Warn the user this many days before the subscription period ends. */
export const EXPIRY_WARNING_DAYS = 7;

const DAY_MS = 86_400_000;

export type UserAgentRow = {
  id: string;
  user_id: string;
  agent_slug: string;
  status: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  config: Record<string, unknown> | null;
};

export type SubscriptionNotification = {
  id: string;
  kind: "expiring" | "cancelling";
  agentSlug: string;
  agentName: string;
  periodEnd: string | null;
  daysLeft: number | null;
};

function agentName(slug: string): string {
  return AGENTS.find((a) => a.slug === slug)?.name ?? slug;
}

function daysUntil(iso: string | null, now: number): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - now) / DAY_MS);
}

export function isExpiringSoon(iso: string | null, now: number): boolean {
  const d = daysUntil(iso, now);
  return d !== null && d >= 0 && d <= EXPIRY_WARNING_DAYS;
}

/** Pure derivation of the in-app notifications for a user's agents. */
export function computeNotifications(
  rows: UserAgentRow[],
  now: number = Date.now(),
): SubscriptionNotification[] {
  const out: SubscriptionNotification[] = [];
  for (const row of rows) {
    if (row.status !== "active") continue;
    const config = (row.config ?? {}) as Record<string, unknown>;
    const cancelAtPeriodEnd = Boolean(config.cancelAtPeriodEnd);
    const periodEnd = row.current_period_end;

    if (cancelAtPeriodEnd) {
      out.push({
        id: row.id,
        kind: "cancelling",
        agentSlug: row.agent_slug,
        agentName: agentName(row.agent_slug),
        periodEnd,
        daysLeft: daysUntil(periodEnd, now),
      });
    } else if (isExpiringSoon(periodEnd, now)) {
      out.push({
        id: row.id,
        kind: "expiring",
        agentSlug: row.agent_slug,
        agentName: agentName(row.agent_slug),
        periodEnd,
        daysLeft: daysUntil(periodEnd, now),
      });
    }
  }
  return out;
}

function formatDate(iso: string | null, locale: "it" | "en"): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildEmail(
  dict: Dictionary,
  kind: "expiring" | "cancelling",
  name: string,
  agents: string[],
  periodEnd: string | null,
  daysLeft: number | null,
  locale: "it" | "en",
): { subject: string; html: string; text: string } {
  const date = formatDate(periodEnd, locale);
  const agentList = agents.join(", ");
  const portalUrl = "https://agentcloud.agency/dashboard";

  const subject =
    kind === "expiring"
      ? dict.notifications.email.expiringSubject
      : dict.notifications.email.cancellingSubject;
  const heading =
    kind === "expiring"
      ? dict.notifications.email.expiringHeading
      : dict.notifications.email.cancellingHeading;
  const body =
    kind === "expiring"
      ? t(dict.notifications.email.expiringBody, {
          name,
          agent: agentList,
          date,
          days: daysLeft ?? 0,
        })
      : t(dict.notifications.email.cancellingBody, {
          name,
          agent: agentList,
          date,
        });
  const cta = dict.notifications.email.cta;

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;background:#0a0a0a;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e5e5;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
        <div style="width:36px;height:36px;border-radius:10px;background:#7c3aed;"></div>
        <span style="font-size:18px;font-weight:700;color:#fff;">AgentCloud</span>
      </div>
      <h1 style="font-size:20px;line-height:1.4;color:#fff;margin:0 0 16px;">${heading}</h1>
      <p style="font-size:15px;line-height:1.6;color:#d4d4d4;margin:0 0 24px;">${body}</p>
      <a href="${portalUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:9999px;">${cta}</a>
      <p style="font-size:12px;line-height:1.6;color:#737373;margin:32px 0 0;">© 2026 AgentCloud — ${FROM_EMAIL.replace(/^.*<(.+)>$/, "$1")}</p>
    </div>
  </body>
</html>`;

  const text = `${heading}\n\n${body}\n\n${cta}: ${portalUrl}`;

  return { subject, html, text };
}

type SubGroup = {
  rows: UserAgentRow[];
  periodEnd: string | null;
  cancel: boolean;
};

/**
 * Best-effort: email the user about any subscription that is expiring within
 * the warning window or set to cancel at period end, once per subscription.
 * Idempotent via `config.renewalNotifiedAt` on each `user_agents` row.
 */
export async function notifyUserSubscriptions(
  db: SupabaseClient,
  userId: string,
  locale: "it" | "en" = "it",
  now: number = Date.now(),
): Promise<void> {
  const dict = getDictionary(locale);

  const { data: rows, error } = await db
    .from("user_agents")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error || !rows?.length) return;

  const subs = new Map<string, SubGroup>();
  for (const raw of rows as UserAgentRow[]) {
    const key = raw.stripe_subscription_id || raw.id;
    const cancel = Boolean((raw.config ?? {})?.cancelAtPeriodEnd);
    const entry = subs.get(key) ?? {
      rows: [],
      periodEnd: raw.current_period_end,
      cancel,
    };
    entry.rows.push(raw);
    entry.periodEnd = raw.current_period_end ?? entry.periodEnd;
    entry.cancel = entry.cancel || cancel;
    subs.set(key, entry);
  }

  const { data: userData } = await db.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (!email) return;

  const displayName =
    (userData?.user?.user_metadata?.full_name as string | undefined) ||
    email.split("@")[0];

  for (const [subId, sub] of subs) {
    const alreadyNotified = sub.rows.some(
      (r) => (r.config ?? {})?.renewalNotifiedAt,
    );
    const shouldNotify =
      (sub.cancel || isExpiringSoon(sub.periodEnd, now)) && !alreadyNotified;
    if (!shouldNotify) continue;

    const kind: "expiring" | "cancelling" = sub.cancel ? "cancelling" : "expiring";
    const { subject, html, text } = buildEmail(
      dict,
      kind,
      displayName,
      sub.rows.map((r) => agentName(r.agent_slug)),
      sub.periodEnd,
      daysUntil(sub.periodEnd, now),
      locale,
    );

    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
        text,
      });
    } catch (err) {
      console.error(
        `Failed to send expiry email for subscription ${subId}:`,
        err,
      );
      continue;
    }

    const ts = new Date().toISOString();
    for (const r of sub.rows) {
      const config = { ...(r.config ?? {}), renewalNotifiedAt: ts };
      await db.from("user_agents").update({ config }).eq("id", r.id);
    }
  }
}

/**
 * Scan every active subscription ending within the warning window and email
 * the owner once. Intended for a daily cron; the per-user lazy check in the
 * notifications API covers the same ground without needing cron infrastructure.
 */
export async function notifyAllExpiringSubscriptions(
  db: SupabaseClient,
  locale: "it" | "en" = "it",
  now: number = Date.now(),
): Promise<number> {
  const future = new Date(now + EXPIRY_WARNING_DAYS * DAY_MS).toISOString();
  const nowIso = new Date(now).toISOString();

  const { data } = await db
    .from("user_agents")
    .select("user_id")
    .eq("status", "active")
    .gte("current_period_end", nowIso)
    .lte("current_period_end", future);

  const userIds = new Set<string>();
  for (const r of (data ?? []) as { user_id: string }[]) userIds.add(r.user_id);

  for (const uid of userIds) {
    try {
      await notifyUserSubscriptions(db, uid, locale, now);
    } catch (err) {
      console.error(`Failed to notify user ${uid}:`, err);
    }
  }
  return userIds.size;
}
