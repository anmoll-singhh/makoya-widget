/**
 * /api/scan-ingest — the public funnel endpoint.
 *
 * The external scanner (a different origin) POSTs { url, email, score, totals }
 * after a visitor enters their email to unlock the full report. We:
 *   1. validate + rate-limit (this is public and unauthenticated),
 *   2. persist a lead (service-role; the leads table is RLS-no-policy),
 *   3. send the report email via the provider seam (stub today, Resend later).
 *
 * Security notes:
 *  - PUBLIC + unauthenticated by design → strict input validation + rate limit.
 *  - CORS is open because the caller is the external scanner origin; the endpoint
 *    only ever WRITES a lead and never returns sensitive data.
 *  - We never echo internal errors to the caller.
 */

import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createLead, type LeadTotals } from "@/lib/leads";
import { getEmailProvider, buildReportEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { track, captureError } from "@/lib/observability";

export const runtime = "nodejs";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── crude per-instance rate limit ──────────────────────────────────────────
// Good enough to stop accidental floods in the demo. Replace with Upstash/QStash
// (durable, cross-instance) when we harden for real traffic.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const hits = new Map<string, { n: number; t: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now - cur.t > RATE_WINDOW_MS) {
    hits.set(key, { n: 1, t: now });
    return false;
  }
  cur.n++;
  return cur.n > RATE_MAX;
}

function isEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}

function isHttpUrl(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 2048) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeTotals(raw: unknown): LeadTotals {
  const t = (raw ?? {}) as Record<string, unknown>;
  const n = (x: unknown) => (Number.isFinite(x) ? Math.max(0, Math.trunc(x as number)) : 0);
  const critical = n(t.critical);
  const serious = n(t.serious);
  const moderate = n(t.moderate);
  const minor = n(t.minor);
  return { critical, serious, moderate, minor, total: critical + serious + moderate + minor };
}

function normalizeScore(raw: unknown): number | null {
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw as number))) : null;
}

export async function POST(req: Request): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: CORS });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400, headers: CORS });
  }

  const { url, email, score, totals } = body ?? {};
  if (!isEmail(email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400, headers: CORS });
  }
  if (!isHttpUrl(url)) {
    return NextResponse.json({ error: "valid url required" }, { status: 400, headers: CORS });
  }

  const safeTotals = normalizeTotals(totals);
  const safeScore = normalizeScore(score);

  try {
    const admin = getAdminSupabase();
    const lead = await createLead(admin, {
      email,
      url,
      score: safeScore,
      totals: safeTotals,
      source: "scanner",
    });
    track("scan_ingest_lead", { score: safeScore, total: safeTotals.total });

    const provider = getEmailProvider();
    const mail = buildReportEmail({
      to: email,
      url,
      score: safeScore ?? 0,
      totals: safeTotals,
      appUrl: env.APP_URL,
    });
    const sent = await provider.send(mail);

    return NextResponse.json(
      { ok: true, leadId: lead.id, emailed: sent.ok, provider: sent.provider },
      { headers: CORS }
    );
  } catch (e) {
    captureError(e, { route: "scan-ingest" });
    return NextResponse.json({ error: "could not process request" }, { status: 500, headers: CORS });
  }
}
