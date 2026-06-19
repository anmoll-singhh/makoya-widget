import { describe, it, expect } from "vitest";
import { isValidPlan, isValidStatus } from "./admin-constants";

describe("admin-constants", () => {
  it("isValidPlan accepts known plans, rejects others", () => {
    expect(isValidPlan("free")).toBe(true);
    expect(isValidPlan("pro")).toBe(true);
    expect(isValidPlan("managed")).toBe(true);
    expect(isValidPlan("enterprise")).toBe(false);
    expect(isValidPlan("")).toBe(false);
  });
  it("isValidStatus accepts known statuses, rejects others", () => {
    expect(isValidStatus("new")).toBe(true);
    expect(isValidStatus("won")).toBe(true);
    expect(isValidStatus("deleted")).toBe(false);
  });
});
