import { describe, it, expect } from "vitest";
import { siteSettingsPatchSchema } from "./site-settings";

describe("siteSettingsPatchSchema", () => {
  it("accepts a valid partial patch", () => {
    const r = siteSettingsPatchSchema.safeParse({
      ownerName: "Ada",
      ownerEmail: "ada@x.com",
      ownerPhone: "+1 555 0100",
      notificationPrefs: { weeklyReport: true },
    });
    expect(r.success).toBe(true);
  });

  it("accepts an empty owner_email (email-or-empty)", () => {
    expect(siteSettingsPatchSchema.safeParse({ ownerEmail: "" }).success).toBe(true);
  });

  it("rejects a malformed owner_email", () => {
    expect(siteSettingsPatchSchema.safeParse({ ownerEmail: "not-an-email" }).success).toBe(false);
  });

  it("rejects an over-long phone", () => {
    expect(
      siteSettingsPatchSchema.safeParse({ ownerPhone: "9".repeat(200) }).success
    ).toBe(false);
  });

  it("rejects notification_prefs that is not an object", () => {
    expect(siteSettingsPatchSchema.safeParse({ notificationPrefs: [1, 2] }).success).toBe(false);
    expect(siteSettingsPatchSchema.safeParse({ notificationPrefs: "x" }).success).toBe(false);
  });

  it("rejects an empty patch (no fields to update)", () => {
    expect(siteSettingsPatchSchema.safeParse({}).success).toBe(false);
  });

  it("ignores unknown fields rather than failing", () => {
    const r = siteSettingsPatchSchema.safeParse({ ownerName: "Ada", bogus: 1 });
    expect(r.success).toBe(true);
  });
});
