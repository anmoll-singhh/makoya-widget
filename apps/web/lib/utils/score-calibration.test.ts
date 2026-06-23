/**
 * Calibration regression gate.
 *
 * Real-world calibration (running the model over live pages, cross-checked
 * against the WebAIM Million distribution) requires the headless browser and is
 * a deploy-time step. THIS test is the in-process guard the spec mandates: it
 * runs representative violation profiles through the scorer and asserts the
 * distribution is sensible and not degenerate (not all ~0, not all ~100), and
 * snapshots the exact scores so any future weight/curve change is visible in CI.
 *
 * If you intentionally retune SEVERITY_WEIGHTS or the curve, these numbers will
 * change — update them deliberately and bump SCORING_MODEL_VERSION.
 */
import { describe, it, expect } from "vitest";
import { computeScore, type ScoreInput } from "./score";

const profiles: Record<string, ScoreInput[]> = {
  clean: [],
  minorOnly: [
    { ruleId: "region", severity: "minor", instanceCount: 3 },
    { ruleId: "landmark", severity: "minor", instanceCount: 1 },
  ],
  typicalSmallBusiness: [
    { ruleId: "image-alt", severity: "critical", instanceCount: 3 },
    { ruleId: "color-contrast", severity: "serious", instanceCount: 20 },
    { ruleId: "link-name", severity: "serious", instanceCount: 4 },
    { ruleId: "heading-order", severity: "moderate", instanceCount: 2 },
  ],
  heavy: [
    { ruleId: "image-alt", severity: "critical", instanceCount: 40 },
    { ruleId: "button-name", severity: "critical", instanceCount: 15 },
    { ruleId: "color-contrast", severity: "serious", instanceCount: 200 },
    { ruleId: "label", severity: "critical", instanceCount: 30 },
  ],
};

describe("score calibration", () => {
  const scores = Object.fromEntries(
    Object.entries(profiles).map(([k, v]) => [k, computeScore(v).score])
  ) as Record<keyof typeof profiles, number>;

  it("is not degenerate: a clean page is 100 and a heavily-broken page is low", () => {
    expect(scores.clean).toBe(100);
    expect(scores.heavy).toBeLessThan(30);
  });

  it("orders profiles monotonically (worse sites score lower)", () => {
    expect(scores.clean).toBeGreaterThan(scores.minorOnly);
    expect(scores.minorOnly).toBeGreaterThan(scores.typicalSmallBusiness);
    expect(scores.typicalSmallBusiness).toBeGreaterThan(scores.heavy);
  });

  it("keeps a typical small-business site in a meaningful mid-band (not 0, not 90+)", () => {
    expect(scores.typicalSmallBusiness).toBeGreaterThan(20);
    expect(scores.typicalSmallBusiness).toBeLessThan(80);
  });

  it("matches the calibrated snapshot (change deliberately + bump model version)", () => {
    expect(scores).toEqual({
      clean: 100,
      minorOnly: 97,
      typicalSmallBusiness: 25,
      heavy: 0,
    });
  });
});
