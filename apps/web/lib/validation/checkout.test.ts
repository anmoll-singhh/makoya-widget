/**
 * lib/validation/checkout.test.ts
 *
 * Locks the boundary of the "Buy now" checkout body: ONLY the three purchasable
 * tiers (starter|growth|scale) on a known cadence (monthly|yearly) are accepted.
 * Free is the default (not purchased) and Enterprise is "contact sales" — both
 * are intentionally REJECTED here so a client can never self-assign them via the
 * checkout endpoint. The server, not the client, decides status + price.
 */
import { describe, it, expect } from "vitest";
import { checkoutBodySchema } from "./checkout";

describe("checkoutBodySchema", () => {
  it("accepts the three purchasable plans on monthly/yearly", () => {
    for (const planSlug of ["starter", "growth", "scale"] as const) {
      for (const period of ["monthly", "yearly"] as const) {
        const r = checkoutBodySchema.safeParse({ planSlug, period });
        expect(r.success).toBe(true);
      }
    }
  });

  it("rejects the non-purchasable plans (free, enterprise)", () => {
    expect(checkoutBodySchema.safeParse({ planSlug: "free", period: "monthly" }).success).toBe(false);
    expect(checkoutBodySchema.safeParse({ planSlug: "enterprise", period: "yearly" }).success).toBe(false);
  });

  it("rejects an unknown plan or period", () => {
    expect(checkoutBodySchema.safeParse({ planSlug: "platinum", period: "monthly" }).success).toBe(false);
    expect(checkoutBodySchema.safeParse({ planSlug: "growth", period: "weekly" }).success).toBe(false);
  });

  it("rejects a missing or malformed body", () => {
    expect(checkoutBodySchema.safeParse({}).success).toBe(false);
    expect(checkoutBodySchema.safeParse({ planSlug: "growth" }).success).toBe(false);
    expect(checkoutBodySchema.safeParse(null).success).toBe(false);
    expect(checkoutBodySchema.safeParse("growth").success).toBe(false);
  });
});
