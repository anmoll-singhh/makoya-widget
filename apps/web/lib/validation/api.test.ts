import { describe, it, expect } from "vitest";
import {
  publicScanBodySchema,
  scanIngestBodySchema,
  reportPdfBodySchema,
  consultationBodySchema,
  emailSchema,
  parsedHttpUrlSchema,
  parseBody,
} from "./api";

describe("emailSchema", () => {
  it("accepts plausible emails", () => {
    expect(emailSchema.safeParse("a@b.co").success).toBe(true);
    expect(emailSchema.safeParse("first.last@sub.example.com").success).toBe(true);
  });
  it("rejects malformed / oversized emails", () => {
    expect(emailSchema.safeParse("nope").success).toBe(false);
    expect(emailSchema.safeParse("a@b").success).toBe(false);
    expect(emailSchema.safeParse("a b@c.com").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
    expect(emailSchema.safeParse("a@b.co" + "x".repeat(300)).success).toBe(false);
    expect(emailSchema.safeParse(123).success).toBe(false);
  });
});

describe("parsedHttpUrlSchema", () => {
  it("accepts http(s) URLs", () => {
    expect(parsedHttpUrlSchema.safeParse("https://example.com").success).toBe(true);
    expect(parsedHttpUrlSchema.safeParse("http://example.org/x?y=1").success).toBe(true);
  });
  it("rejects non-http(s) and junk", () => {
    expect(parsedHttpUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(parsedHttpUrlSchema.safeParse("ftp://example.com").success).toBe(false);
    expect(parsedHttpUrlSchema.safeParse("not a url").success).toBe(false);
    expect(parsedHttpUrlSchema.safeParse("").success).toBe(false);
  });
  it("rejects over-long URLs", () => {
    expect(parsedHttpUrlSchema.safeParse("https://e.com/" + "a".repeat(3000)).success).toBe(false);
  });
});

describe("publicScanBodySchema", () => {
  it("accepts a bare/url string", () => {
    expect(publicScanBodySchema.safeParse({ url: "example.com" }).success).toBe(true);
    expect(publicScanBodySchema.safeParse({ url: "https://example.com" }).success).toBe(true);
  });
  it("rejects missing/empty/non-string url", () => {
    expect(publicScanBodySchema.safeParse({}).success).toBe(false);
    expect(publicScanBodySchema.safeParse({ url: "" }).success).toBe(false);
    expect(publicScanBodySchema.safeParse({ url: 5 }).success).toBe(false);
    expect(publicScanBodySchema.safeParse(null).success).toBe(false);
  });
});

describe("scanIngestBodySchema", () => {
  it("accepts a valid lead", () => {
    const r = scanIngestBodySchema.safeParse({
      email: "lead@example.com",
      url: "https://example.com",
      score: 72,
      totals: { critical: 1, serious: 2, moderate: 0, minor: 3 },
    });
    expect(r.success).toBe(true);
  });
  it("requires a valid email and url", () => {
    expect(scanIngestBodySchema.safeParse({ email: "x", url: "https://e.com" }).success).toBe(false);
    expect(scanIngestBodySchema.safeParse({ email: "a@b.co", url: "nope" }).success).toBe(false);
  });
  it("tolerates loose / missing score+totals (route re-normalises)", () => {
    expect(
      scanIngestBodySchema.safeParse({ email: "a@b.co", url: "https://e.com" }).success
    ).toBe(true);
    expect(
      scanIngestBodySchema.safeParse({ email: "a@b.co", url: "https://e.com", score: "junk", totals: 1 })
        .success
    ).toBe(true);
  });
});

describe("reportPdfBodySchema", () => {
  it("accepts a valid report payload", () => {
    const r = reportPdfBodySchema.safeParse({
      email: "a@b.co",
      url: "https://example.com",
      score: 80,
      totals: { critical: 0, serious: 1, moderate: 2, minor: 3 },
      topIssues: [{ id: "img-alt", impact: "serious", help: "x" }],
      isPartialScan: false,
    });
    expect(r.success).toBe(true);
  });
  it("requires email (the PDF is the lead magnet)", () => {
    expect(reportPdfBodySchema.safeParse({ url: "https://e.com" }).success).toBe(false);
  });
  it("rejects an absurdly large topIssues array (DoS guard)", () => {
    const big = Array.from({ length: 5000 }, () => ({ id: "x" }));
    expect(
      reportPdfBodySchema.safeParse({ email: "a@b.co", url: "https://e.com", topIssues: big }).success
    ).toBe(false);
  });
});

describe("consultationBodySchema", () => {
  it("accepts valid bodies", () => {
    expect(consultationBodySchema.safeParse({ siteId: "abc" }).success).toBe(true);
    expect(consultationBodySchema.safeParse({ siteId: "abc", type: "book_call" }).success).toBe(true);
  });
  it("rejects missing siteId or bad type", () => {
    expect(consultationBodySchema.safeParse({}).success).toBe(false);
    expect(consultationBodySchema.safeParse({ siteId: "" }).success).toBe(false);
    expect(consultationBodySchema.safeParse({ siteId: "abc", type: "delete" }).success).toBe(false);
  });
});

describe("parseBody", () => {
  it("returns ok+data on success", () => {
    const r = parseBody(consultationBodySchema, { siteId: "s1" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.siteId).toBe("s1");
  });
  it("returns ok:false and NO error detail on failure", () => {
    const r = parseBody(consultationBodySchema, { nope: true });
    expect(r.ok).toBe(false);
    expect(Object.keys(r)).toEqual(["ok"]);
  });
});
