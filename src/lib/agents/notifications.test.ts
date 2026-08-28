import { describe, it, expect } from "vitest";
import {
  buildActionNotification,
  createAgentNotification,
  AGENT_NOTIFICATION_KINDS,
} from "./notifications";

describe("buildActionNotification", () => {
  it("notifies when a file is created", () => {
    const note = buildActionNotification(
      "write_file",
      { filename: "report.pdf", content: "..." },
      '{"type":"file_created","filename":"report.pdf","content":"...","downloadable":true}',
    );
    expect(note).toEqual({
      kind: "file_created",
      params: { filename: "report.pdf" },
    });
  });

  it("does not notify when file creation failed", () => {
    expect(
      buildActionNotification("write_file", { filename: "a.txt" }, "error"),
    ).toBeNull();
  });

  it("notifies when a Shopify product is published", () => {
    const note = buildActionNotification(
      "shopify_create_product",
      { title: "T-shirt", price: "29.99" },
      "✅ Product created successfully!\nTitle: T-shirt\nPrice: 29.99",
    );
    expect(note).toEqual({
      kind: "product_created",
      params: { title: "T-shirt", price: "29.99" },
    });
  });

  it("does not notify when product creation failed", () => {
    expect(
      buildActionNotification(
        "shopify_create_product",
        { title: "X" },
        "Product creation failed: invalid price",
      ),
    ).toBeNull();
  });

  it("notifies when a discount code is created", () => {
    const note = buildActionNotification(
      "shopify_create_discount",
      { code: "SUMMER20", type: "percentage", value: "20" },
      "✅ Discount code created!\nCode: SUMMER20",
    );
    expect(note).toEqual({
      kind: "discount_created",
      params: { code: "SUMMER20", type: "percentage", value: "20" },
    });
  });

  it("notifies when products are added to a collection", () => {
    const result = [
      "✅ Collection updated!",
      "Collection: Summer Picks",
      "Action: Added 3 product(s)",
    ].join("\n");
    const note = buildActionNotification(
      "shopify_manage_collection",
      { collection_id: "gid://x/1", product_ids: "a,b,c", action: "add" },
      result,
    );
    expect(note).toEqual({
      kind: "collection_updated",
      params: { collection: "Summer Picks", action: "add", count: 3 },
    });
  });

  it("notifies with the remove action when products are removed", () => {
    const result = [
      "✅ Collection updated!",
      "Collection: Summer Picks",
      "Action: Removed 1 product(s)",
    ].join("\n");
    const note = buildActionNotification(
      "shopify_manage_collection",
      { action: "remove" },
      result,
    );
    expect(note?.params).toMatchObject({ action: "remove", count: 1 });
  });

  it("notifies when inventory is updated", () => {
    const result = [
      "✅ Inventory updated!",
      "Product: T-shirt",
      "Variant: Default",
      "Previous: 10 units",
      "New: 8 units",
      "Delta: -2 units",
    ].join("\n");
    const note = buildActionNotification(
      "shopify_update_inventory",
      { variant_id: "gid://x/1", quantity: "8" },
      result,
    );
    expect(note).toEqual({
      kind: "inventory_updated",
      params: { product: "T-shirt", previous: "10", new: "8" },
    });
  });

  it("notifies when a calendar event is booked", () => {
    const note = buildActionNotification(
      "calendar_book_event",
      { title: "Demo call", start_time: "2026-09-01T10:00:00Z" },
      "Event booked: Demo call\nStart: 2026-09-01T10:00:00Z\nEnd: 2026-09-01T11:00:00Z",
    );
    expect(note).toEqual({
      kind: "event_booked",
      params: { title: "Demo call", start: "2026-09-01T10:00:00Z" },
    });
  });

  it("does not notify when booking failed", () => {
    expect(
      buildActionNotification(
        "calendar_book_event",
        { title: "Demo" },
        "Calendar booking failed: 403 Forbidden",
      ),
    ).toBeNull();
  });

  it("notifies when a lead is submitted successfully", () => {
    const note = buildActionNotification(
      "lead_capture_submit",
      { name: "Ada", email: "ada@example.com" },
      "Lead submitted to endpoint. Response: 201 Created\n{}",
    );
    expect(note).toEqual({
      kind: "lead_submitted",
      params: { name: "Ada", email: "ada@example.com" },
    });
  });

  it("does not notify when lead submission failed", () => {
    expect(
      buildActionNotification(
        "lead_capture_submit",
        { email: "ada@example.com" },
        "Lead submitted to endpoint. Response: 500 Server Error\n{}",
      ),
    ).toBeNull();
  });

  it("notifies when the sales team is alerted", () => {
    const note = buildActionNotification(
      "lead_capture_notify_sales",
      { lead_details: "Ada, CEO at Acme" },
      "Sales notification sent. Response: 200 OK\nok",
    );
    expect(note).toEqual({ kind: "lead_notified", params: {} });
  });

  it("never notifies for read-only tools", () => {
    const readOnly = [
      ["web_search", { query: "pizza" }, "Title: Pizza\nURL: https://example.com"],
      ["scrape_page", { url: "https://example.com" }, "Page content"],
      ["read_file", { filename: "a.txt" }, "file content"],
      ["shopify_search_products", { query: "tshirt" }, "Title: T-shirt"],
      ["shopify_get_order_status", {}, "Order: #1001"],
      ["calendar_search_availability", {}, "No busy slots found"],
      ["lead_capture_enrich", { email: "a@b.com" }, "Lead enrichment response: 200 OK"],
      ["run_python", { code: "1+1" }, "2"],
    ] as const;
    for (const [tool, input, result] of readOnly) {
      expect(
        buildActionNotification(tool, input as Record<string, string>, result),
      ).toBeNull();
    }
  });

  it("returns null for unknown tools", () => {
    expect(
      buildActionNotification("some_future_tool", {}, "ok"),
    ).toBeNull();
  });

  it("exposes a complete, stable kind list", () => {
    expect(AGENT_NOTIFICATION_KINDS).toContain("file_created");
    expect(AGENT_NOTIFICATION_KINDS).toContain("product_created");
    expect(AGENT_NOTIFICATION_KINDS).toContain("event_booked");
    expect(AGENT_NOTIFICATION_KINDS).toContain("lead_submitted");
  });
});

describe("createAgentNotification", () => {
  it("degrades gracefully without Supabase credentials", async () => {
    // No SUPABASE_SERVICE_ROLE_KEY in the test env → admin client is null.
    const ok = await createAgentNotification({
      userId: "u1",
      agentSlug: "support-agent",
      kind: "file_created",
      params: { filename: "report.pdf" },
    });
    expect(ok).toBe(false);
  });
});
