/**
 * /api/heartbeat — the PUBLIC, unauthenticated widget liveness endpoint.
 *
 * The widget runs on the merchant's site with NO Supabase session, so it cannot
 * write to the DB directly (and must never hold the service key). Instead it POSTs
 * a tiny "I'm alive" ping here; this route records it via the SERVICE ROLE into
 * `widget_heartbeats` / `widget_uptime_days` (write-locked to the service key,
 * mirroring `leads`). The dashboard later READS that liveness through the authed
 * `/api/sites/[id]/install-status` route to show install-verification + uptime.
 *
 * Security posture (public + unauthenticated → treat input as hostile):
 *  1. Schema gate: Zod via `parseBody`. Malformed body → 400 generic.
 *  2. Rate limit: per-IP Upstash throttle (fail-open inside `checkRateLimit`).
 *  3. NEVER-500 / opacity contract: heartbeat is best-effort telemetry. ANY error
 *     (including the FK error when the siteId doesn't exist) is captured via the
 *     observability seam and then SWALLOWED — we always return `{ ok: true }`.
 *     We deliberately never reveal whether the site exists (no enumeration oracle)
 *     and never surface failures to a widget that can't act on them anyway.
 *
 * Token: the snippet may carry a `data-token`. We ACCEPT it but DO NOT enforce it
 * here — heartbeats are monitor-only telemetry, and the licensing gate lives on
 * the config route. We verify it solely to attach the reason to observability
 * context; a bad/missing token never blocks a ping.
 *
 * Honesty: this records liveness signals only — no WCAG/ADA "compliance" claim.
 */
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { recordHeartbeat } from "@/lib/heartbeat";
import { verifySiteToken } from "@/lib/licensing/token";
import { parseBody } from "@/lib/validation/api";
import { heartbeatBodySchema } from "@/lib/validation/heartbeat";
import { track, captureError } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await checkRateLimit(ip, { name: "heartbeat", limit: RATE_MAX, windowMs: RATE_WINDOW_MS })) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const parsed = parseBody(heartbeatBodySchema, json);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { siteId, token, url } = parsed.data;

    // Verify the token for telemetry context only — NEVER block on it here.
    const tokenCheck = verifySiteToken(siteId, token);
    track("widget_heartbeat", { distinctId: siteId, tokenReason: tokenCheck.reason });

    // Service-role write. If the site doesn't exist the FK errors → caught below
    // → still returns { ok: true } (no existence oracle, best-effort telemetry).
    const service = getAdminSupabase();
    await recordHeartbeat(service, siteId, url ?? null);

    return NextResponse.json({ ok: true });
  } catch (e) {
    // Best-effort telemetry: swallow EVERYTHING. Never surface a failure (and
    // never reveal whether the site exists) to an unauthenticated widget.
    captureError(e, { route: "heartbeat" });
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
