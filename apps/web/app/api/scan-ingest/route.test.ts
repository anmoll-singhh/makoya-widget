/**
 * app/api/scan-ingest/route.test.ts
 *
 * The funnel's most important behavioural guarantee:
 *   email delivery is BEST-EFFORT and must NEVER block lead capture.
 *
 * If the email provider returns ok:false (e.g. unverified domain / 4xx from the
 * ESP), the lead must STILL be persisted and the handler must STILL return 200
 * with { ok: true } — only `emailed` flips to false. A thrown provider error
 * would currently bubble into the catch and fail the request; this suite locks
 * in the ok:false path (the realistic ESP-soft-failure case) and documents the
 * throw case so a regression that swallows the lead is caught.
 *
 * Runs env-free: every external dependency (service-role Supabase, email
 * provider, env, observability) is mocked. No live Supabase, no network.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SendResult } from "@/lib/email";

// ── Mocks for the route's collaborators ─────────────────────────────────────
// createLead resolves with a fake lead so we can assert "the lead persisted".
const createLead = vi.fn();
const send = vi.fn<(email: unknown) => Promise<SendResult>>();

vi.mock("@/lib/supabase/admin", () => ({
  // The route only passes this client straight into createLead (which is mocked),
  // so an opaque sentinel is enough.
  getAdminSupabase: () => ({ __fake: "service-role-client" }),
}));

vi.mock("@/lib/leads", () => ({
  createLead: (...args: unknown[]) => createLead(...args),
}));

vi.mock("@/lib/email", () => ({
  getEmailProvider: () => ({ name: "test", send }),
  buildReportEmail: (input: { to: string }) => ({
    to: input.to,
    subject: "Your accessibility scan",
    html: "<p>report</p>",
    text: "report",
  }),
}));

vi.mock("@/lib/env", () => ({
  env: { APP_URL: "https://app.test" },
}));

vi.mock("@/lib/observability", () => ({
  track: vi.fn(),
  captureError: vi.fn(),
}));

import { POST } from "./route";

function makeRequest(body: unknown, ip = "1.2.3.4"): Request {
  return new Request("https://app.test/api/scan-ingest", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const validBody = {
  url: "https://shop.example/products",
  email: "owner@shop.example",
  score: 72,
  totals: { critical: 1, serious: 3, moderate: 2, minor: 4 },
};

let ipCounter = 0;
function freshIp(): string {
  // A unique IP per test keeps the per-instance rate limiter from bleeding
  // across tests (the module-level Map persists for the file's lifetime).
  ipCounter += 1;
  return `10.10.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

beforeEach(() => {
  createLead.mockReset();
  send.mockReset();
  createLead.mockResolvedValue({ id: "lead_123" });
});

describe("POST /api/scan-ingest — lead capture vs email delivery", () => {
  it("persists the lead and reports emailed:true on the happy path", async () => {
    send.mockResolvedValue({ ok: true, provider: "test", id: "msg_1" });

    const res = await POST(makeRequest(validBody, freshIp()));
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.leadId).toBe("lead_123");
    expect(json.emailed).toBe(true);
    expect(createLead).toHaveBeenCalledTimes(1);
  });

  it("STILL persists the lead and returns 200 when the email provider returns ok:false", async () => {
    // The realistic ESP soft-failure: unverified domain, 4xx, throttling, etc.
    send.mockResolvedValue({ ok: false, provider: "test", error: "domain not verified" });

    const res = await POST(makeRequest(validBody, freshIp()));
    const json = (await res.json()) as Record<string, unknown>;

    // The lead is the product-critical artifact — it MUST be saved.
    expect(createLead).toHaveBeenCalledTimes(1);
    // The request succeeds; only the email flag reflects the soft failure.
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.leadId).toBe("lead_123");
    expect(json.emailed).toBe(false);
  });

  it("forwards the normalized lead payload to createLead (score clamped, totals summed)", async () => {
    send.mockResolvedValue({ ok: true, provider: "test" });

    await POST(
      makeRequest(
        {
          ...validBody,
          score: 999, // out of range → clamped to 100
          totals: { critical: 2, serious: 1, moderate: 0, minor: 0 }, // total omitted → derived
        },
        freshIp()
      )
    );

    const [, lead] = createLead.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(lead.email).toBe("owner@shop.example");
    expect(lead.score).toBe(100);
    expect((lead.totals as { total: number }).total).toBe(3);
    expect(lead.source).toBe("scanner");
  });

  it("returns 500 (and does NOT claim success) only when lead PERSISTENCE itself fails", async () => {
    // This is the one failure that should fail the request: we couldn't save the lead.
    createLead.mockRejectedValue(new Error("db unavailable"));
    send.mockResolvedValue({ ok: true, provider: "test" });

    const res = await POST(makeRequest(validBody, freshIp()));
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(500);
    expect(json.ok).toBeUndefined();
    expect(json.error).toBe("could not process request");
  });
});

describe("POST /api/scan-ingest — input validation (no lead written)", () => {
  it("rejects an invalid email with 400 and never touches the DB", async () => {
    const res = await POST(makeRequest({ ...validBody, email: "not-an-email" }, freshIp()));
    expect(res.status).toBe(400);
    expect(createLead).not.toHaveBeenCalled();
  });

  it("rejects a non-http(s) url with 400 and never touches the DB", async () => {
    const res = await POST(makeRequest({ ...validBody, url: "ftp://x.test" }, freshIp()));
    expect(res.status).toBe(400);
    expect(createLead).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with 400", async () => {
    const req = new Request("https://app.test/api/scan-ingest", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": freshIp() },
      body: "{ not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(createLead).not.toHaveBeenCalled();
  });

  it("sets permissive CORS headers on responses (public cross-origin caller)", async () => {
    send.mockResolvedValue({ ok: true, provider: "test" });
    const res = await POST(makeRequest(validBody, freshIp()));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("POST /api/scan-ingest — rate limiting", () => {
  it("returns 429 after exceeding the per-IP window", async () => {
    send.mockResolvedValue({ ok: true, provider: "test" });
    const ip = freshIp();
    // RATE_MAX = 10 within the window; the 11th from the same IP is limited.
    let last: Response | undefined;
    for (let i = 0; i < 11; i += 1) {
      last = await POST(makeRequest(validBody, ip));
    }
    expect(last?.status).toBe(429);
  });
});
