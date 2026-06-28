import { describe, it, expect } from "vitest";
import { buildFeatureRows, rowsToEnabled, moveRow } from "./feature-order";
import { DEFAULT_CONFIG } from "@/lib/shared";

describe("feature-order", () => {
  it("buildFeatureRows returns all 18 keys with enabled first in order", () => {
    const rows = buildFeatureRows(["contrast", "textSize"]);
    expect(rows).toHaveLength(18);
    expect(rows.slice(0, 2).map(r => r.key)).toEqual(["contrast", "textSize"]);
    expect(rows.slice(0, 2).every(r => r.on)).toBe(true);
    expect(rows.slice(2).every(r => r.on)).toBe(false);
  });
  it("drops unknown/duplicate keys and keeps canonical fill order", () => {
    const rows = buildFeatureRows(["textSize", "textSize", "nope" as any]);
    expect(rows.filter(r => r.on).map(r => r.key)).toEqual(["textSize"]);
    expect(rows).toHaveLength(18);
  });
  it("rowsToEnabled round-trips an all-on default", () => {
    const rows = buildFeatureRows(DEFAULT_CONFIG.featuresEnabled);
    expect(rowsToEnabled(rows)).toEqual(DEFAULT_CONFIG.featuresEnabled);
  });
  it("moveRow swaps neighbors and no-ops at bounds", () => {
    const rows = buildFeatureRows(["textSize", "contrast"]);
    expect(moveRow(rows, 0, 1)[0].key).toBe("contrast");
    expect(moveRow(rows, 0, -1)[0].key).toBe("textSize");
  });
});
