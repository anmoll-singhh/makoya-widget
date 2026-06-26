/**
 * /api/widget-events — PUBLIC, unauthenticated widget-usage telemetry sink.
 *
 * The embedded widget POSTs small batches of usage events ("open",
 * "feature_activated"). They land in `widget_events` and increment the
 * `widget_event_daily` rollup the dashboard's Analytics screen reads. Writes use
 * the SERVICE ROLE because RLS deliberately has NO write policy on these tables.
 *
 * Security posture (public + unauthenticated → treat input as hostile):
 *  1. Schema gate: Zod (`widgetEventsBodySchema`) via `parseBody`; malformed →
 *     generic 400. `events` is capped at 50/POST.
 *  2. Rate limit: per-IP throttle (lib/rate-limit.ts) → 429.
 *  3. NEVER-500: the whole handler is wrapped; on ANY error we `captureError` and
 *     return `{ ok: true, accepted: 0 }` 200. Telemetry is best-effort and we
 *     must never let the response reveal whether a siteId exists (an enumeration
 *     oracle) — so even a DB failure looks like a successful no-op.
 *  4. Token is OPTIONAL + non-blocking: `verifySiteToken` runs for monitoring
 *     only (recorded via the observability seam); a missing/bad token never
 *     rejects the write. siteIds are unguessable UUIDs, and the rollup is
 *     low-stakes usage data, so anti-forgery here is monitor-grade, not a gate.
 *
 * Honesty: this endpoint records usage only — no WCAG/ADA compliance claims.
 */
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { recordEvents } from "@/lib/analytics";
import { widgetEventsBodySchema } from "@/lib/validation/widget-events";
import { parseBody } from "@/lib/validation/api";
import { verifySiteToken } from "@/lib/licensing/token";
import { track, captureError } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;

export async function POST(req: Request): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (await checkRateLimit(ip, { name: "widget-events", limit: RATE_MAX, windowMs: RATE_WINDOW_MS })) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = parseBody(widgetEventsBodySchema, json);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { siteId, token, events } = parsed.data;

  // NEVER-500: any failure past here is swallowed into a successful no-op so we
  // neither 500 nor leak whether the siteId exists.
  try {
    // Token verification is monitor-only — it never blocks the write.
    const verdict = verifySiteToken(siteId, token);
    if (!verdict.ok) track("widget_events_token_mismatch", { reason: verdict.reason });

    const service = getAdminSupabase();
    const accepted = await recordEvents(service, siteId, events);
    track("widget_events_ingested", { accepted });
    return NextResponse.json({ ok: true, accepted });
  } catch (e) {
    captureError(e, { route: "widget-events" });
    return NextResponse.json({ ok: true, accepted: 0 });
  }
}
