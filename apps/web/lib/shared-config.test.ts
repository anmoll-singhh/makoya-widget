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
