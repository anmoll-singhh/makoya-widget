/**
 * lib/scanner/evidence-layer.test.ts
 *
 * Covers the Phase-H scanner upgrade: every issue carries structured
 * disability groups + a plain "how to fix", and measurable rules surface the
 * measured fact. Pure, env-free.
 */

import { describe, it, expect } from "vitest";
import { toPlainIssue, inferDisabilityGroups } from "./plain-language";
import { deriveEvidence } from "./enrich";
import { buildReport } from "./report-builder";
import type { RawScanResult, RawAxeViolation } from "./types";
import type { AccessibilityIssue, SeverityLevel } from "@/types";

const issue = (id: string, tags: string[], help = ""): AccessibilityIssue => ({
  id, description: "", help, impact: null, tags, helpUrl: "", nodes: [],
});

describe("plain-language: disability groups + how-to-fix", () => {
  it("mapped rule carries specific groups + actionable fix", () => {
    const p = toPlainIssue(issue("color-contrast", ["cat.color", "wcag143"]));
    expect(p.disabilityGroups).toEqual(expect.arrayContaining(["low-vision", "color-blind"]));
    expect(p.howToFix.toLowerCase()).toContain("contrast");
    expect(p.howToFix.length).toBeGreaterThan(20);
  });

  it("icon-button rule targets screen-reader users with an aria-label fix", () => {
    const p = toPlainIssue(issue("icon-button-no-label", ["custom", "wcag412"]));
    expect(p.disabilityGroups).toContain("blind");
    expect(p.howToFix.toLowerCase()).toContain("aria-label");
  });

  it("unmapped rule infers groups from tags and is never empty", () => {
    const p = toPlainIssue(issue("some-future-rule", ["cat.keyboard", "wcag211"], "Do the thing"));
    expect(p.disabilityGroups).toContain("motor");
    expect(p.disabilityGroups.length).toBeGreaterThan(0);
    expect(p.howToFix).toBe("Do the thing"); // falls back to axe help
  });

  it("unmapped rule with no tags still names an audience (no empty field)", () => {
    const p = toPlainIssue(issue("mystery", []));
    expect(p.disabilityGroups.length).toBeGreaterThan(0);
    expect(p.disabilityGroups).toEqual(expect.arrayContaining(["blind", "low-vision"]));
  });
});

describe("inferDisabilityGroups", () => {
  it("colour tags → low-vision + colour blindness", () => {
    expect(inferDisabilityGroups(["cat.color", "wcag143"])).toEqual(
      expect.arrayContaining(["low-vision", "color-blind"])
    );
  });
  it("media tags → deaf / hard of hearing", () => {
    expect(inferDisabilityGroups(["cat.time-and-media", "wcag122"])).toContain("deaf-hard-of-hearing");
  });
  it("motion/timing tags → vestibular + cognitive", () => {
    expect(inferDisabilityGroups(["wcag222"])).toEqual(
      expect.arrayContaining(["vestibular", "cognitive"])
    );
  });
  it("empty tags → defaults to screen-reader audience (never empty)", () => {
    expect(inferDisabilityGroups([])).toEqual(expect.arrayContaining(["blind", "low-vision"]));
  });
});

describe("enrich.deriveEvidence", () => {
  it("returns disabilityGroups + howToFix alongside wcag + copy", () => {
    const e = deriveEvidence("image-alt", ["wcag2a", "wcag111"], "add alt", "imgs need alt");
    expect(e.disabilityGroups).toContain("blind");
    expect(e.howToFix.length).toBeGreaterThan(0);
    expect(e.wcag.criterion).toBe("1.1.1");
  });
});

// --- report-builder: measured evidence + field propagation -------------------

const v = (id: string, impact: SeverityLevel, tags: string[], failureSummary: string): RawAxeViolation => ({
  id, description: `${id} desc`, help: `${id} help`, impact, tags,
  helpUrl: "", totalInstances: 1,
  nodes: [{ target: [`#${id}`], html: `<i id="${id}"></i>`, failureSummary }],
});

const raw = (violations: RawAxeViolation[]): RawScanResult => ({
  url: "https://site.test/", scannedAt: "2026-06-25T00:00:00.000Z", wcagLevel: "AA",
  violations, javascriptRendered: true, durationMs: 100,
  engineMeta: { axeVersion: "4.10.2", engineVersion: 2, scoringModelVersion: 2, rulesetHash: "h", contentHash: "c" },
});

describe("report-builder: measured evidence", () => {
  it("parses axe contrast ratio into a measured-evidence string", () => {
    const summary = "Fix any of the following: Element has insufficient color contrast of 2.3:1 (foreground #777, background #fff). Expected contrast ratio of 4.5:1";
    const report = buildReport(raw([v("color-contrast", "serious", ["cat.color", "wcag143"], summary)]), "u");
    const got = report.issues.serious[0];
    expect(got.measuredEvidence).toBe("Measured contrast 2.3:1 — needs at least 4.5:1");
    expect(got.disabilityGroups).toEqual(expect.arrayContaining(["low-vision", "color-blind"]));
    expect(got.howToFix && got.howToFix.length).toBeGreaterThan(0);
  });

  it("leaves measuredEvidence undefined for rules with no measurable value", () => {
    const report = buildReport(raw([v("image-alt", "critical", ["wcag111"], "Element has no alt")]), "u");
    expect(report.issues.critical[0].measuredEvidence).toBeUndefined();
  });
});
