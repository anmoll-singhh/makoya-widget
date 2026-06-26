import { describe, it, expect } from "vitest";
import { rowToHeartbeat, deriveInstallStatus } from "./heartbeat";

describe("rowToHeartbeat", () => {
  it("maps a snake_case row to a camelCase HeartbeatRecord", () => {
    const row = {
      site_id: "site-1",
      first_seen_at: "2026-06-01T00:00:00Z",
      last_seen_at: "2026-06-26T12:00:00Z",
      ping_count: 42,
      last_url: "https://example.com/page",
    };
    const hb = rowToHeartbeat(row);
    expect(hb.siteId).toBe("site-1");
    expect(hb.firstSeenAt).toBe("2026-06-01T00:00:00Z");
    expect(hb.lastSeenAt).toBe("2026-06-26T12:00:00Z");
    expect(hb.pingCount).toBe(42);
    expect(hb.lastUrl).toBe("https://example.com/page");
  });

  it("tolerates a null last_url and missing ping_count", () => {
    const hb = rowToHeartbeat({
      site_id: "site-2",
      first_seen_at: "2026-06-01T00:00:00Z",
      last_seen_at: "2026-06-01T00:00:00Z",
      ping_count: null,
      last_url: null,
    });
    expect(hb.lastUrl).toBeNull();
    expect(hb.pingCount).toBe(0);
  });
});

describe("deriveInstallStatus", () => {
  // Fixed reference clock so the branches are deterministic.
  const now = Date.parse("2026-06-26T12:00:00Z");
  const MIN = 60_000;
  const minutesAgo = (m: number) => new Date(now - m * MIN).toISOString();
  const daysAgo = (d: number) => new Date(now - d * 24 * 60 * MIN).toISOString();

  it("returns not_installed when lastSeenAt is null", () => {
    expect(deriveInstallStatus({ lastSeenAt: null, nowMs: now, latestScore: 90 })).toBe("not_installed");
    expect(deriveInstallStatus({ lastSeenAt: null, nowMs: now, latestScore: null })).toBe("not_installed");
  });

  it("returns active when seen recently and score is healthy", () => {
    expect(deriveInstallStatus({ lastSeenAt: minutesAgo(5), nowMs: now, latestScore: 80 })).toBe("active");
  });

  it("returns active when seen recently and score is unknown", () => {
    expect(deriveInstallStatus({ lastSeenAt: minutesAgo(5), nowMs: now, latestScore: null })).toBe("active");
  });

  it("returns action_needed when seen recently but score is below 50", () => {
    expect(deriveInstallStatus({ lastSeenAt: minutesAgo(5), nowMs: now, latestScore: 49 })).toBe("action_needed");
  });

  it("returns active at exactly the 30-minute boundary (inclusive)", () => {
    expect(deriveInstallStatus({ lastSeenAt: minutesAgo(30), nowMs: now, latestScore: 90 })).toBe("active");
  });

  it("returns monitoring when older than 30 min but within 7 days", () => {
    expect(deriveInstallStatus({ lastSeenAt: minutesAgo(31), nowMs: now, latestScore: 90 })).toBe("monitoring");
    expect(deriveInstallStatus({ lastSeenAt: daysAgo(3), nowMs: now, latestScore: 10 })).toBe("monitoring");
  });

  it("returns monitoring at exactly the 7-day boundary (inclusive)", () => {
    expect(deriveInstallStatus({ lastSeenAt: daysAgo(7), nowMs: now, latestScore: 90 })).toBe("monitoring");
  });

  it("returns action_needed when older than 7 days", () => {
    expect(deriveInstallStatus({ lastSeenAt: daysAgo(8), nowMs: now, latestScore: 90 })).toBe("action_needed");
  });

  it("defaults nowMs to the current time when omitted", () => {
    expect(deriveInstallStatus({ lastSeenAt: new Date().toISOString(), latestScore: 90 })).toBe("active");
  });
});
