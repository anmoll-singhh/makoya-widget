import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, LAUNCHER_ICONS, resolveConfig } from "@makoya/shared";

describe("shared launcher icons", () => {
  it("default launcher icon is accessibility", () => {
    expect(DEFAULT_CONFIG.launcherIcon).toBe("accessibility");
  });
  it("LAUNCHER_ICONS has all 4 keys and each is an <svg> string", () => {
    for (const k of ["accessibility", "person", "eye", "adjust"] as const) {
      expect(typeof LAUNCHER_ICONS[k]).toBe("string");
      expect(LAUNCHER_ICONS[k]).toContain("<svg");
    }
  });
  it("resolveConfig keeps a provided launcherIcon and fills the default otherwise", () => {
    expect(resolveConfig("s1", { launcherIcon: "eye" }).launcherIcon).toBe("eye");
    expect(resolveConfig("s1", {}).launcherIcon).toBe("accessibility");
  });
});

describe("expanded widget config", () => {
  it("DEFAULT_CONFIG exposes all 16 feature keys", () => {
    expect(DEFAULT_CONFIG.featuresEnabled).toEqual([
      "textSize","lineSpacing","contrast","stopMotion","readingRuler",
      "highlightLinks","bigCursor","readableFont","hideImages",
      "saturation","readingMask","highlightTitles","textAlign","muteSounds","readAloud",
      "highlightHover",
    ]);
  });
  it("DEFAULT_CONFIG has the new scalar fields with safe defaults", () => {
    expect(DEFAULT_CONFIG.launcherSize).toBe("md");
    expect(DEFAULT_CONFIG.defaultProfile).toBe("none");
    expect(DEFAULT_CONFIG.accessibilityStatementUrl).toBe("");
    expect(DEFAULT_CONFIG.defaultLanguage).toBe("en");
    expect(DEFAULT_CONFIG.panelTitle).toBe("");
  });
  it("resolveConfig fills new fields from defaults and keeps provided values", () => {
    expect(resolveConfig("s1", {}).launcherSize).toBe("md");
    expect(resolveConfig("s1", { launcherSize: "lg", defaultLanguage: "es" }).launcherSize).toBe("lg");
    expect(resolveConfig("s1", { defaultLanguage: "es" }).defaultLanguage).toBe("es");
  });
});

describe("widget runtime config extras (v3.1)", () => {
  it("DEFAULT_CONFIG has the runtime-extra fields with safe defaults", () => {
    expect(DEFAULT_CONFIG.customTriggerSelector).toBe("");
    expect(DEFAULT_CONFIG.domObserverEnabled).toBe(true);
    expect(DEFAULT_CONFIG.inheritFonts).toBe(false);
    expect(DEFAULT_CONFIG.mobileEnabled).toBe(true);
  });
  it("resolveConfig fills runtime extras from defaults when absent", () => {
    const c = resolveConfig("s1", {});
    expect(c.customTriggerSelector).toBe("");
    expect(c.domObserverEnabled).toBe(true);
    expect(c.inheritFonts).toBe(false);
    expect(c.mobileEnabled).toBe(true);
  });
  it("resolveConfig keeps provided runtime extras", () => {
    const c = resolveConfig("s1", {
      customTriggerSelector: "#a11y",
      domObserverEnabled: false,
      inheritFonts: true,
      mobileEnabled: false,
    });
    expect(c.customTriggerSelector).toBe("#a11y");
    expect(c.domObserverEnabled).toBe(false);
    expect(c.inheritFonts).toBe(true);
    expect(c.mobileEnabled).toBe(false);
  });
});
