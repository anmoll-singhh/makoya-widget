import { describe, it, expect } from "vitest";
import { rowToActivity, clampLimit } from "./activity";

describe("rowToActivity", () => {
  it("maps a snake_case row to a camelCase ActivityEntry", () => {
    const row = {
      id: "act-1",
      site_id: "site-1",
      actor: "specialist",
      type: "issue_resolved",
      summary: "Fixed missing alt text on hero image",
      wcag_ref: "1.1.1",
      created_at: "2026-06-26T12:00:00Z",
    };
    const a = rowToActivity(row);
    expect(a.id).toBe("act-1");
    expect(a.siteId).toBe("site-1");
    expect(a.actor).toBe("specialist");
    expect(a.type).toBe("issue_resolved");
    expect(a.summary).toBe("Fixed missing alt text on hero image");
    expect(a.wcagRef).toBe("1.1.1");
    expect(a.createdAt).toBe("2026-06-26T12:00:00Z");
  });

  it("tolerates a null wcag_ref", () => {
    const a = rowToActivity({
      id: "act-2",
      site_id: "site-1",
      actor: "system",
      type: "scan_completed",
      summary: "Scan finished",
      wcag_ref: null,
      created_at: "2026-06-26T12:00:00Z",
    });
    expect(a.wcagRef).toBeNull();
  });

  it("defaults actor to 'system' when missing", () => {
    const a = rowToActivity({
      id: "act-3",
      site_id: "site-1",
      actor: null,
      type: "scan_completed",
      summary: "Scan finished",
      wcag_ref: null,
      created_at: "2026-06-26T12:00:00Z",
    });
    expect(a.actor).toBe("system");
  });
});

describe("clampLimit", () => {
  it("returns the value when within range", () => {
    expect(clampLimit(20, 1, 100, 20)).toBe(20);
  });

  it("clamps below the minimum up to min", () => {
    expect(clampLimit(0, 1, 100, 20)).toBe(1);
    expect(clampLimit(-5, 1, 100, 20)).toBe(1);
  });

  it("clamps above the maximum down to max", () => {
    expect(clampLimit(500, 1, 100, 20)).toBe(100);
  });

  it("uses the default for non-finite input", () => {
    expect(clampLimit(NaN, 1, 100, 20)).toBe(20);
    expect(clampLimit(undefined as unknown as number, 1, 100, 20)).toBe(20);
  });

  it("floors fractional values", () => {
    expect(clampLimit(15.9, 1, 100, 20)).toBe(15);
  });
});
