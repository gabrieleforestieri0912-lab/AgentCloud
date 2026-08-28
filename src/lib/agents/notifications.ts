/**
 * Agent action notifications.
 *
 * While an agent runs it can perform actions with real side effects: creating
 * a file, publishing a product, generating a discount code, booking an event,
 * capturing a lead. Those are surfaced to the user as in-app notifications
 * (the bell in the Navbar) so they always know what their agents did.
 *
 * Deliberately, NOT every tool call notifies: read-only lookups (web_search,
 * scrape_page, read_file, calendar_search_availability, shopify_*_search ...)
 * are invisible steps, not actions. Only tools whose success means "something
 * changed / something was delivered" produce a notification.
 *
 * Server-only: `createAgentNotification` writes through the Supabase service
 * role client; `buildActionNotification` is pure so it can be unit-tested.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type AgentNotificationKind =
  | "file_created"
  | "product_created"
  | "discount_created"
  | "collection_updated"
  | "inventory_updated"
  | "event_booked"
  | "lead_submitted"
  | "lead_notified";

export const AGENT_NOTIFICATION_KINDS: AgentNotificationKind[] = [
  "file_created",
  "product_created",
  "discount_created",
  "collection_updated",
  "inventory_updated",
  "event_booked",
  "lead_submitted",
  "lead_notified",
];

/** Neutral, locale-agnostic params stored in the DB; the UI localizes them. */
export type AgentNotificationParams = Record<string, string | number>;

export type ActionNotification = {
  kind: AgentNotificationKind;
  params: AgentNotificationParams;
};

type ToolActionRule = {
  kind: AgentNotificationKind;
  /** The tool result string indicates the action actually succeeded. */
  success: (result: string) => boolean;
  params: (
    input: Record<string, string>,
    result: string,
  ) => AgentNotificationParams;
};

function matchGroup(result: string, re: RegExp): string | undefined {
  return result.match(re)?.[1]?.trim();
}

/**
 * Tool name → action rule. Read-only tools are intentionally absent: their
 * executions never produce a notification.
 */
const TOOL_ACTION_RULES: Record<string, ToolActionRule> = {
  write_file: {
    kind: "file_created",
    success: (r) => r.startsWith('{"type":"file_created"'),
    params: (input) => ({ filename: input.filename || "file" }),
  },

  shopify_create_product: {
    kind: "product_created",
    success: (r) => r.includes("created successfully"),
    params: (input) => ({
      title: input.title || "Prodotto",
      price: input.price || "",
    }),
  },

  shopify_create_discount: {
    kind: "discount_created",
    success: (r) => r.includes("Discount code created"),
    params: (input) => ({
      code: input.code || "",
      type: input.type || "percentage",
      value: input.value || "",
    }),
  },

  shopify_manage_collection: {
    kind: "collection_updated",
    success: (r) => r.includes("Collection updated"),
    params: (_input, r) => ({
      collection: matchGroup(r, /Collection:\s*(.+)/) ?? "collezione",
      action: r.includes("Added") ? "add" : "remove",
      count: Number(matchGroup(r, /(?:Added|Removed)\s+(\d+)\s+product/)) || 0,
    }),
  },

  shopify_update_inventory: {
    kind: "inventory_updated",
    success: (r) => r.includes("Inventory updated"),
    params: (_input, r) => ({
      product: matchGroup(r, /Product:\s*(.+)/) ?? "prodotto",
      previous: matchGroup(r, /Previous:\s*(\d+)/) ?? "0",
      new: matchGroup(r, /New:\s*(\d+)/) ?? "0",
    }),
  },

  calendar_book_event: {
    kind: "event_booked",
    success: (r) => r.startsWith("Event booked:"),
    params: (input) => ({
      title: input.title || "Evento",
      start: input.start_time || "",
    }),
  },

  lead_capture_submit: {
    kind: "lead_submitted",
    success: (r) => /Response: 2\d\d/.test(r),
    params: (input) => ({
      email: input.email || "",
      name: input.name || "",
    }),
  },

  lead_capture_notify_sales: {
    kind: "lead_notified",
    success: (r) => /Response: 2\d\d/.test(r),
    params: () => ({}),
  },
};

/**
 * Pure: decide whether a tool execution is an important action worth
 * notifying about. Returns null for read-only tools, failed executions, and
 * unknown tools.
 */
export function buildActionNotification(
  toolName: string,
  input: Record<string, string>,
  result: string,
): ActionNotification | null {
  const rule = TOOL_ACTION_RULES[toolName];
  if (!rule || !rule.success(result)) return null;
  return { kind: rule.kind, params: rule.params(input, result) };
}

/**
 * Persist an action notification for a user (best-effort — never throws).
 * Anonymous preview callers have no inbox and must be filtered by the caller.
 */
export async function createAgentNotification(input: {
  userId: string;
  agentSlug: string;
  kind: AgentNotificationKind;
  params?: AgentNotificationParams;
}): Promise<boolean> {
  const db = createAdminClient();
  if (!db) return false;

  const { error } = await db.from("agent_notifications").insert({
    user_id: input.userId,
    agent_slug: input.agentSlug,
    kind: input.kind,
    params: input.params ?? {},
  });

  if (error) {
    console.error("createAgentNotification failed:", error);
    return false;
  }
  return true;
}
