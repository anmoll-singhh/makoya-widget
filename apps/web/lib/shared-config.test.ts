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
  it("DEFAULT_CONFIG exposes all 15 feature keys", () => {
    expect(DEFAULT_CONFIG.featuresEnabled).toEqual([
      "textSize","lineSpacing","contrast","stopMotion","readingRuler",
      "highlightLinks","bigCursor","readableFont","hideImages",
      "saturation","readingMask","highlightTitles","textAlign","muteSounds","readAloud",
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
