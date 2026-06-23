import { describe, it, expect } from "vitest";
import { isPublicHttpUrl } from "./public-url";

describe("isPublicHttpUrl", () => {
  it("accepts ordinary public https URLs", () => {
    expect(isPublicHttpUrl("https://example.com")).toBe(true);
    expect(isPublicHttpUrl("https://www.wavesmvmnt.com/pricing?x=1")).toBe(true);
    expect(isPublicHttpUrl("http://example.org")).toBe(true);
  });

  it("accepts bare domains by assuming https", () => {
    expect(isPublicHttpUrl("example.com")).toBe(true);
    expect(isPublicHttpUrl("  sub.example.co.uk  ")).toBe(true);
  });

  it("rejects non-string / empty / over-long input", () => {
    expect(isPublicHttpUrl(undefined)).toBe(false);
    expect(isPublicHttpUrl(null)).toBe(false);
    expect(isPublicHttpUrl(123)).toBe(false);
    expect(isPublicHttpUrl("")).toBe(false);
    expect(isPublicHttpUrl("   ")).toBe(false);
    expect(isPublicHttpUrl("https://example.com/" + "a".repeat(3000))).toBe(false);
  });

  it("rejects non-http(s) schemes", () => {
    expect(isPublicHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isPublicHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isPublicHttpUrl("data:text/html,<h1>x</h1>")).toBe(false);
    expect(isPublicHttpUrl("ftp://example.com")).toBe(false);
    expect(isPublicHttpUrl("gopher://example.com")).toBe(false);
  });

  it("rejects localhost and loopback", () => {
    expect(isPublicHttpUrl("http://localhost")).toBe(false);
    expect(isPublicHttpUrl("http://localhost:3000")).toBe(false);
    expect(isPublicHttpUrl("http://127.0.0.1")).toBe(false);
    expect(isPublicHttpUrl("http://127.1.2.3:8080")).toBe(false);
    expect(isPublicHttpUrl("http://0.0.0.0")).toBe(false);
  });

  it("rejects private and reserved IPv4 ranges", () => {
    expect(isPublicHttpUrl("http://10.0.0.5")).toBe(false);
    expect(isPublicHttpUrl("http://192.168.1.1")).toBe(false);
    expect(isPublicHttpUrl("http://172.16.0.1")).toBe(false);
    expect(isPublicHttpUrl("http://172.31.255.255")).toBe(false);
    expect(isPublicHttpUrl("http://169.254.169.254")).toBe(false); // cloud metadata
    expect(isPublicHttpUrl("http://100.64.0.1")).toBe(false); // CGNAT
  });

  it("accepts a public IPv4 that merely starts with allowed octets", () => {
    expect(isPublicHttpUrl("http://172.15.0.1")).toBe(true); // just below 172.16/12
    expect(isPublicHttpUrl("http://8.8.8.8")).toBe(true);
  });

  it("rejects loopback / unique-local / link-local IPv6", () => {
    expect(isPublicHttpUrl("http://[::1]")).toBe(false);
    expect(isPublicHttpUrl("http://[::]")).toBe(false);
    expect(isPublicHttpUrl("http://[fd00::1]")).toBe(false);
    expect(isPublicHttpUrl("http://[fe80::1]")).toBe(false);
  });

  it("rejects .local mDNS and bare single-label hostnames", () => {
    expect(isPublicHttpUrl("http://printer.local")).toBe(false);
    expect(isPublicHttpUrl("http://my-nas.local")).toBe(false);
    expect(isPublicHttpUrl("http://router")).toBe(false);
    expect(isPublicHttpUrl("intranet")).toBe(false);
  });

  it("rejects cloud metadata hostnames", () => {
    expect(isPublicHttpUrl("http://metadata.google.internal")).toBe(false);
  });
});
