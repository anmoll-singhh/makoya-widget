/**
 * app/api/widget-simplify/route.test.ts
 *
 * Locks the OPT-IN AI simplify endpoint's gating: it must refuse (403/503)
 * BEFORE any model call when the per-site flag is off or no key is configured,
 * enforce CORS/origin/rate-limit/Zod, and only call Claude when every gate
 * passes. Runs env-free — Supabase, env, observability, and fetch are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const getSiteBundle = vi.fn();
const checkRateLimit = vi.fn();
let anthropicKey = "sk-ant-test";
const fetchMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({ __fake: true }) }));
vi.mock("@/lib/sites", () => ({ getSiteBundle: (...a: unknown[]) => getSiteBundle(...a) }));
vi.mock("@/lib/observability", () => ({ track: vi.fn(), captureError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: (...a: unknown[]) => checkRateLimit(...a) }));
vi.mock("@/lib/env.server", () => ({
  env: {
    get ANTHROPIC_API_KEY() {
      return anthropicKey;
    },
  },
}));

import { POST, OPTIONS } from "./route";

beforeEach(() => {
  checkRateLimit.mockReset();
  checkRateLimit.mockResolvedValue(false);
  anthropicKey = "sk-ant-test";
  getSiteBundle.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // Default: known site, flag ON, lenient origin.
  getSiteBundle.mockResolvedValue({
    site: { allowedDomains: [] },
    config: { aiSimplifyEnabled: true },
  });
});

function makeReq(body: unknown, origin = "https://shop.example"): Request {
  return new Request("https://app.test/api/widget-simplify", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

const valid = { siteId: "site_1", text: "This sentence is unnecessarily complicated and verbose." };

function mockAnthropicOk(text: string) {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ type: "text", text }] }),
  });
}

describe("OPTIONS preflight", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS(
      new Request("https://app.test/api/widget-simplify", {
        method: "OPTIONS",
        headers: { origin: "https://shop.example" },
      })
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://shop.example");
  });
});

describe("POST /api/widget-simplify — gating", () => {
  it("refuses with 403 when the per-site flag is OFF, BEFORE any model call", async () => {
    getSiteBundle.mockResolvedValue({
      site: { allowedDomains: [] },
      config: { aiSimplifyEnabled: false },
    });
    const res = await POST(makeReq(valid));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses with 503 when the flag is on but no API key is configured", async () => {
    anthropicKey = "";
    const res = await POST(makeReq(valid));
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats an unknown site as feature-disabled (403, no 404 enumeration)", async () => {
    getSiteBundle.mockResolvedValue({ site: null, config: null });
    const res = await POST(makeReq(valid));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks a disallowed origin with 403 when the allowlist is non-empty", async () => {
    getSiteBundle.mockResolvedValue({
      site: { allowedDomains: ["allowed.example"] },
      config: { aiSimplifyEnabled: true },
    });
    const res = await POST(makeReq(valid, "https://evil.example"));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/widget-simplify — happy path + validation", () => {
  it("returns the simplified text when every gate passes", async () => {
    mockAnthropicOk("This sentence is too wordy.");
    const res = await POST(makeReq(valid));
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.text).toBe("This sentence is too wordy.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty text with 400 and never calls the model", async () => {
    const res = await POST(makeReq({ siteId: "site_1", text: "" }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 502 when Anthropic responds non-ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const res = await POST(makeReq(valid));
    expect(res.status).toBe(502);
  });

  it("returns 429 when the per-IP limit is hit (before any DB/model work)", async () => {
    checkRateLimit.mockResolvedValue(true);
    const res = await POST(makeReq(valid));
    expect(res.status).toBe(429);
    expect(getSiteBundle).not.toHaveBeenCalled();
  });

  it("returns 429 when the per-siteId cap is hit (IP ok) — anti cost-amplification", async () => {
    checkRateLimit.mockImplementation((_key: string, opts: { name: string }) =>
      Promise.resolve(opts.name === "widget-simplify-site")
    );
    const res = await POST(makeReq(valid));
    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
