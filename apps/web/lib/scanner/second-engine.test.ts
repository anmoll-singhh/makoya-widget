/**
 * lib/scanner/second-engine.test.ts — pure HTMLCS code→criterion mapping.
 * The in-browser runner needs a live page, so only the pure helper is tested
 * here (the merge logic is covered in cross-validate.test.ts).
 */
import { describe, it, expect } from "vitest";
import { htmlcsCodeToCriterion } from "./second-engine";

describe("htmlcsCodeToCriterion", () => {
  it("extracts the success criterion from a real HTMLCS code", () => {
    expect(htmlcsCodeToCriterion("WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail")).toBe("1.4.3");
  });
  it("handles two-digit criteria (e.g. 1.4.10)", () => {
    expect(htmlcsCodeToCriterion("WCAG2AA.Principle1.Guideline1_4.1_4_10.C32.Fail")).toBe("1.4.10");
  });
  it("returns null when no criterion is embedded", () => {
    expect(htmlcsCodeToCriterion("WCAG2AA.Principle4.Guideline4_1.Something")).toBeNull();
    expect(htmlcsCodeToCriterion("garbage")).toBeNull();
  });
});
