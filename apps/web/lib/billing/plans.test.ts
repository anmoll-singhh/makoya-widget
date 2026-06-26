import { describe, it, expect } from "vitest";
import { PLAN_CATALOG, type PlanSlug } from "./plans";

// The catalog is the SINGLE source the pricing cards map over, so these tests
// guard its INTEGRITY (order, pricing invariants, the one highlighted tier, the
// add-ons) rather than re-typing the copy. If a number drifts from
// docs/PRICING-STRATEGY-V3.1.md a test should break.

const EXPECTED_ORDER: PlanSlug[] = ["free", "starter", "growth", "scale", "enterprise"];
const PAID: PlanSlug[] = ["starter", "growth", "scale"];

describe("PLAN_CATALOG integrity", () => {
  it("has 5 plans in the canonical free→enterprise order", () => {
    expect(PLAN_CATALOG.plans.map((p) => p.slug)).toEqual(EXPECTED_ORDER);
  });

  it("uses unique slugs that all belong to the PlanSlug union", () => {
    const slugs = PLAN_CATALOG.plans.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(EXPECTED_ORDER).toContain(s);
  });

  it("marks exactly one plan highlighted, and it is Growth", () => {
    const highlighted = PLAN_CATALOG.plans.filter((p) => p.highlighted);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].slug).toBe("growth");
    expect(highlighted[0].badge).toBe("Most popular");
  });

  it("gives every paid plan both a monthly and a yearly price", () => {
    for (const slug of PAID) {
      const plan = PLAN_CATALOG.plans.find((p) => p.slug === slug)!;
      expect(typeof plan.monthlyPrice).toBe("number");
      expect(typeof plan.yearlyPrice).toBe("number");
      expect(plan.monthlyPrice!).toBeGreaterThan(0);
      expect(plan.yearlyPrice!).toBeGreaterThan(0);
    }
  });

  it("prices Free at zero and Enterprise as custom (null)", () => {
    const free = PLAN_CATALOG.plans.find((p) => p.slug === "free")!;
    const ent = PLAN_CATALOG.plans.find((p) => p.slug === "enterprise")!;
    expect(free.monthlyPrice).toBe(0);
    expect(free.yearlyPrice).toBe(0);
    expect(ent.monthlyPrice).toBeNull();
    expect(ent.yearlyPrice).toBeNull();
  });

  it("encodes the v3.1 headline prices and limits exactly", () => {
    const by = (s: PlanSlug) => PLAN_CATALOG.plans.find((p) => p.slug === s)!;
    expect(by("starter")).toMatchObject({ monthlyPrice: 45, yearlyPrice: 390, visitLimit: 5000, siteLimit: 1, seats: 1 });
    expect(by("growth")).toMatchObject({ monthlyPrice: 169, yearlyPrice: 1490, visitLimit: 30000, siteLimit: 3, seats: 3 });
    expect(by("scale")).toMatchObject({ monthlyPrice: 440, yearlyPrice: 3900, visitLimit: 100000, siteLimit: 10, seats: 10 });
    expect(by("free").visitLimit).toBe(1000);
    // Enterprise is unlimited → null limits.
    expect(by("enterprise")).toMatchObject({ visitLimit: null, siteLimit: null, seats: null });
  });

  it("gives every plan 4–6 feature bullets and a CTA label", () => {
    for (const plan of PLAN_CATALOG.plans) {
      expect(plan.features.length).toBeGreaterThanOrEqual(4);
      expect(plan.features.length).toBeLessThanOrEqual(6);
      for (const f of plan.features) expect(f.text.length).toBeGreaterThan(0);
      expect(plan.ctaLabel.length).toBeGreaterThan(0);
    }
  });

  it("defaults to yearly with a 30% saving headline", () => {
    expect(PLAN_CATALOG.defaultPeriod).toBe("yearly");
    expect(PLAN_CATALOG.yearlySavingHeadline).toBe(30);
    expect(PLAN_CATALOG.currency).toBe("USD");
  });

  it("ships the three high-margin add-ons with unique slugs", () => {
    expect(PLAN_CATALOG.addOns).toHaveLength(3);
    const slugs = PLAN_CATALOG.addOns.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(3);
    expect(slugs).toEqual(["human-remediation", "expert-manual-audit", "vpat-acr"]);
    for (const a of PLAN_CATALOG.addOns) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.model.length).toBeGreaterThan(0);
      expect(a.anchor.length).toBeGreaterThan(0);
    }
  });

  it("keeps the compliance-safe footnote (no 'guaranteed compliant' claims)", () => {
    expect(PLAN_CATALOG.footnote).toMatch(/do not by themselves make a site legally compliant/i);
    // Guardrail: never promise compliance.
    expect(PLAN_CATALOG.footnote).not.toMatch(/guaranteed/i);
  });
});
