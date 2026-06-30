/**
 * app/api/widget-feedback/route.test.ts
 *
 * Locks the PUBLIC feedback endpoint's contract: CORS preflight, origin
 * deterrence, Zod validation, rate limiting, owner-email lookup, and the
 * best-effort email send. Runs env-free — every collaborator is mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUserById = vi.fn();
const getSite = vi.fn();
const getSiteLicense = vi.fn();
const send = vi.fn();
const checkRateLimit = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    auth: { admin: { getUserById: (...a: unknown[]) => getUserById(...a) } },
  }),
}));
vi.mock("@/lib/sites", () => ({
  getSite: (...a: unknown[]) => getSite(...a),
  getSiteLicense: (...a: unknown[]) => getSiteLicense(...a),
}));
vi.mock("@/lib/email", () => ({ getEmailProvider: () => ({ name: "test", send }) }));
vi.mock("@/lib/observability", () => ({ track: vi.fn(), captureError: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: (...a: unknown[]) => checkRateLimit(...a) }));

import { POST, OPTIONS } from "./route";

function makeReq(body: unknown, origin = "https://shop.example"): Request {
  return new Request("https://app.test/api/widget-feedback", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

const valid = { siteId: "site_1", message: "The contrast on the header is too low." };

beforeEach(() => {
  checkRateLimit.mockReset();
  checkRateLimit.mockResolvedValue(false);
  getUserById.mockReset();
  getSite.mockReset();
  getSiteLicense.mockReset();
  send.mockReset();
  getSiteLicense.mockResolvedValue({ allowedDomains: [] }); // lenient by default
  getSite.mockResolvedValue({ id: "site_1", ownerId: "owner_1", domain: "shop.example" });
  getUserById.mockResolvedValue({ data: { user: { email: "owner@shop.example" } } });
  send.mockResolvedValue({ ok: true, provider: "test" });
});

describe("OPTIONS preflight", () => {
  it("returns 204 with CORS headers reflecting the origin", () => {
    const res = OPTIONS(
      new Request("https://app.test/api/widget-feedback", {
        method: "OPTIONS",
        headers: { origin: "https://shop.example" },
      })
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://shop.example");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});

describe("POST /api/widget-feedback", () => {
  it("emails the site owner on the happy path (200, emailed:true)", async () => {
    const res = await POST(makeReq(valid));
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json.emailed).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0] as { to: string; subject: string };
    expect(mail.to).toBe("owner@shop.example");
  });

  it("escapes HTML in the visitor message before emailing", async () => {
    await POST(makeReq({ ...valid, message: "<img src=x onerror=alert(1)>" }));
    const mail = send.mock.calls[0][0] as { html: string };
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
  });

  it("rejects an empty message with 400 and never emails", async () => {
    const res = await POST(makeReq({ siteId: "site_1", message: "" }));
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with 400", async () => {
    const req = new Request("https://app.test/api/widget-feedback", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://shop.example" },
      body: "{ not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("blocks a disallowed origin with 403 when the allowlist is non-empty", async () => {
    getSiteLicense.mockResolvedValue({ allowedDomains: ["allowed.example"] });
    const res = await POST(makeReq(valid, "https://evil.example"));
    expect(res.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it("accept-and-drops an unknown site with 200 (no 404 enumeration)", async () => {
    getSite.mockResolvedValue(null);
    const res = await POST(makeReq(valid));
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json.emailed).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("accepts the report but emailed:false when the owner has no email", async () => {
    getUserById.mockResolvedValue({ data: { user: { email: null } } });
    const res = await POST(makeReq(valid));
    const json = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json.emailed).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 429 when the per-IP limit is hit", async () => {
    checkRateLimit.mockResolvedValue(true);
    const res = await POST(makeReq(valid));
    expect(res.status).toBe(429);
  });

  it("returns 429 when the per-siteId cap is hit (IP ok) — anti mail-bomb", async () => {
    // IP bucket allows; the site bucket limits → still 429, no email sent.
    checkRateLimit.mockImplementation((_key: string, opts: { name: string }) =>
      Promise.resolve(opts.name === "widget-feedback-site")
    );
    const res = await POST(makeReq(valid));
    expect(res.status).toBe(429);
    expect(send).not.toHaveBeenCalled();
  });

  it("reflects the caller origin in the CORS header", async () => {
    const res = await POST(makeReq(valid));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://shop.example");
  });
});
