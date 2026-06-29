import { describe, it, expect } from "vitest";
import {
  planAllows,
  planRank,
  requiredPlanFor,
  planLabel,
  effectivePlan,
  type FeatureKey,
} from "./entitlements";
import type { PlanSlug } from "./plans";

// These tests pin the GATE behaviour so a low-tier site can never reach a pro
// feature by accident — the founder's explicit requirement.

describe("plan ranking", () => {
  it("orders free < starter < growth < scale < enterprise", () => {
    const order: PlanSlug[] = ["free", "starter", "growth", "scale", "enterprise"];
    for (let i = 1; i < order.length; i++) {
      expect(planRank(order[i])).toBeGreaterThan(planRank(order[i - 1]));
    }
  });
});

describe("planAllows", () => {
  it("locks every pro feature out of the Free tier", () => {
    const pro: FeatureKey[] = [
      "statement",
      "analytics",
      "proof_pack",
      "vpat",
      "remediation_log",
      "remove_branding",
      "multi_site",
      "full_api",
      "partners",
      "sso",
    ];
    for (const f of pro) expect(planAllows("free", f)).toBe(false);
  });

  it("unlocks statement + analytics at Starter, not proof/VPAT", () => {
    expect(planAllows("starter", "statement")).toBe(true);
    expect(planAllows("starter", "analytics")).toBe(true);
    expect(planAllows("starter", "proof_pack")).toBe(false);
    expect(planAllows("starter", "vpat")).toBe(false);
  });

  it("unlocks the proof pack + VPAT at Growth, not the full API", () => {
    expect(planAllows("growth", "proof_pack")).toBe(true);
    expect(planAllows("growth", "vpat")).toBe(true);
    expect(planAllows("growth", "full_api")).toBe(false);
    expect(planAllows("growth", "sso")).toBe(false);
  });

  it("unlocks full API + partners at Scale, SSO only at Enterprise", () => {
    expect(planAllows("scale", "full_api")).toBe(true);
    expect(planAllows("scale", "partners")).toBe(true);
    expect(planAllows("scale", "sso")).toBe(false);
    expect(planAllows("enterprise", "sso")).toBe(true);
  });

  it("a higher tier includes everything a lower tier has", () => {
    expect(planAllows("enterprise", "statement")).toBe(true);
    expect(planAllows("scale", "proof_pack")).toBe(true);
  });
});

describe("requiredPlanFor / planLabel", () => {
  it("names the lowest plan that unlocks a feature", () => {
    expect(requiredPlanFor("statement")).toBe("starter");
    expect(requiredPlanFor("proof_pack")).toBe("growth");
    expect(requiredPlanFor("full_api")).toBe("scale");
    expect(requiredPlanFor("sso")).toBe("enterprise");
  });
  it("gives human labels", () => {
    expect(planLabel("growth")).toBe("Growth");
    expect(planLabel("free")).toBe("Free");
  });
});

describe("effectivePlan (entitlement contract)", () => {
  it("grants the catalog plan while active or trialing", () => {
    expect(
      effectivePlan({ status: "active", planSlug: "growth", legacySlug: "free" })
    ).toBe("growth");
    expect(
      effectivePlan({ status: "trialing", planSlug: "scale", legacySlug: "free" })
    ).toBe("scale");
  });

  it("falls back to the legacy admin plan when inactive/past_due/canceled", () => {
    expect(
      effectivePlan({ status: "inactive", planSlug: "scale", legacySlug: "free" })
    ).toBe("free");
    expect(
      effectivePlan({ status: "canceled", planSlug: "scale", legacySlug: "growth" })
    ).toBe("growth");
    expect(
      effectivePlan({ status: "past_due", planSlug: "scale", legacySlug: "free" })
    ).toBe("free");
  });

  it("a brand-new (inactive, free legacy) site is gated to Free", () => {
    const plan = effectivePlan({ status: "inactive", planSlug: "free", legacySlug: "free" });
    expect(planAllows(plan, "proof_pack")).toBe(false);
    expect(planAllows(plan, "statement")).toBe(false);
  });
});
