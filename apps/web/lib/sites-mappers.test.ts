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
      launcherSize: "md", defaultProfile: "none",
      accessibilityStatementUrl: "", defaultLanguage: "en", panelTitle: "",
    });
  });
  it("configToRow only includes provided fields, snake_cased", () => {
    expect(configToRow({ primaryColor: "#222", hideBranding: false })).toEqual({
      primary_color: "#222", hide_branding: false,
    });
    expect(configToRow({ launcherIcon: "adjust" })).toEqual({ launcher_icon: "adjust" });
  });
});

describe("widget config v3 mapping", () => {
  it("rowToConfig maps the new columns", () => {
    const cfg = rowToConfig({
      site_id: "s1", primary_color: "#000", position: "bottom-right",
      launcher_icon: "eye", features_enabled: ["textSize"], hide_branding: true,
      launcher_size: "lg", default_profile: "dyslexia",
      accessibility_statement_url: "https://x/a11y", default_language: "fr", panel_title: "Help",
    });
    expect(cfg.launcherSize).toBe("lg");
    expect(cfg.defaultProfile).toBe("dyslexia");
    expect(cfg.accessibilityStatementUrl).toBe("https://x/a11y");
    expect(cfg.defaultLanguage).toBe("fr");
    expect(cfg.panelTitle).toBe("Help");
  });
  it("configToRow writes only provided new fields in snake_case", () => {
    const row = configToRow({ launcherSize: "sm", panelTitle: "Hi" });
    expect(row.launcher_size).toBe("sm");
    expect(row.panel_title).toBe("Hi");
    expect(row.default_language).toBeUndefined();
  });
});
