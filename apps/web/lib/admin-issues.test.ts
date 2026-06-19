import { describe, it, expect } from "vitest";
import { issueCountFromTotals } from "./admin";

describe("issueCountFromTotals", () => {
  it("returns the total field when present", () => {
    expect(issueCountFromTotals({ critical: 2, serious: 3, moderate: 1, minor: 4, total: 10 })).toBe(10);
  });
  it("sums severities when total is absent", () => {
    expect(issueCountFromTotals({ critical: 2, serious: 3, moderate: 1, minor: 4 })).toBe(10);
  });
  it("returns null for missing/garbage totals", () => {
    expect(issueCountFromTotals(null)).toBeNull();
    expect(issueCountFromTotals("nope")).toBeNull();
  });
});
