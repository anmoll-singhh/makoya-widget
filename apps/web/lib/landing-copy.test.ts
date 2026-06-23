import { describe, it, expect } from "vitest";
import { allLandingCopy, contrast, hero } from "./landing-copy";

describe("landing copy (honest-hybrid guardrail)", () => {
  it("NEVER makes compliance / legal-guarantee claims", () => {
    const banned = /\b(WCAG[- ]?compliant|ADA[- ]?compliant|fully compliant|lawsuit-?proof|guaranteed)\b/i;
    for (const s of allLandingCopy()) {
      expect(banned.test(s), `banned claim in: "${s}"`).toBe(false);
    }
  });

  it("does not name a specific competitor in the contrast section", () => {
    const named = /\b(accessibe|userway|audioeye|equalweb|level access)\b/i;
    for (const s of allLandingCopy()) {
      expect(named.test(s), `named competitor in: "${s}"`).toBe(false);
    }
  });

  it("keeps the hero headline short for the 5-second test", () => {
    const words = `${hero.headlineLead} ${hero.headlineAccent}`.trim().split(/\s+/);
    expect(words.length).toBeLessThanOrEqual(8);
  });

  it("provides three cited contrast stats", () => {
    expect(contrast.stats).toHaveLength(3);
    for (const s of contrast.stats) {
      expect(s.figure.length).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.source.length).toBeGreaterThan(0);
    }
  });
});
