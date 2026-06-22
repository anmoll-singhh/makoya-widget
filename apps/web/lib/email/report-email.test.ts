import { describe, it, expect } from "vitest";
import { buildReportEmail } from "./report-email";

const base = {
  to: "owner@shop.com",
  url: "https://shop.example/products",
  score: 72,
  totals: { critical: 1, serious: 3, moderate: 2, minor: 4 },
  appUrl: "https://makoya.app",
};

describe("buildReportEmail", () => {
  it("addresses the recipient and reflects the score + host in the subject", () => {
    const mail = buildReportEmail(base);
    expect(mail.to).toBe("owner@shop.com");
    expect(mail.subject).toContain("shop.example");
    expect(mail.subject).toContain("72");
  });

  it("includes the severity breakdown and a CTA link", () => {
    const mail = buildReportEmail(base);
    expect(mail.text).toContain("critical 1");
    expect(mail.html).toContain("Critical:");
    expect(mail.html).toContain("https://makoya.app/login");
  });

  it("NEVER makes compliance/legal-guarantee claims (honest-hybrid guardrail)", () => {
    const mail = buildReportEmail(base);
    const banned = /\b(WCAG[- ]?compliant|ADA[- ]?compliant|fully compliant|guaranteed|lawsuit-?proof)\b/i;
    expect(banned.test(mail.text)).toBe(false);
    expect(banned.test(mail.html)).toBe(false);
    expect(banned.test(mail.subject)).toBe(false);
  });

  it("computes total when omitted from totals", () => {
    const mail = buildReportEmail(base);
    // 1+3+2+4 = 10 issues should appear in the text summary
    expect(mail.text).toContain("Issues found: 10");
  });
});
