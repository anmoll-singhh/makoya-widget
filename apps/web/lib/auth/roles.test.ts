import { describe, it, expect } from "vitest";
import { isAdmin } from "./roles";

describe("isAdmin", () => {
  it("returns true for an email in the allowlist (case-insensitive, trimmed)", () => {
    expect(isAdmin("Me@Example.com", "me@example.com, other@x.com")).toBe(true);
  });
  it("returns false for an email not in the allowlist", () => {
    expect(isAdmin("client@site.com", "me@example.com")).toBe(false);
  });
  it("returns false for null/empty email or empty allowlist", () => {
    expect(isAdmin(null, "me@example.com")).toBe(false);
    expect(isAdmin("me@example.com", "")).toBe(false);
  });
});
