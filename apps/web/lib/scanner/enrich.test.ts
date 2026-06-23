import { describe, it, expect } from "vitest";
import { deriveEvidence } from "./enrich";

describe("deriveEvidence", () => {
  it("maps a known axe rule to its WCAG criterion + plain language", () => {
    const e = deriveEvidence("color-contrast", ["cat.color", "wcag2aa", "wcag143"], "h", "d");
    expect(e.wcag.criterion).toBe("1.4.3");
    expect(e.wcag.level).toBe("AA");
    expect(e.wcag.url).toMatch(/^https?:\/\//);
    expect(e.whyItMatters.length).toBeGreaterThan(10);
    expect(e.whoItAffects.length).toBeGreaterThan(5);
  });

  it("labels a best-practice rule with no fabricated criterion", () => {
    const e = deriveEvidence("region", ["cat.keyboard", "best-practice"], "h", "d");
    expect(e.wcag.criterion).toBeNull();
    expect(e.wcag.level).toBe("best-practice");
  });

  it("always yields non-empty plain language, even for an uncurated rule", () => {
    const e = deriveEvidence(
      "some-brand-new-axe-rule",
      ["wcag2a", "wcag412"],
      "Fix the thing by doing X",
      "Checks the thing"
    );
    expect(e.whyItMatters.length).toBeGreaterThan(0);
    expect(e.whoItAffects.length).toBeGreaterThan(0);
    // still resolves the criterion from the tags
    expect(e.wcag.criterion).toBe("4.1.2");
  });

  it("carries the multi-criterion 'others' list deterministically", () => {
    const e = deriveEvidence("link-name", ["wcag412", "wcag244"], "h", "d");
    expect(e.wcag.criterion).toBe("2.4.4");
    expect(e.wcag.others).toEqual(["4.1.2"]);
  });
});
