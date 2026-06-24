import { describe, it, expect } from "vitest";
import {
  isPublicHttpUrl,
  isDisallowedIp,
  anyDisallowedAddress,
} from "./public-url";

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

describe("isDisallowedIp (resolved-IP SSRF classifier)", () => {
  it("allows ordinary public IPv4 addresses", () => {
    expect(isDisallowedIp("8.8.8.8")).toBe(false);
    expect(isDisallowedIp("1.1.1.1")).toBe(false);
    expect(isDisallowedIp("172.15.0.1")).toBe(false); // just below 172.16/12
    expect(isDisallowedIp("172.32.0.1")).toBe(false); // just above 172.16/12
    expect(isDisallowedIp("100.63.255.255")).toBe(false); // just below CGNAT
    expect(isDisallowedIp("100.128.0.1")).toBe(false); // just above CGNAT
    expect(isDisallowedIp("11.0.0.1")).toBe(false);
  });

  it("rejects IPv4 loopback (127.0.0.0/8)", () => {
    expect(isDisallowedIp("127.0.0.1")).toBe(true);
    expect(isDisallowedIp("127.1.2.3")).toBe(true);
    expect(isDisallowedIp("127.255.255.255")).toBe(true);
  });

  it("rejects IPv4 private ranges (RFC 1918)", () => {
    expect(isDisallowedIp("10.0.0.1")).toBe(true);
    expect(isDisallowedIp("10.255.255.255")).toBe(true);
    expect(isDisallowedIp("192.168.0.1")).toBe(true);
    expect(isDisallowedIp("192.168.255.255")).toBe(true);
    expect(isDisallowedIp("172.16.0.1")).toBe(true);
    expect(isDisallowedIp("172.31.255.255")).toBe(true);
    expect(isDisallowedIp("172.20.10.5")).toBe(true);
  });

  it("rejects IPv4 link-local incl. cloud metadata (169.254/16)", () => {
    expect(isDisallowedIp("169.254.0.1")).toBe(true);
    expect(isDisallowedIp("169.254.169.254")).toBe(true); // AWS/GCP metadata
  });

  it("rejects IPv4 CGNAT (100.64/10)", () => {
    expect(isDisallowedIp("100.64.0.1")).toBe(true);
    expect(isDisallowedIp("100.127.255.255")).toBe(true);
    expect(isDisallowedIp("100.100.0.1")).toBe(true);
  });

  it("rejects IPv4 unspecified (0.0.0.0 / 0/8)", () => {
    expect(isDisallowedIp("0.0.0.0")).toBe(true);
    expect(isDisallowedIp("0.1.2.3")).toBe(true);
  });

  it("rejects IPv6 loopback and unspecified", () => {
    expect(isDisallowedIp("::1")).toBe(true);
    expect(isDisallowedIp("::")).toBe(true);
    expect(isDisallowedIp("0:0:0:0:0:0:0:1")).toBe(true);
  });

  it("rejects IPv6 unique-local (fc00::/7)", () => {
    expect(isDisallowedIp("fc00::1")).toBe(true);
    expect(isDisallowedIp("fd12:3456:789a::1")).toBe(true);
    expect(isDisallowedIp("FD00::1")).toBe(true); // case-insensitive
  });

  it("rejects IPv6 link-local (fe80::/10)", () => {
    expect(isDisallowedIp("fe80::1")).toBe(true);
    expect(isDisallowedIp("febf::1")).toBe(true); // top of fe80::/10
  });

  it("rejects IPv4-mapped IPv6 forms of disallowed addresses", () => {
    expect(isDisallowedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isDisallowedIp("::ffff:10.0.0.1")).toBe(true);
    expect(isDisallowedIp("::ffff:169.254.169.254")).toBe(true);
    expect(isDisallowedIp("::ffff:192.168.1.1")).toBe(true);
    // hex-encoded IPv4-mapped form (::ffff:7f00:1 == 127.0.0.1)
    expect(isDisallowedIp("::ffff:7f00:0001")).toBe(true);
  });

  it("allows IPv4-mapped IPv6 of a public address", () => {
    expect(isDisallowedIp("::ffff:8.8.8.8")).toBe(false);
  });

  it("allows ordinary public/global IPv6", () => {
    expect(isDisallowedIp("2606:4700:4700::1111")).toBe(false); // Cloudflare DNS
    expect(isDisallowedIp("2001:4860:4860::8888")).toBe(false); // Google DNS
  });

  it("treats unparseable / empty input as disallowed (fail closed)", () => {
    expect(isDisallowedIp("")).toBe(true);
    expect(isDisallowedIp("not-an-ip")).toBe(true);
    expect(isDisallowedIp("999.999.999.999")).toBe(true);
    expect(isDisallowedIp(undefined)).toBe(true);
    expect(isDisallowedIp(123)).toBe(true);
  });
});

describe("anyDisallowedAddress", () => {
  it("returns false only when every address is public", () => {
    expect(anyDisallowedAddress([{ address: "8.8.8.8" }, { address: "1.1.1.1" }])).toBe(false);
  });

  it("returns true if ANY resolved address is disallowed (DNS rebinding)", () => {
    expect(anyDisallowedAddress([{ address: "8.8.8.8" }, { address: "127.0.0.1" }])).toBe(true);
    expect(anyDisallowedAddress([{ address: "169.254.169.254" }])).toBe(true);
  });

  it("fails closed on an empty list", () => {
    expect(anyDisallowedAddress([])).toBe(true);
  });
});
