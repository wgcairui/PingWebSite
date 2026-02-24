/**
 * Tests for checkSite (src/monitor.ts)
 *
 * Scenario A – site is UP             → state resets, no SMS
 * Scenario B – site DOWN, below threshold → no SMS yet
 * Scenario C – site DOWN, hits threshold  → real SMS to 15337364316
 *
 * Run: bun test src/monitor.test.ts
 */
import { test, expect, spyOn, beforeEach } from "bun:test";
import { checkSite } from "./monitor";
import type { SiteState, Site } from "./monitor";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SITE: Site = {
  url: "http://www.ladishb.com",
  name: "湖北雷迪司网站",
  failThreshold: 3,
  maxAlerts: 2,
  tels: ["15337364316"],
};

const DOWN_SITE: Site = {
  ...SITE,
  url: "http://httpstat.us/503", // always returns 503
};

function freshState(): SiteState {
  return { failCount: 0, alertsSent: 0 };
}

// ─── Scenario A: site is UP ───────────────────────────────────────────────────

test("A: site UP – resets state, no SMS sent", async () => {
  const state = freshState();
  state.alertsSent = 0; // no previous outage

  await checkSite(SITE, state);        // real HTTP HEAD to ladishb.com

  expect(state.failCount).toBe(0);
  expect(state.alertsSent).toBe(0);
}, 15_000);

// ─── Scenario B: site DOWN, below threshold ───────────────────────────────────

test("B: site DOWN below threshold – failCount increments, no SMS", async () => {
  // Mock fetch to return a failure
  const original = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve({ ok: false, status: 503 } as Response);

  const state = freshState(); // failCount will go 0 → 1 (threshold is 3)

  await checkSite(SITE, state);

  expect(state.failCount).toBe(1);
  expect(state.alertsSent).toBe(0);

  globalThis.fetch = original;
}, 5_000);

// ─── Scenario C: site DOWN, reaches threshold → sends real SMS ────────────────

test("C: site DOWN at threshold – SMS sent to 15337364316", async () => {
  const original = globalThis.fetch;
  let callCount = 0;

  // First call = monitored site check (returns failure),
  // subsequent calls = real SMS API request (restore fetch)
  globalThis.fetch = (...args: Parameters<typeof fetch>) => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve({ ok: false, status: 503 } as Response);
    }
    globalThis.fetch = original; // restore for SMS API call
    return original(...args);
  };

  // Pre-load failCount to threshold - 1 so this check tips it over
  const state: SiteState = { failCount: SITE.failThreshold - 1, alertsSent: 0 };

  await checkSite(SITE, state);

  expect(state.alertsSent).toBe(1);  // SMS was accepted
  expect(state.failCount).toBe(0);   // reset after successful alert
  console.log("📱 Check phone 15337364316 for the alert SMS");
}, 20_000);
