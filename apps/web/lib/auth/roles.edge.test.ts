/**
 * lib/auth/roles.edge.test.ts
 *
 * Admin gating is the only thing standing between a normal client and the CRM
 * (customer list, plans, leads). `isAdmin` is the single allowlist check, so its
 * edge cases matter for security. The existing roles.test.ts covers the basics;
 * this hardens the parsing: messy allowlists, whitespace/case, look-alike
 * addresses, and substring false-positives.
 *
 * Pure function — env-free.
 */
import { describe, it, expect } from "vitest";
import { isAdmin } from "./roles";

describe("isAdmin — allowlist parsing edge cases", () => {
  it("handles a messy allowlist (extra spaces, mixed case, trailing commas, blanks)", () => {
    const list = "  Admin@Makoya.com , ,  ops@MAKOYA.com ,,";
    expect(isAdmin("admin@makoya.com", list)).toBe(true);
    expect(isAdmin("OPS@makoya.com", list)).toBe(true);
    expect(isAdmin("nope@makoya.com", list)).toBe(false);
  });

  it("trims and lowercases BOTH the candidate and the allowlist entries", () => {
    expect(isAdmin("  ADMIN@x.com  ", "admin@x.com")).toBe(true);
  });

  it("does NOT match on substrings or look-alike addresses", () => {
    const list = "admin@makoya.com";
    expect(isAdmin("admin@makoya.com.evil.com", list)).toBe(false);
    expect(isAdmin("xadmin@makoya.com", list)).toBe(false);
    expect(isAdmin("admin@makoya.co", list)).toBe(false);
  });

  it("returns false for an empty / whitespace-only allowlist", () => {
    expect(isAdmin("admin@x.com", "")).toBe(false);
    expect(isAdmin("admin@x.com", "   ")).toBe(false);
    expect(isAdmin("admin@x.com", " , , ")).toBe(false);
  });

  it("returns false for null / undefined / empty candidate email", () => {
    expect(isAdmin(null, "admin@x.com")).toBe(false);
    expect(isAdmin(undefined, "admin@x.com")).toBe(false);
    expect(isAdmin("", "admin@x.com")).toBe(false);
    expect(isAdmin("   ", "admin@x.com")).toBe(false);
  });

  it("matches any entry in a multi-admin allowlist", () => {
    const list = "a@x.com,b@x.com,c@x.com";
    expect(isAdmin("b@x.com", list)).toBe(true);
    expect(isAdmin("d@x.com", list)).toBe(false);
  });
});
