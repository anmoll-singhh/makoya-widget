import { describe, it, expect } from "vitest";
import { isValidEmail } from "./email";

describe("isValidEmail", () => {
  it("accepts normal addresses", () => {
    expect(isValidEmail("you@business.com")).toBe(true);
    expect(isValidEmail("a.b+tag@sub.example.co.uk")).toBe(true);
  });

  it("rejects empty, malformed, or non-string values", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a @b.com")).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
  });

  it("rejects absurdly long input (header/DoS guard)", () => {
    expect(isValidEmail("a".repeat(250) + "@b.com")).toBe(false);
  });
});
