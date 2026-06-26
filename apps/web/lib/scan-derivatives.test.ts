/**
 * scan-derivatives.test.ts — guards the fire-after-store wiring that turns a
 * freshly-stored scan into trackable `issues` rows + a `scan_completed` activity
 * entry.
 *
 * The ONE contract that matters here is RESILIENCE: this runs on the live scan
 * choke-point, so `recordScanDerivatives` must (1) call the two writers with the
 * right arguments on the happy path, (2) NEVER throw — any failure is routed to
 * `captureError` and swallowed so the scan result still comes back, and (3) skip
 * entirely for public/ephemeral scans that have no `siteId`.
 *
 * All three collaborators are mocked so the test is pure (no Supabase, no real
 * scan engine, no Sentry/env): we only assert how the helper orchestrates them.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessibilityReport } from "@/types";

const upsertIssuesFromScan = vi.fn();
const logActivity = vi.fn();
const captureError = vi.fn();

vi.mock("@/lib/issues", () => ({ upsertIssuesFromScan: (...a: unknown[]) => upsertIssuesFromScan(...a) }));
vi.mock("@/lib/activity", () => ({ logActivity: (...a: unknown[]) => logActivity(...a) }));
vi.mock("@/lib/observability", () => ({ captureError: (...a: unknown[]) => captureError(...a) }));

import { recordScanDerivatives } from "./scan-derivatives";

/** A fake service-role client — the helper only forwards it, never inspects it. */
const fakeService = {} as unknown as SupabaseClient;

/** Minimal report with the two fields the helper reads. */
function makeReport(): AccessibilityReport {
  return {
    score: 73,
    issues: {
      critical: [{ id: "image-alt", impact: "critical" }],
      serious: [],
      moderate: [],
      minor: [],
    },
  } as unknown as AccessibilityReport;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("recordScanDerivatives", () => {
  it("upserts issues and logs a scan_completed activity with the right args", async () => {
    upsertIssuesFromScan.mockResolvedValue({ upserted: 1, resolved: 0 });
    logActivity.mockResolvedValue(undefined);
    const report = makeReport();

    await recordScanDerivatives(fakeService, "site-1", "scan-1", report);

    expect(upsertIssuesFromScan).toHaveBeenCalledTimes(1);
    expect(upsertIssuesFromScan).toHaveBeenCalledWith(fakeService, "site-1", "scan-1", report.issues);

    expect(logActivity).toHaveBeenCalledTimes(1);
    expect(logActivity).toHaveBeenCalledWith(fakeService, {
      siteId: "site-1",
      type: "scan_completed",
      summary: "Scan completed — score 73",
    });

    expect(captureError).not.toHaveBeenCalled();
  });

  it("swallows an upsert failure (does NOT throw) and reports it to captureError", async () => {
    const boom = new Error("issues table on fire");
    upsertIssuesFromScan.mockRejectedValue(boom);

    await expect(
      recordScanDerivatives(fakeService, "site-1", "scan-1", makeReport())
    ).resolves.toBeUndefined();

    expect(captureError).toHaveBeenCalledTimes(1);
    expect(captureError).toHaveBeenCalledWith(boom, expect.objectContaining({ siteId: "site-1", scanId: "scan-1" }));
    // Activity must not be attempted once the upsert blew up.
    expect(logActivity).not.toHaveBeenCalled();
  });

  it("swallows a logActivity failure (does NOT throw) and reports it", async () => {
    upsertIssuesFromScan.mockResolvedValue({ upserted: 0, resolved: 0 });
    const boom = new Error("activity_log unavailable");
    logActivity.mockRejectedValue(boom);

    await expect(
      recordScanDerivatives(fakeService, "site-1", "scan-1", makeReport())
    ).resolves.toBeUndefined();

    expect(captureError).toHaveBeenCalledTimes(1);
    expect(captureError).toHaveBeenCalledWith(boom, expect.objectContaining({ siteId: "site-1" }));
  });

  it("skips entirely (no writes, no error) when there is no siteId", async () => {
    await recordScanDerivatives(fakeService, "", "scan-1", makeReport());

    expect(upsertIssuesFromScan).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
    expect(captureError).not.toHaveBeenCalled();
  });
});
