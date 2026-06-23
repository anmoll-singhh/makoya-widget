import { describe, it, expect } from "vitest";
import { computeScore, SCORING_MODEL_VERSION, type ScoreInput } from "./score";

const mk = (
  ruleId: string,
  severity: ScoreInput["severity"],
  instanceCount: number,
  extra: Partial<ScoreInput> = {}
): ScoreInput => ({ ruleId, severity, instanceCount, ...extra });

describe("computeScore", () => {
  it("returns a perfect score with no violations", () => {
    const r = computeScore([]);
    expect(r.score).toBe(100);
    expect(r.rawPenalty).toBe(0);
    expect(r.appliedPenalty).toBe(0);
    expect(r.lineItems).toEqual([]);
    expect(r.scoringModelVersion).toBe(SCORING_MODEL_VERSION);
  });

  it("deducts exactly the base weight for a single-instance rule (ln(1)=0)", () => {
    // critical weight 12, factor (1 + ln(1)) = 1 → penalty 12 → score 88
    expect(computeScore([mk("a", "critical", 1)]).score).toBe(88);
    // moderate weight 3 → score 97
    expect(computeScore([mk("b", "moderate", 1)]).score).toBe(97);
    // minor weight 1 → score 99
    expect(computeScore([mk("c", "minor", 1)]).score).toBe(99);
  });

  it("penalises more instances more, but sub-linearly (diminishing returns)", () => {
    const one = computeScore([mk("a", "serious", 1)]).rawPenalty;
    const ten = computeScore([mk("a", "serious", 10)]).rawPenalty;
    const hundred = computeScore([mk("a", "serious", 100)]).rawPenalty;
    expect(ten).toBeGreaterThan(one); // more is worse
    expect(hundred).toBeGreaterThan(ten);
    // sub-linear: 100 instances is NOT 100x the penalty of 1 instance
    expect(hundred).toBeLessThan(one * 100);
    // 7 * (1 + ln(10)) ≈ 23.1
    expect(ten).toBeCloseTo(7 * (1 + Math.log(10)), 5);
  });

  it("clamps the penalty so the score never goes below 0, and exposes raw vs applied", () => {
    // 4000 instances of one critical: 12 * (1 + ln(4000)) ≈ 111.5 > 100
    const r = computeScore([mk("a", "critical", 4000)]);
    expect(r.score).toBe(0);
    expect(r.rawPenalty).toBeGreaterThan(100);
    expect(r.appliedPenalty).toBe(100);
    // the single line item is honestly recorded even though it alone zeroes the score
    expect(r.lineItems).toHaveLength(1);
    expect(r.lineItems[0].pointsContributed).toBeGreaterThan(100);
  });

  it("line items sum to rawPenalty and are sorted by points contributed desc", () => {
    const r = computeScore([
      mk("minor-rule", "minor", 2),
      mk("crit-rule", "critical", 3),
      mk("mod-rule", "moderate", 1),
    ]);
    const sum = r.lineItems.reduce((s, li) => s + li.pointsContributed, 0);
    expect(sum).toBeCloseTo(r.rawPenalty, 9);
    const points = r.lineItems.map((li) => li.pointsContributed);
    expect(points).toEqual([...points].sort((a, b) => b - a));
    expect(r.lineItems[0].ruleId).toBe("crit-rule");
  });

  it("passes WCAG criterion + level through into the line items", () => {
    const r = computeScore([
      mk("color-contrast", "serious", 1, { wcagCriterion: "1.4.3", level: "AA" }),
    ]);
    expect(r.lineItems[0].wcagCriterion).toBe("1.4.3");
    expect(r.lineItems[0].level).toBe("AA");
  });

  it("is deterministic: identical input yields identical output", () => {
    const input = [
      mk("a", "critical", 5),
      mk("b", "serious", 12),
      mk("c", "minor", 1),
    ];
    expect(computeScore(input)).toEqual(computeScore(input));
  });

  it("treats instanceCount below 1 as 1 (no negative or NaN penalties)", () => {
    const r = computeScore([mk("a", "serious", 0)]);
    expect(r.rawPenalty).toBe(7); // factor floored to 1
    expect(Number.isFinite(r.score)).toBe(true);
  });
});
