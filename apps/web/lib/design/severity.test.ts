import { describe, it, expect } from "vitest";
import { SEVERITY_META, scoreBand, sortBySeverity } from "./severity";

describe("severity", () => {
  it("ranks worst-first", () => {
    expect(SEVERITY_META.critical.rank).toBeLessThan(SEVERITY_META.minor.rank);
  });
  it("maps each severity to its CSS token", () => {
    expect(SEVERITY_META.serious.token).toBe("--color-sev-serious");
    expect(SEVERITY_META.minor.bgToken).toBe("--color-sev-minor-bg");
  });
  it("bands the score (passed/critical edges)", () => {
    expect(scoreBand(95).token).toBe("--color-sev-passed");
    expect(scoreBand(80).token).toBe("--color-sev-serious");
    expect(scoreBand(60).token).toBe("--color-sev-moderate");
    expect(scoreBand(20).token).toBe("--color-sev-critical");
  });
  it("sorts items worst-first, nulls last, stably", () => {
    const out = sortBySeverity([
      { id: "a", impact: "minor" }, { id: "b", impact: "critical" },
      { id: "c", impact: null }, { id: "d", impact: "minor" },
    ]);
    expect(out.map((x) => x.id)).toEqual(["b", "a", "d", "c"]);
  });
});
