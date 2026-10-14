import { test } from "node:test";
import assert from "node:assert/strict";
import {
  categoryForKind,
  dedupeKeyFor,
  groupBadge,
  NOTIFICATION_CATEGORIES,
} from "../src/lib/notification-rules.ts";

test("ogni kind noto ha una categoria", () => {
  for (const kind of [
    "file_created", "product_created", "discount_created", "collection_updated",
    "inventory_updated", "store_created", "event_booked", "calendar_event_deleted",
    "calendar_reminder_set", "lead_submitted", "lead_notified", "invoice_created",
    "payment_reminder_sent", "email_sent", "email_trashed", "quote_sent",
    "review_replied", "post_scheduled", "quote_generated", "cv_analyzed",
  ]) {
    assert.ok(NOTIFICATION_CATEGORIES.includes(categoryForKind(kind)), kind);
  }
  assert.equal(categoryForKind("sconosciuto"), "runs");
});

test("dedupe: stessa entità stessa chiave", () => {
  assert.equal(
    dedupeKeyFor("lead_submitted", { email: "a@b.it", name: "X" }),
    dedupeKeyFor("lead_submitted", { email: "a@b.it", name: "Y" }),
  );
  assert.notEqual(
    dedupeKeyFor("lead_submitted", { email: "a@b.it" }),
    dedupeKeyFor("lead_submitted", { email: "c@d.it" }),
  );
});

test("dedupe: raffica di retry identici collassa, eventi diversi no", () => {
  // 20 retry dello stesso invio: una sola chiave.
  const keys = new Set(
    Array.from({ length: 20 }, () => dedupeKeyFor("email_sent", { to: "a@b.it", subject: "S" })),
  );
  assert.equal(keys.size, 1);
  // 20 lead diversi: 20 chiavi (giusto: sono 20 lead veri).
  const leadKeys = new Set(
    Array.from({ length: 20 }, (_, i) => dedupeKeyFor("lead_submitted", { email: `l${i}@x.it` })),
  );
  assert.equal(leadKeys.size, 20);
});

test("dedupe: senza identificativo niente chiave", () => {
  assert.equal(dedupeKeyFor("lead_notified", {}), null);
});

test("badge raggruppamento", () => {
  assert.equal(groupBadge(1), "");
  assert.equal(groupBadge(12), "×12");
});
