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
  it("DEFAULT_CONFIG exposes all 35 feature keys in canonical order", () => {
    expect(DEFAULT_CONFIG.featuresEnabled).toEqual([
      "contentScale",
      "textSize",
      "lineSpacing",
      "letterSpacing",
      "readableFont",
      "textAlign",
      "highlightTitles",
      "highlightLinks",
      "hideImages",
      "stopMotion",
      "contrast",
      "saturation",
      "textColor",
      "titleColor",
      "bgColor",
      "readingMask",
      "readingRuler",
      "bigCursor",
      "highlightHover",
      "biggerTargets",
      "focusIndicator",
      "magnifier",
      "readMode",
      "usefulLinks",
      "pageStructure",
      "keyboardNav",
      "virtualKeyboard",
      "voiceNav",
      "muteSounds",
      "readAloud",
      "dictionary",
      "feedbackForm",
      "hideInterface",
      "userGuide",
      "aiSimplify",
    ]);
  });
  it("DEFAULT_CONFIG has the new scalar fields with safe defaults", () => {
    expect(DEFAULT_CONFIG.launcherSize).toBe("md");
    expect(DEFAULT_CONFIG.defaultProfile).toBe("none");
    expect(DEFAULT_CONFIG.accessibilityStatementUrl).toBe("");
    expect(DEFAULT_CONFIG.defaultLanguage).toBe("en");
    expect(DEFAULT_CONFIG.panelTitle).toBe("");
    expect(DEFAULT_CONFIG.aiSimplifyEnabled).toBe(false);
  });
  it("resolveConfig fills new fields from defaults and keeps provided values", () => {
    expect(resolveConfig("s1", {}).launcherSize).toBe("md");
    expect(resolveConfig("s1", { launcherSize: "lg", defaultLanguage: "es" }).launcherSize).toBe(
      "lg"
    );
    expect(resolveConfig("s1", { defaultLanguage: "es" }).defaultLanguage).toBe("es");
  });
});

describe("legacy featuresEnabled backfill (accessiBe-parity expansion)", () => {
  it("surfaces the new features on a legacy-only list, keeping legacy on/off", () => {
    const c = resolveConfig("s1", { featuresEnabled: ["textSize", "contrast", "saturation"] });
    // new features appear...
    expect(c.featuresEnabled).toContain("textColor");
    expect(c.featuresEnabled).toContain("titleColor");
    expect(c.featuresEnabled).toContain("bgColor");
    expect(c.featuresEnabled).toContain("magnifier");
    // ...the owner's enabled legacy features are kept...
    expect(c.featuresEnabled).toContain("textSize");
    expect(c.featuresEnabled).toContain("contrast");
    // ...and a legacy feature the owner did NOT enable stays hidden.
    expect(c.featuresEnabled).not.toContain("readAloud");
  });
  it("respects a list that already contains a new key (owner used new customizer)", () => {
    const c = resolveConfig("s1", { featuresEnabled: ["textSize", "magnifier"] });
    expect(c.featuresEnabled).toEqual(["textSize", "magnifier"]);
  });
  it("empty / absent featuresEnabled → the full default 35", () => {
    expect(resolveConfig("s1", {}).featuresEnabled).toHaveLength(35);
    expect(resolveConfig("s1", { featuresEnabled: [] }).featuresEnabled).toHaveLength(35);
  });
});

describe("launcher shape + position offsets (Tasks 1 + 3)", () => {
  it("DEFAULT_CONFIG has launcherShape='circle' and offsets=0", () => {
    expect(DEFAULT_CONFIG.launcherShape).toBe("circle");
    expect(DEFAULT_CONFIG.offsetX).toBe(0);
    expect(DEFAULT_CONFIG.offsetY).toBe(0);
  });
  it("resolveConfig fills launcherShape/offsets from defaults when absent", () => {
    const c = resolveConfig("s1", {});
    expect(c.launcherShape).toBe("circle");
    expect(c.offsetX).toBe(0);
    expect(c.offsetY).toBe(0);
  });
  it("resolveConfig keeps provided launcherShape and offsets", () => {
    const c = resolveConfig("s1", { launcherShape: "rounded", offsetX: 24, offsetY: -10 });
    expect(c.launcherShape).toBe("rounded");
    expect(c.offsetX).toBe(24);
    expect(c.offsetY).toBe(-10);
  });
  it("resolveConfig clamps offsets to ±200", () => {
    const c = resolveConfig("s1", { offsetX: 999, offsetY: -999 });
    expect(c.offsetX).toBe(200);
    expect(c.offsetY).toBe(-200);
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
