/**
 * lib/scanner/cross-validate.test.ts — pure merge/confidence logic, env-free.
 */
import { describe, it, expect } from "vitest";
import { crossValidate, type SecondEngineFinding } from "./cross-validate";
import type { RawAxeViolation } from "./types";

const axe = (id: string, tags: string[], instances = 1): RawAxeViolation => ({
  id, description: `${id} d`, help: `${id} h`, impact: "serious", tags,
  helpUrl: "", totalInstances: instances,
  nodes: [{ target: [`#${id}`], html: "<i></i>", failureSummary: "x" }],
});

const finding = (code: string, crit: string | null): SecondEngineFinding => ({
  code, wcagCriterion: crit, impact: "serious",
  description: `${code} desc`, help: `${code} help`, totalInstances: 1,
});

describe("crossValidate", () => {
  it("promotes an axe violation to HIGH confidence when the second engine agrees (same criterion)", () => {
    const out = crossValidate(
      [axe("color-contrast", ["wcag2aa", "wcag143"])],
      [finding("HTMLCS.Principle1.Guideline1_4.1_4_3", "1.4.3")]
    );
    expect(out).toHaveLength(1);
    expect(out[0].confidence).toBe("high");
    expect(out[0].foundBy).toEqual(["axe", "htmlcs"]);
  });

  it("leaves an axe-only violation at STANDARD confidence", () => {
    const out = crossValidate([axe("image-alt", ["wcag2a", "wcag111"])], []);
    expect(out[0].confidence).toBe("standard");
    expect(out[0].foundBy).toEqual(["axe"]);
  });

  it("appends a second-engine-only finding as its own standard violation (widens coverage)", () => {
    const out = crossValidate(
      [axe("image-alt", ["wcag111"])],
      [finding("HTMLCS.X.1_4_3", "1.4.3")]
    );
    expect(out).toHaveLength(2);
    const extra = out.find((v) => v.id.startsWith("htmlcs:"));
    expect(extra).toBeDefined();
    expect(extra!.confidence).toBe("standard");
    expect(extra!.foundBy).toEqual(["htmlcs"]);
    expect(extra!.tags).toContain("wcag143");
  });

  it("does NOT double-count: a second finding matching an axe criterion is not also appended", () => {
    const out = crossValidate(
      [axe("color-contrast", ["wcag143"])],
      [finding("HTMLCS.a", "1.4.3"), finding("HTMLCS.b", "1.4.3")]
    );
    expect(out).toHaveLength(1); // promoted, not appended
    expect(out[0].confidence).toBe("high");
  });

  it("dedupes second-engine extras by code and is deterministic", () => {
    const findings = [finding("HTMLCS.dup", "9.9.9"), finding("HTMLCS.dup", "9.9.9"), finding("HTMLCS.aaa", "1.1.1")];
    const a = crossValidate([], findings);
    const b = crossValidate([], findings);
    expect(a).toEqual(b);
    expect(a.filter((v) => v.id === "htmlcs:HTMLCS.dup")).toHaveLength(1);
    // sorted by criterion: 1.1.1 before 9.9.9
    expect(a[0].id).toBe("htmlcs:HTMLCS.aaa");
  });

  it("handles empty inputs without throwing", () => {
    expect(crossValidate([], [])).toEqual([]);
  });
});
