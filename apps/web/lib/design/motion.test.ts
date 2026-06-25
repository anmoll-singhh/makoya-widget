import { describe, it, expect } from "vitest";
import { EASE_INK, DUR, revealVariant, staggerParent, inkStroke } from "./motion";

describe("motion tokens", () => {
  it("exposes the ink ease + durations", () => {
    expect(EASE_INK).toEqual([0.22, 1, 0.36, 1]);
    expect(DUR.app).toBeLessThan(DUR.section);
  });
  it("reveal goes from hidden offset to resting", () => {
    expect(revealVariant.hidden).toMatchObject({ opacity: 0 });
    expect(revealVariant.visible.opacity).toBe(1);
  });
  it("stagger parent carries staggerChildren", () => {
    expect(staggerParent(0.05).visible.transition.staggerChildren).toBe(0.05);
  });
  it("ink stroke never loops", () => {
    expect(inkStroke.visible.transition.repeat ?? 0).toBe(0);
  });
});
