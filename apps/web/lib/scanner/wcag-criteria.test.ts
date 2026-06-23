import { describe, it, expect } from "vitest";
import { criterionForTag, levelForTag, resolveWcag } from "./wcag-criteria";

describe("criterionForTag (exact-string lookup, never digit-splitting)", () => {
  it("maps a 3-digit single-component criterion", () => {
    const c = criterionForTag("wcag143");
    expect(c).not.toBeNull();
    expect(c!.criterion).toBe("1.4.3");
    expect(c!.name).toMatch(/contrast/i);
    expect(c!.level).toBe("AA");
    expect(c!.url).toMatch(/^https?:\/\//);
  });

  it("correctly distinguishes a two-digit final component (the ambiguity case)", () => {
    // wcag1410 is 1.4.10 (Reflow), NOT 14.10 — only an exact table gets this right.
    const c = criterionForTag("wcag1410");
    expect(c!.criterion).toBe("1.4.10");
  });

  it("returns null for a conformance-LEVEL tag (not a criterion)", () => {
    expect(criterionForTag("wcag2aa")).toBeNull();
    expect(criterionForTag("wcag2a")).toBeNull();
    expect(criterionForTag("wcag21aa")).toBeNull();
  });

  it("returns null for unknown / non-wcag tags", () => {
    expect(criterionForTag("best-practice")).toBeNull();
    expect(criterionForTag("cat.color")).toBeNull();
  });
});

describe("levelForTag (conformance-level tags only)", () => {
  it("maps level tags to their level", () => {
    expect(levelForTag("wcag2a")).toBe("A");
    expect(levelForTag("wcag2aa")).toBe("AA");
    expect(levelForTag("wcag21aa")).toBe("AA");
    expect(levelForTag("wcag22aa")).toBe("AA");
  });
  it("returns null for criterion tags", () => {
    expect(levelForTag("wcag143")).toBeNull();
  });
});

describe("resolveWcag (deterministic primary selection from a rule's tags)", () => {
  it("picks the single criterion when there is one", () => {
    const r = resolveWcag(["cat.color", "wcag2aa", "wcag143"]);
    expect(r.criterion).toBe("1.4.3");
    expect(r.level).toBe("AA");
    expect(r.others).toEqual([]);
  });

  it("picks the lowest criterion number as primary and lists the rest deterministically", () => {
    // link-name → 2.4.4 and 4.1.2 → primary is 2.4.4
    const r = resolveWcag(["wcag412", "wcag244"]);
    expect(r.criterion).toBe("2.4.4");
    expect(r.others).toEqual(["4.1.2"]);
  });

  it("orders multi-component criteria numerically, not lexically (1.4.3 < 1.4.10)", () => {
    const r = resolveWcag(["wcag1410", "wcag143"]);
    expect(r.criterion).toBe("1.4.3");
    expect(r.others).toEqual(["1.4.10"]);
  });

  it("labels best-practice (no criterion) without fabricating a criterion", () => {
    const r = resolveWcag(["cat.semantics", "best-practice"]);
    expect(r.criterion).toBeNull();
    expect(r.level).toBe("best-practice");
    expect(r.name).toBeNull();
  });
});
