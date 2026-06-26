/**
 * app/api/cron/recompute-reports/route.test.ts
 *
 * Locks in the three behavioural guarantees of the monthly-reports scheduler:
 *   1. AUTH fails CLOSED — 403 when the secret is missing or wrong (mirrors the
 *      rescan cron's CRON_SECRET gate).
 *   2. On a valid secret it recomputes the CURRENT period for EVERY site.
 *   3. RESILIENCE — one failing site routes through captureError and is skipped,
 *      but the rest of the batch still runs and the route still returns ok.
 *
 * Runs env-free: every collaborator (service-role Supabase, reports data layer,
 * observability) is mocked. No live Supabase, no network.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks for the route's collaborators ─────────────────────────────────────
const recomputeMonthly = vi.fn();
const captureError = vi.fn();
// A fake service-role client whose only job is to return the seeded site list.
const sites: Array<{ id: string }> = [];
const fakeAdmin = {
  from: (_table: string) => ({
    select: (_cols: string) => Promise.resolve({ data: sites, error: null }),
  }),
};

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => fakeAdmin,
}));

vi.mock("@/lib/reports", () => ({
  // periodOf is the real pure helper's behaviour (UTC 'YYYY-MM' slice) — kept
  // simple so the test asserts the route forwards a sensible period.
  periodOf: (iso: string) => new Date(iso).toISOString().slice(0, 7),
  recomputeMonthly: (...args: unknown[]) => recomputeMonthly(...args),
}));

vi.mock("@/lib/observability", () => ({
  captureError: (...args: unknown[]) => captureError(...args),
}));

import { GET } from "./route";

const SECRET = "test-cron-secret";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://app.test/api/cron/recompute-reports", {
    method: "GET",
    headers,
  });
}

beforeEach(() => {
  recomputeMonthly.mockReset();
  captureError.mockReset();
  recomputeMonthly.mockResolvedValue({});
  sites.length = 0;
  process.env.CRON_SECRET = SECRET;
});

describe("GET /api/cron/recompute-reports — auth gate", () => {
  it("returns 403 when no secret header is present", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    expect(recomputeMonthly).not.toHaveBeenCalled();
  });

  it("returns 403 when the secret is wrong", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer nope" }));
    expect(res.status).toBe(403);
    expect(recomputeMonthly).not.toHaveBeenCalled();
  });

  it("returns 403 (fails closed) when CRON_SECRET is unset, even with a header", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest({ authorization: "Bearer anything" }));
    expect(res.status).toBe(403);
    expect(recomputeMonthly).not.toHaveBeenCalled();
  });

  it("accepts the x-cron-secret header for manual invocation", async () => {
    sites.push({ id: "site_1" });
    const res = await GET(makeRequest({ "x-cron-secret": SECRET }));
    expect(res.status).toBe(200);
    expect(recomputeMonthly).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/cron/recompute-reports — batch behaviour", () => {
  it("recomputes the current period for every site and reports the count", async () => {
    sites.push({ id: "site_1" }, { id: "site_2" }, { id: "site_3" });

    const res = await GET(makeRequest({ authorization: `Bearer ${SECRET}` }));
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.processed).toBe(3);
    expect(recomputeMonthly).toHaveBeenCalledTimes(3);

    // Each call gets (adminClient, siteId, period) with a 'YYYY-MM' period.
    const [, siteId, period] = recomputeMonthly.mock.calls[0] as [unknown, string, string];
    expect(siteId).toBe("site_1");
    expect(period).toMatch(/^\d{4}-\d{2}$/);
  });

  it("continues the batch when one site fails — bad site is captured, rest still run", async () => {
    sites.push({ id: "ok_1" }, { id: "bad" }, { id: "ok_2" });
    recomputeMonthly.mockImplementation((_client: unknown, siteId: string) => {
      if (siteId === "bad") return Promise.reject(new Error("boom"));
      return Promise.resolve({});
    });

    const res = await GET(makeRequest({ authorization: `Bearer ${SECRET}` }));
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // Two good sites processed; the failing one is skipped, not aborted.
    expect(json.processed).toBe(2);
    expect(recomputeMonthly).toHaveBeenCalledTimes(3);
    expect(captureError).toHaveBeenCalledTimes(1);
  });
});
