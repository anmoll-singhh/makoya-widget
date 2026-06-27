/**
 * injection-honeypot.test.ts — guards the "Caught in 4K" gag detector.
 *
 * This is theatre, not security (see injection-honeypot.ts), but it still needs to
 * (a) trip on classic injection payloads so the gag fires, and (b) NOT trip on
 * ordinary credentials — including reasonably spicy passwords — so we don't lock
 * real users out of the auth path.
 */
import { describe, it, expect } from "vitest";
import { detectSqlInjection } from "./injection-honeypot";

describe("detectSqlInjection", () => {
  it("trips on classic injection / probe payloads", () => {
    const payloads = [
      "' OR 1=1 --",
      "admin'--",
      "x' OR 'a'='a",
      "1; DROP TABLE users",
      "UNION SELECT password FROM users",
      "'; DROP TABLE leads;--",
      "<script>alert(1)</script>",
      "'; WAITFOR DELAY '0:0:5'--",
      "1 AND SLEEP(5)",
      "EXEC xp_cmdshell('dir')",
    ];
    for (const p of payloads) {
      expect(detectSqlInjection(p), p).toBe(true);
    }
  });

  it("does not trip on ordinary credentials", () => {
    const clean = [
      ["you@company.com", "Tr0ub4dor&3"],
      ["jane.doe+test@example.co.uk", "correct-horse-battery"],
      ["", ""],
      ["owner@makoya.app", "P@ssw0rd!2024"],
      ["a.b@c.io", "my favourite dog is Rex"],
    ];
    for (const [email, password] of clean) {
      expect(detectSqlInjection(email, password), `${email} / ${password}`).toBe(false);
    }
  });

  it("checks every supplied field (email or password)", () => {
    expect(detectSqlInjection("normal@example.com", "' OR 1=1--")).toBe(true);
    expect(detectSqlInjection("' OR 1=1--", "normalpass")).toBe(true);
  });
});
