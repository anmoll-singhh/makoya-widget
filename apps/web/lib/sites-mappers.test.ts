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
      customTriggerSelector: "", domObserverEnabled: true,
      inheritFonts: false, mobileEnabled: true,
      launcherShape: "circle", offsetX: 0, offsetY: 0,
      aiSimplifyEnabled: false,
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

describe("widget runtime config extras mapping (v3.1)", () => {
  it("rowToConfig defaults runtime extras when columns are absent", () => {
    const cfg = rowToConfig({
      site_id: "s1", primary_color: "#000", position: "bottom-right",
      launcher_icon: "eye", features_enabled: ["textSize"], hide_branding: false,
    });
    expect(cfg.customTriggerSelector).toBe("");
    expect(cfg.domObserverEnabled).toBe(true);
    expect(cfg.inheritFonts).toBe(false);
    expect(cfg.mobileEnabled).toBe(true);
  });
  it("rowToConfig maps the runtime-extra columns when present", () => {
    const cfg = rowToConfig({
      site_id: "s1", primary_color: "#000", position: "bottom-right",
      launcher_icon: "eye", features_enabled: ["textSize"], hide_branding: false,
      custom_trigger_selector: "#open", dom_observer_enabled: false,
      inherit_fonts: true, mobile_enabled: false,
    });
    expect(cfg.customTriggerSelector).toBe("#open");
    expect(cfg.domObserverEnabled).toBe(false);
    expect(cfg.inheritFonts).toBe(true);
    expect(cfg.mobileEnabled).toBe(false);
  });
  it("configToRow round-trips the runtime extras in snake_case", () => {
    const row = configToRow({
      customTriggerSelector: "#open", domObserverEnabled: false,
      inheritFonts: true, mobileEnabled: false,
    });
    expect(row.custom_trigger_selector).toBe("#open");
    expect(row.dom_observer_enabled).toBe(false);
    expect(row.inherit_fonts).toBe(true);
    expect(row.mobile_enabled).toBe(false);
  });
  it("configToRow omits runtime extras that are not provided", () => {
    const row = configToRow({ customTriggerSelector: "#open" });
    expect(row.custom_trigger_selector).toBe("#open");
    expect(row.dom_observer_enabled).toBeUndefined();
    expect(row.inherit_fonts).toBeUndefined();
    expect(row.mobile_enabled).toBeUndefined();
  });
});

describe("launcher shape + offset mapping (Tasks 1 + 3)", () => {
  it("rowToConfig defaults shape=circle and offsets=0 when columns absent", () => {
    const cfg = rowToConfig({
      site_id: "s1", primary_color: "#000", position: "bottom-right",
      launcher_icon: "eye", features_enabled: [], hide_branding: false,
    });
    expect(cfg.launcherShape).toBe("circle");
    expect(cfg.offsetX).toBe(0);
    expect(cfg.offsetY).toBe(0);
  });
  it("rowToConfig maps launcher_shape, offset_x, offset_y when present", () => {
    const cfg = rowToConfig({
      site_id: "s1", primary_color: "#000", position: "bottom-right",
      launcher_icon: "eye", features_enabled: [], hide_branding: false,
      launcher_shape: "rounded", offset_x: 24, offset_y: -8,
    });
    expect(cfg.launcherShape).toBe("rounded");
    expect(cfg.offsetX).toBe(24);
    expect(cfg.offsetY).toBe(-8);
  });
  it("configToRow round-trips shape and offsets in snake_case", () => {
    const row = configToRow({ launcherShape: "square", offsetX: 16, offsetY: -4 });
    expect(row.launcher_shape).toBe("square");
    expect(row.offset_x).toBe(16);
    expect(row.offset_y).toBe(-4);
  });
  it("configToRow omits shape/offset when not provided", () => {
    const row = configToRow({ primaryColor: "#abc" });
    expect(row.launcher_shape).toBeUndefined();
    expect(row.offset_x).toBeUndefined();
    expect(row.offset_y).toBeUndefined();
  });
});
