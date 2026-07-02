import { describe, it, expect } from "vitest";
import { buildAuditReport, type AuditReportInput } from "./audit-content";
import type { RuleAuditResult } from "@/lib/scanner/types";

/**
 * Honesty guardrail for the Full Audit report. This is the structural equivalent
 * of lib/pdf/report-content.caps.test.ts: it locks the anti-overclaim rules the
 * architecture review flagged as P0. If any of these fail, the report is at risk
 * of implying the automated-compliance claim that fined accessiBe $1M.
 */

const rule = (over: Partial<RuleAuditResult>): RuleAuditResult => ({
  id: "r",
  description: "A check",
  help: "help",
  helpUrl: "",
  impact: null,
  tags: [],
  outcome: "pass",
  count: 0,
  sample: [],
  ...over,
});

const baseInput = (rules: RuleAuditResult[]): AuditReportInput => ({
  url: "https://shop.example/products",
  score: 72,
  scannedAt: "2026-07-02T00:00:00.000Z",
  rules,
  generatedAt: new Date("2026-07-02T00:00:00.000Z"),
});

// The "claim surfaces" — everything the reader sees AS A RESULT/verdict.
// Excludes `disclaimer` + `footer`, which INTENTIONALLY negate compliance
// ("does not certify… compliant", "never sell a compliance badge") and are
// asserted separately. A positive claim must never appear in these fields.
function claimSurfaces(content: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { disclaimer, footer, ...rest } = content;
  return JSON.stringify(rest).toLowerCase();
}

describe("buildAuditReport — honesty guardrail", () => {
  const content = buildAuditReport(
    baseInput([
      rule({ id: "color-contrast", description: "Text contrast is too low", impact: "serious", tags: ["wcag2aa", "wcag143"], outcome: "fail", count: 4, sample: [{ target: [".price"], html: "<a>x</a>" }] }),
      rule({ id: "image-alt", description: "Images have alt text", tags: ["wcag2a", "wcag111"], outcome: "pass", count: 12, sample: [{ target: ["img"], html: "<img alt='x'>" }] }),
      rule({ id: "color-contrast-review", description: "Contrast over an image", tags: ["wcag2aa", "wcag143"], outcome: "review", count: 3, sample: [{ target: [".hero"], html: "<div>x</div>" }] }),
      rule({ id: "label", description: "Form fields have labels", tags: ["wcag2a", "wcag412"], outcome: "not-applicable", count: 0 }),
      rule({ id: "region", description: "Content sits in a landmark", tags: ["best-practice"], outcome: "pass", count: 5, sample: [{ target: ["main"], html: "<main>x</main>" }] }),
    ])
  );

  it("never makes a compliance / conformance claim in a result surface", () => {
    const text = claimSurfaces(content as unknown as Record<string, unknown>);
    for (const banned of [
      "accessible",
      "compliant",
      "compliance",
      "certified",
      "conformant",
      "guaranteed",
      "meets wcag",
      "passes wcag",
      "requirement met",
    ]) {
      expect(text, `result surfaces must not contain "${banned}"`).not.toContain(banned);
    }
  });

  it("footer keeps the honest 'no compliance badge' framing", () => {
    expect(content.footer.toLowerCase()).toContain("never sell a compliance badge");
  });

  it("renders the honest disclaimer", () => {
    expect(content.disclaimer.toLowerCase()).toContain("does not certify");
  });

  it("a not-applicable rule is 'Not relevant', never a pass/green/100", () => {
    const na = [...content.scoredRules, ...content.bestPracticeRules].find((r) => r.id === "label")!;
    expect(na.outcome).toBe("not-applicable");
    expect(na.relevant).toBe(false);
    expect(na.count).toBe(0);
    expect(na.outcomeLabel).toBe("Not relevant to this page");
    // Must not be labelled as a pass.
    expect(na.outcomeLabel.toLowerCase()).not.toContain("pass");
  });

  it("a passing rule is not described as meeting WCAG", () => {
    const pass = content.scoredRules.find((r) => r.id === "image-alt")!;
    expect(pass.outcome).toBe("pass");
    const label = pass.outcomeLabel.toLowerCase();
    expect(label).not.toContain("passes wcag");
    expect(label).not.toContain("meets");
    expect(label).not.toContain("conformant");
  });

  it("surfaces needs-review as its own outcome (never folded into passes)", () => {
    const review = content.scoredRules.find((r) => r.id === "color-contrast-review")!;
    expect(review.outcome).toBe("review");
    expect(review.count).toBe(3);
    expect(content.summary.review).toBe(1);
    // review must NOT be counted as a pass. Two passes total: image-alt (scored)
    // + region (best-practice) — the summary counts every check run.
    expect(content.summary.passed).toBe(2);
  });

  it("splits best-practice rules out of the scored set", () => {
    expect(content.scoredRules.some((r) => r.id === "region")).toBe(false);
    expect(content.bestPracticeRules.some((r) => r.id === "region")).toBe(true);
    expect(content.bestPracticeRules[0].levelLabel).toBe("Best practice");
  });

  it("sorts failures first in the scored set", () => {
    expect(content.scoredRules[0].outcome).toBe("fail");
  });

  it("resolves WCAG criterion + level for a scored rule", () => {
    const fail = content.scoredRules.find((r) => r.id === "color-contrast")!;
    expect(fail.wcagCriterion).toContain("1.4.3");
    expect(fail.levelLabel).toBe("AA");
    expect(fail.severityLabel).toBe("Serious");
  });
});

describe("buildAuditReport — defensive coercion of an untrusted blob", () => {
  it("coerces an unknown outcome to not-applicable and clamps fields", () => {
    const content = buildAuditReport(
      baseInput([
        // @ts-expect-error deliberately invalid outcome
        rule({ id: "x", outcome: "EXPLODE", count: -5, description: "z".repeat(5000) }),
      ])
    );
    const row = [...content.scoredRules, ...content.bestPracticeRules][0];
    expect(row.outcome).toBe("not-applicable");
    expect(row.count).toBe(0);
    expect(row.title.length).toBeLessThanOrEqual(600);
  });

  it("caps samples per rule and score to 0..100", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ target: [`#n${i}`], html: "<b>x</b>" }));
    const content = buildAuditReport({
      ...baseInput([rule({ id: "f", tags: ["wcag2aa", "wcag143"], outcome: "fail", count: 50, sample: many })]),
      score: 999,
    });
    expect(content.score).toBe(100);
    expect(content.scoredRules[0].sample.length).toBeLessThanOrEqual(10);
  });
});
