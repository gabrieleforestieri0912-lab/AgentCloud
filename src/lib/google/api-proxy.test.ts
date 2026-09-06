import { describe, expect, it } from "vitest";
import {
  normalizeCalendarEvent,
  normalizeEmailMessage,
} from "./api-proxy";
import { shouldRefreshToken } from "./token";

describe("normalizeEmailMessage", () => {
  it("extracts from, subject, date, and preview", () => {
    const out = normalizeEmailMessage({
      id: "abc123",
      snippet: "  Meeting moved to 3pm   tomorrow ",
      payload: {
        headers: [
          { name: "From", value: "Client <client@example.com>" },
          { name: "Subject", value: "Re: Quote follow-up" },
          { name: "Date", value: "Mon, 1 Sep 2026 09:00:00 +0000" },
        ],
      },
    });
    expect(out).toContain("From: Client <client@example.com>");
    expect(out).toContain("Subject: Re: Quote follow-up");
    expect(out).toContain("Date: Mon, 1 Sep 2026");
    expect(out).toContain("Preview: Meeting moved to 3pm tomorrow");
  });

  it("handles missing headers gracefully", () => {
    const out = normalizeEmailMessage({ id: "x", snippet: "" });
    expect(out).toContain("From: unknown");
    expect(out).toContain("Subject: (no subject)");
  });
});

describe("normalizeCalendarEvent", () => {
  it("formats a timed event with location and link", () => {
    const out = normalizeCalendarEvent({
      summary: "Client demo",
      start: { dateTime: "2026-09-10T14:00:00Z" },
      end: { dateTime: "2026-09-10T14:30:00Z" },
      location: "https://meet.google.com/abc",
      htmlLink: "https://calendar.google.com/event?id=1",
    });
    expect(out).toContain("Client demo");
    expect(out).toContain("2026-09-10T14:00:00Z");
    expect(out).toContain("https://meet.google.com/abc");
  });

  it("handles all-day events and missing fields", () => {
    const out = normalizeCalendarEvent({
      summary: "Holiday",
      start: { date: "2026-12-25" },
      end: { date: "2026-12-26" },
    });
    expect(out).toContain("Holiday");
    expect(out).toContain("2026-12-25");
    expect(out).not.toContain("Where:");
  });
});

describe("shouldRefreshToken", () => {
  it("refreshes when expired", () => {
    expect(shouldRefreshToken(new Date(Date.now() - 60_000).toISOString())).toBe(
      true,
    );
  });

  it("refreshes within the 5-minute margin", () => {
    expect(
      shouldRefreshToken(new Date(Date.now() + 4 * 60_000).toISOString()),
    ).toBe(true);
  });

  it("does not refresh a freshly issued token", () => {
    expect(
      shouldRefreshToken(new Date(Date.now() + 55 * 60_000).toISOString()),
    ).toBe(false);
  });

  it("refreshes when expiry is missing or malformed", () => {
    expect(shouldRefreshToken(null)).toBe(true);
    expect(shouldRefreshToken("not-a-date")).toBe(true);
  });
});