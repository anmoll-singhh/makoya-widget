import { describe, it, expect } from "vitest";
import { contrastRatio, meetsAaUi } from "./contrast";

describe("contrastRatio", () => {
  it("black vs white is the maximum 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5); // order-independent
  });

  it("identical colours are 1:1", () => {
    expect(contrastRatio("#1E63FF", "#1E63FF")).toBeCloseTo(1, 5);
    expect(contrastRatio("#abc", "#abc")).toBeCloseTo(1, 5);
  });

  it("parses 3-digit hex and a missing leading #", () => {
    expect(contrastRatio("fff", "000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#fff", "000")).toBeCloseTo(21, 5);
    // #abc expands to #aabbcc — same as the 6-digit form.
    expect(contrastRatio("#abc", "#000")).toBeCloseTo(
      contrastRatio("#aabbcc", "#000000"),
      5
    );
  });

  it("brand blue #1E63FF on white sits in the expected band", () => {
    const r = contrastRatio("#1E63FF", "#FFFFFF");
    expect(r).toBeGreaterThan(4);
    expect(r).toBeLessThan(5.2);
  });
});

describe("meetsAaUi", () => {
  it("passes at and above the 3:1 UI threshold", () => {
    expect(meetsAaUi(3)).toBe(true);
    expect(meetsAaUi(3.01)).toBe(true);
    expect(meetsAaUi(21)).toBe(true);
  });
  it("fails just below the threshold", () => {
    expect(meetsAaUi(2.99)).toBe(false);
    expect(meetsAaUi(1)).toBe(false);
  });
  it("a brand colour with enough contrast passes the UI bar", () => {
    expect(meetsAaUi(contrastRatio("#1E63FF", "#FFFFFF"))).toBe(true);
  });
});
