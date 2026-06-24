/**
 * lib/scanner/report-builder.determinism.test.ts
 *
 * The scanner is a product *and* a top-of-funnel asset, so a site that hasn't
 * changed must score IDENTICALLY on every scan. The existing report-builder test
 * asserts `a == b` for one tiny fixture; this suite hardens determinism across:
 *   - input ORDER (violations fed in a different order must not move the score
 *     or the breakdown — line items are sorted deterministically),
 *   - JSON round-trips (the report serialises to the wire and back unchanged),
 *   - the merged (multi-page) report builder,
 *   - the exact anchored breakdown for a non-trivial fixture.
 *
 * Pure functions only — no I/O, no env, no network.
 */
import { describe, it, expect } from "vitest";
import { buildReport, buildMergedReport } from "./report-builder";
import type { RawScanResult, RawAxeViolation } from "./types";
import type { SeverityLevel, PageScanSummary } from "@/types";

const v = (
  id: string,
  impact: SeverityLevel,
  totalInstances: number,
  tags: string[] = ["wcag2aa"]
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
  scannedAt: "2026-06-24T00:00:00.000Z",
  wcagLevel: "AA",
  violations,
  javascriptRendered: true,
  durationMs: 4321,
  engineMeta: {
    axeVersion: "4.10.2",
    engineVersion: 2,
    scoringModelVersion: 2,
    rulesetHash: "abc123",
    contentHash: "deadbeef",
  },
});

const violations = [
  v("image-alt", "critical", 2, ["cat.text-alternatives", "wcag2a", "wcag111"]),
  v("color-contrast", "serious", 5, ["cat.color", "wcag2aa", "wcag143"]),
  v("region", "moderate", 1, ["best-practice"]),
  v("link-name", "minor", 3, ["wcag2a", "wcag412"]),
];

describe("buildReport — determinism", () => {
  it("is byte-for-byte stable across many runs of the same input", () => {
    const first = JSON.stringify(buildReport(raw(violations), "https://site.test/"));
    for (let i = 0; i < 25; i += 1) {
      expect(JSON.stringify(buildReport(raw(violations), "https://site.test/"))).toBe(first);
    }
  });

  it("is INVARIANT to the order violations are supplied in", () => {
    const ordered = buildReport(raw(violations), "https://site.test/");
    const shuffled = buildReport(
      raw([violations[3], violations[1], violations[0], violations[2]]),
      "https://site.test/"
    );
    // Score and the auditable breakdown must not depend on input order.
    expect(shuffled.score).toBe(ordered.score);
    expect(shuffled.scoreBreakdown).toEqual(ordered.scoreBreakdown);
    expect(shuffled.totals).toEqual(ordered.totals);
  });

  it("breakdown line items are sorted by pointsContributed descending", () => {
    const report = buildReport(raw(violations), "u");
    const pts = report.scoreBreakdown!.lineItems.map((li) => li.pointsContributed);
    expect(pts).toEqual([...pts].sort((a, b) => b - a));
    // The critical 2-instance rule must out-weigh the others and lead.
    expect(report.scoreBreakdown!.lineItems[0].ruleId).toBe("image-alt");
  });

  it("survives a JSON round-trip unchanged (wire-stable)", () => {
    const report = buildReport(raw(violations), "https://site.test/");
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  it("anchors an exact score + per-issue point attribution for a known fixture", () => {
    // critical(12) * (1+ln2) + serious(7) * (1+ln5) + moderate(3) * 1 + minor(1) * (1+ln3)
    const report = buildReport(raw(violations), "u");
    const crit = 12 * (1 + Math.log(2));
    const ser = 7 * (1 + Math.log(5));
    const mod = 3 * 1;
    const min = 1 * (1 + Math.log(3));
    const expectedScore = Math.round(100 - (crit + ser + mod + min));
    expect(report.score).toBe(expectedScore);
    // Each issue carries its own pointsContributed matching the breakdown.
    expect(report.issues.critical[0].pointsContributed).toBeCloseTo(crit, 9);
    expect(report.issues.minor[0].pointsContributed).toBeCloseTo(min, 9);
  });
});

describe("buildMergedReport — determinism", () => {
  const pageResults: PageScanSummary[] = [
    {
      url: "https://site.test/",
      score: 70,
      totalIssues: 4,
      totals: { critical: 1, serious: 1, moderate: 1, minor: 1, total: 4 },
      durationMs: 1000,
    },
    {
      url: "https://site.test/about",
      score: 90,
      totalIssues: 1,
      totals: { critical: 0, serious: 0, moderate: 1, minor: 0, total: 1 },
      durationMs: 800,
    },
  ];

  it("produces an identical merged report for identical input", () => {
    const a = buildMergedReport(violations, raw([]), pageResults, 2, "https://site.test/");
    const b = buildMergedReport(violations, raw([]), pageResults, 2, "https://site.test/");
    expect(a).toEqual(b);
  });

  it("sums per-page durationMs and carries pagesScanned + pageResults through", () => {
    const report = buildMergedReport(violations, raw([]), pageResults, 2, "https://site.test/");
    expect(report.durationMs).toBe(1800);
    expect(report.pagesScanned).toBe(2);
    expect(report.pageResults).toEqual(pageResults);
  });

  it("yields the same score as the single-page builder for the same violations", () => {
    const single = buildReport(raw(violations), "u");
    const merged = buildMergedReport(violations, raw([]), pageResults, 2, "u");
    expect(merged.score).toBe(single.score);
    expect(merged.scoreBreakdown).toEqual(single.scoreBreakdown);
  });
});
