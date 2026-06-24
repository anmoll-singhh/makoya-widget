/**
 * lib/issue-count-utils.test.ts
 *
 * issueCountFromTotals turns a scan's untyped `totals` jsonb (which varies by
 * scan version + may be null) into a single number for the admin CRM list. Its
 * null/zero/missing handling decides whether the CRM shows a count, a 0, or a
 * dash — so the branches are worth pinning. Pure function, env-free.
 */
import { describe, it, expect } from "vitest";
import { issueCountFromTotals } from "./issue-count-utils";

describe("issueCountFromTotals", () => {
  it("returns the explicit `total` when present", () => {
    expect(issueCountFromTotals({ total: 7, critical: 1 })).toBe(7);
  });

  it("prefers `total` even when it is 0", () => {
    expect(issueCountFromTotals({ total: 0, critical: 5 })).toBe(0);
  });

  it("sums the severity buckets when `total` is absent", () => {
    expect(issueCountFromTotals({ critical: 1, serious: 2, moderate: 3, minor: 4 })).toBe(10);
  });

  it("ignores non-numeric severity values when summing", () => {
    expect(
      issueCountFromTotals({ critical: 2, serious: "x", moderate: null, minor: undefined })
    ).toBe(2);
  });

  it("returns null for null / non-object input (renders as a dash in the CRM)", () => {
    expect(issueCountFromTotals(null)).toBeNull();
    expect(issueCountFromTotals(undefined)).toBeNull();
    expect(issueCountFromTotals("nope")).toBeNull();
    expect(issueCountFromTotals(42)).toBeNull();
  });

  it("returns null for an empty object (no signal at all)", () => {
    expect(issueCountFromTotals({})).toBeNull();
  });

  it("returns 0 when the object has keys but no positive counts", () => {
    expect(issueCountFromTotals({ critical: 0, serious: 0 })).toBe(0);
  });
});
