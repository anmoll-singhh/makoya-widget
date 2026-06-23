import { describe, it, expect } from "vitest";
import { buildReport } from "./report-builder";
import type { RawScanResult, RawAxeViolation } from "./types";
import type { SeverityLevel } from "@/types";

const v = (
  id: string,
  impact: SeverityLevel,
  totalInstances: number,
  tags: string[]
): RawAxeViolation => ({
  id,
  description: `${id} description`,
  help: `${id} help`,
  impact,
  tags,
  helpUrl: `https://example.test/${id}`,
  totalInstances,
  nodes: [{ target: [`#${id}`], html: `<div id="${id}"></div>`, failureSummary: "fails" }],
});

const raw = (violations: RawAxeViolation[]): RawScanResult => ({
  url: "https://site.test/",
  scannedAt: "2026-06-23T00:00:00.000Z",
  wcagLevel: "AA",
  violations,
  javascriptRendered: true,
  durationMs: 1234,
  engineMeta: {
    axeVersion: "4.10.2",
    engineVersion: 2,
    scoringModelVersion: 2,
    rulesetHash: "abc123",
    contentHash: "deadbeef",
  },
});

describe("buildReport — golden determinism + evidence", () => {
  it("produces an identical report for identical input (same site → same score)", () => {
    const input = raw([
      v("image-alt", "critical", 2, ["cat.text-alternatives", "wcag2a", "wcag111"]),
      v("color-contrast", "serious", 5, ["cat.color", "wcag2aa", "wcag143"]),
      v("region", "moderate", 1, ["cat.keyboard", "best-practice"]),
    ]);
    const a = buildReport(input, "https://site.test/");
    const b = buildReport(input, "https://site.test/");
    expect(a).toEqual(b);
  });

  it("anchors a known score: a single single-instance critical → 88", () => {
    const report = buildReport(raw([v("image-alt", "critical", 1, ["wcag2a", "wcag111"])]), "u");
    expect(report.score).toBe(88);
  });

  it("attaches the impacted WCAG criterion + level to each issue", () => {
    const report = buildReport(raw([v("color-contrast", "serious", 5, ["wcag2aa", "wcag143"])]), "u");
    const issue = report.issues.serious[0];
    expect(issue.wcag?.criterion).toBe("1.4.3");
    expect(issue.wcag?.level).toBe("AA");
    expect(issue.whyItMatters && issue.whyItMatters.length).toBeGreaterThan(0);
    expect(issue.whoItAffects && issue.whoItAffects.length).toBeGreaterThan(0);
    expect(issue.instanceCount).toBe(5);
    expect(issue.pointsContributed).toBeGreaterThan(0);
  });

  it("labels best-practice issues without a fabricated criterion", () => {
    const report = buildReport(raw([v("region", "moderate", 1, ["best-practice"])]), "u");
    expect(report.issues.moderate[0].wcag?.criterion).toBeNull();
    expect(report.issues.moderate[0].wcag?.level).toBe("best-practice");
  });

  it("exposes an auditable breakdown whose line items sum to rawPenalty", () => {
    const report = buildReport(
      raw([
        v("image-alt", "critical", 2, ["wcag111"]),
        v("color-contrast", "serious", 5, ["wcag143"]),
      ]),
      "u"
    );
    const bd = report.scoreBreakdown!;
    const sum = bd.lineItems.reduce((s, li) => s + li.pointsContributed, 0);
    expect(sum).toBeCloseTo(bd.rawPenalty, 9);
    expect(bd.scoringModelVersion).toBe(2);
    // per-issue points equal the matching breakdown line item
    const crit = report.issues.critical[0];
    const li = bd.lineItems.find((x) => x.ruleId === crit.id)!;
    expect(crit.pointsContributed).toBeCloseTo(li.pointsContributed, 9);
  });

  it("passes engine provenance through and never writes isPartialScan", () => {
    const report = buildReport(raw([v("image-alt", "critical", 1, ["wcag111"])]), "u");
    expect(report.engineMeta?.axeVersion).toBe("4.10.2");
    expect(report.engineMeta?.contentHash).toBe("deadbeef");
    expect(report.isPartialScan).toBeUndefined();
  });
});
