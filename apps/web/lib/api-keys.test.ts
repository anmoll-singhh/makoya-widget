import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey, verifyApiKey } from "./api-keys";

describe("hashApiKey", () => {
  it("is deterministic: same raw → same hash", () => {
    expect(hashApiKey("mky_abc")).toBe(hashApiKey("mky_abc"));
  });
  it("differs for different raw", () => {
    expect(hashApiKey("mky_abc")).not.toBe(hashApiKey("mky_xyz"));
  });
  it("returns lowercase hex sha256 (64 chars)", () => {
    expect(hashApiKey("mky_abc")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("verifyApiKey", () => {
  it("matches a raw key against its own hash", () => {
    const raw = "mky_secret-value";
    expect(verifyApiKey(raw, hashApiKey(raw))).toBe(true);
  });
  it("rejects a wrong raw key", () => {
    expect(verifyApiKey("mky_wrong", hashApiKey("mky_right"))).toBe(false);
  });
  it("rejects a malformed/short hash without throwing", () => {
    expect(verifyApiKey("mky_x", "deadbeef")).toBe(false);
    expect(verifyApiKey("mky_x", "")).toBe(false);
  });
});

describe("generateApiKey", () => {
  it("returns a raw key prefixed with mky_", () => {
    expect(generateApiKey().raw.startsWith("mky_")).toBe(true);
  });
  it("derives prefix as the first 8 chars of raw", () => {
    const k = generateApiKey();
    expect(k.prefix).toBe(k.raw.slice(0, 8));
    expect(k.prefix.length).toBe(8);
  });
  it("derives hash = sha256(raw) so verifyApiKey matches", () => {
    const k = generateApiKey();
    expect(k.hash).toBe(hashApiKey(k.raw));
    expect(verifyApiKey(k.raw, k.hash)).toBe(true);
  });
  it("produces a unique raw key each call", () => {
    expect(generateApiKey().raw).not.toBe(generateApiKey().raw);
  });
});
