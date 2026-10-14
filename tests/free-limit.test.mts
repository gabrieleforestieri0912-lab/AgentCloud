import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FREE_MESSAGES_PER_DAY,
  dayStartUTC,
  getNextResetAt,
  getRemainingFreeMessages,
  hasReachedFreeLimit,
} from "../src/lib/billing/free-window.ts";

test("limite globale: 5 al giorno", () => {
  assert.equal(FREE_MESSAGES_PER_DAY, 5);
  assert.equal(getRemainingFreeMessages(0), 5);
  assert.equal(getRemainingFreeMessages(3), 2);
  assert.equal(getRemainingFreeMessages(5), 0);
  assert.equal(getRemainingFreeMessages(99), 0);
  assert.equal(hasReachedFreeLimit(4), false);
  assert.equal(hasReachedFreeLimit(5), true);
  assert.equal(hasReachedFreeLimit(20), true);
});

test("finestra giornaliera UTC", () => {
  const start = dayStartUTC(new Date("2026-10-14T15:30:00+02:00"));
  assert.equal(start.toISOString(), "2026-10-14T00:00:00.000Z");
  const reset = getNextResetAt(new Date("2026-10-14T15:30:00+02:00"));
  assert.equal(reset.toISOString(), "2026-10-15T00:00:00.000Z");
});
