/**
 * lib/utils/url.test.ts
 *
 * Edge-case coverage for the scan-target URL validator + the never-throw display
 * helpers (hostOf / hostSlug / sanitiseUrl). These run env-free (pure functions).
 *
 * NOTE: this is the `lib/utils/url.ts` module (display helpers + validateScanUrl).
 * The separate SSRF allowlist module `lib/scan-utils/public-url.ts` is owned by a
 * different lane and is NOT tested here.
 */
import { describe, it, expect } from "vitest";
import { validateScanUrl, sanitiseUrl, hostOf, hostSlug } from "./url";
import { AppError } from "@/lib/utils/error";

describe("validateScanUrl", () => {
  it("accepts a well-formed https URL and returns a URL object", () => {
    const u = validateScanUrl("https://example.com/path?q=1");
    expect(u).toBeInstanceOf(URL);
    expect(u.hostname).toBe("example.com");
    expect(u.protocol).toBe("https:");
  });

  it("accepts a bare domain by prepending https://", () => {
    const u = validateScanUrl("wavesmvmnt.com");
    expect(u.protocol).toBe("https:");
    expect(u.hostname).toBe("wavesmvmnt.com");
  });

  it("trims surrounding whitespace before parsing", () => {
    const u = validateScanUrl("   https://example.com   ");
    expect(u.hostname).toBe("example.com");
  });

  it.each([
    ["empty string", ""],
    ["whitespace only", "   "],
    ["a number", 42],
    ["null", null],
    ["undefined", undefined],
    ["an object", { url: "x" }],
  ])("throws AppError(INVALID_URL, 422) for %s", (_label, raw) => {
    try {
      validateScanUrl(raw as unknown);
      throw new Error("expected validateScanUrl to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("INVALID_URL");
      expect((e as AppError).statusCode).toBe(422);
    }
  });

  it("rejects non-http(s) protocols (ftp, file, javascript, data)", () => {
    for (const bad of [
      "ftp://example.com",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "data:text/html,<script>1</script>",
    ]) {
      expect(() => validateScanUrl(bad)).toThrow(AppError);
    }
  });

  it("rejects localhost and loopback hostnames (SSRF)", () => {
    for (const bad of ["http://localhost", "https://localhost:3000", "http://0.0.0.0"]) {
      expect(() => validateScanUrl(bad)).toThrow(AppError);
    }
  });

  it("rejects private + reserved IP ranges (SSRF defence-in-depth)", () => {
    for (const bad of [
      "http://127.0.0.1",
      "http://10.0.0.5",
      "http://192.168.1.1",
      "http://172.16.0.1",
      "http://172.31.255.255",
      "http://169.254.169.254", // cloud metadata link-local
      "http://100.64.0.1", // CGNAT
      "http://metadata.google.internal",
    ]) {
      expect(() => validateScanUrl(bad)).toThrow(AppError);
    }
  });

  it("allows public IPs that look adjacent to private ranges but aren't", () => {
    // 172.15.x and 172.32.x are OUTSIDE the 172.16.0.0/12 private block.
    expect(() => validateScanUrl("http://172.15.0.1")).not.toThrow();
    expect(() => validateScanUrl("http://172.32.0.1")).not.toThrow();
    // 11.x is public, only 10.x is private.
    expect(() => validateScanUrl("http://11.0.0.1")).not.toThrow();
  });
});

describe("sanitiseUrl", () => {
  it("strips username, password, and fragment", () => {
    const u = new URL("https://user:secret@example.com/path?keep=1#section");
    const cleaned = sanitiseUrl(u);
    expect(cleaned).not.toContain("user");
    expect(cleaned).not.toContain("secret");
    expect(cleaned).not.toContain("#section");
    expect(cleaned).toContain("keep=1"); // query is preserved
  });

  it("leaves a clean URL essentially unchanged", () => {
    const u = new URL("https://example.com/a");
    expect(sanitiseUrl(u)).toBe("https://example.com/a");
  });
});

describe("hostOf (never throws)", () => {
  it("returns the host for a full URL", () => {
    expect(hostOf("https://shop.example.com/products")).toBe("shop.example.com");
  });

  it("includes the port when present", () => {
    expect(hostOf("https://example.com:8443/x")).toBe("example.com:8443");
  });

  it("tolerates a bare domain by retrying with https://", () => {
    expect(hostOf("shop.example")).toBe("shop.example");
  });

  it("falls back to the raw string for garbage input (never throws)", () => {
    expect(hostOf("::::not a url::::")).toBe("::::not a url::::");
    expect(hostOf("")).toBe("");
  });
});

describe("hostSlug (filesystem-safe)", () => {
  it("produces a filename-safe slug from a host", () => {
    expect(hostSlug("https://shop.example.com")).toBe("shop.example.com");
  });

  it("replaces unsafe characters with hyphens and trims them", () => {
    const slug = hostSlug("https://a b/c?d=e");
    expect(slug).not.toMatch(/[^a-z0-9.-]/i);
    expect(slug).not.toMatch(/^-|-$/);
  });

  it("caps length at 60 characters", () => {
    const long = "https://" + "x".repeat(200) + ".com";
    expect(hostSlug(long).length).toBeLessThanOrEqual(60);
  });

  it("falls back to 'site' when the host has no filesystem-safe characters", () => {
    // A host made only of stripped characters collapses to "" → "site".
    expect(hostSlug("___")).toBe("site");
  });
});
