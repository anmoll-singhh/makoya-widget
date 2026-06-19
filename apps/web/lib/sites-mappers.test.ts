import { describe, it, expect } from "vitest";
import { rowToConfig, configToRow } from "./sites-mappers";

describe("sites mappers", () => {
  it("rowToConfig maps snake_case row to camelCase config", () => {
    const row = {
      site_id: "s1", primary_color: "#111111", position: "top-left",
      launcher_icon: "eye", features_enabled: ["textSize"], hide_branding: true,
    };
    expect(rowToConfig(row)).toEqual({
      siteId: "s1", primaryColor: "#111111", position: "top-left",
      launcherIcon: "eye", featuresEnabled: ["textSize"], hideBranding: true,
    });
  });
  it("configToRow only includes provided fields, snake_cased", () => {
    expect(configToRow({ primaryColor: "#222", hideBranding: false })).toEqual({
      primary_color: "#222", hide_branding: false,
    });
    expect(configToRow({ launcherIcon: "adjust" })).toEqual({ launcher_icon: "adjust" });
  });
});
