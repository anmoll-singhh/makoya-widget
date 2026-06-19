import { describe, it, expect } from "vitest";
import { toPlainIssue, topPlainIssues } from "./plain-language";
import type { AccessibilityReport, AccessibilityIssue } from "@/types";

const mk = (id: string, impact: any): AccessibilityIssue =>
  ({ id, impact, description: "d", help: "h", tags: [], helpUrl: "u", nodes: [] });

describe("plain-language", () => {
  it("maps a known rule id to a curated plain explanation", () => {
    const p = toPlainIssue(mk("image-alt", "critical"));
    expect(p.title.toLowerCase()).toContain("image");
    expect(p.whatItMeans.length).toBeGreaterThan(10);
    expect(p.whoItAffects.length).toBeGreaterThan(5);
  });
  it("falls back gracefully for an unknown rule id", () => {
    const p = toPlainIssue(mk("some-unknown-rule", "minor"));
    expect(p.title.length).toBeGreaterThan(0);
    expect(p.whatItMeans.length).toBeGreaterThan(0);
  });
  it("topPlainIssues returns highest-severity first, capped at n", () => {
    const report = {
      issues: {
        critical: [mk("image-alt", "critical")],
        serious: [mk("color-contrast", "serious")],
        moderate: [mk("region", "moderate")],
        minor: [mk("x", "minor")],
      },
    } as unknown as AccessibilityReport;
    const top = topPlainIssues(report, 3);
    expect(top.map((t) => t.id)).toEqual(["image-alt", "color-contrast", "region"]);
  });
});
