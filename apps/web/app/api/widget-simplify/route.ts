/**
 * /api/widget-simplify — PUBLIC widget endpoint (accessiBe-parity AI Simplify).
 *
 * SHIPS OFF. This is the only recurring-cost / abuse-surface tool on a public
 * widget, so it is gated THREE ways and refuses before doing any model work:
 *   1. per-site `aiSimplifyEnabled` flag (default false) — 403 when off,
 *   2. `ANTHROPIC_API_KEY` must be configured — 503 when absent,
 *   3. strict rate limit + Zod body cap + best-effort origin check.
 * Only when all gates pass do we call Claude Haiku (raw fetch, no SDK dep) to
 * rewrite the selected text in plain language. The result is shown in the
 * widget panel; the host DOM is never rewritten.
 *
 * Never echoes internal errors; never throws an unhandled error.
 */

import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSiteBundle } from "@/lib/sites";
import { env } from "@/lib/env.server";
import { track, captureError } from "@/lib/observability";
import { parseBody, widgetSimplifyBodySchema } from "@/lib/validation/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { corsHeaders, isAllowedOrigin } from "@/lib/widget-cors";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8; // stricter than feedback — each call costs a model token spend
const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_TIMEOUT_MS = 12_000;

const LANG_NAME: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
};

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function OPTIONS(req: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (
    await checkRateLimit(clientIp(req), {
      name: "widget-simplify",
      limit: RATE_MAX,
      windowMs: RATE_WINDOW_MS,
    })
  ) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: cors });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400, headers: cors });
  }

  const parsed = parseBody(widgetSimplifyBodySchema, json);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid request" }, { status: 400, headers: cors });
  }
  const { siteId, text, lang } = parsed.data;

  try {
    const admin = getAdminSupabase();
    const { site, config } = await getSiteBundle(admin, siteId);

    // Gate 0: unknown site → 404 (generic).
    if (!config) {
      return NextResponse.json({ error: "not found" }, { status: 404, headers: cors });
    }
    // Origin deterrence.
    if (!isAllowedOrigin(origin, site?.allowedDomains ?? [])) {
      return NextResponse.json({ error: "origin not allowed" }, { status: 403, headers: cors });
    }
    // Gate 1: per-site flag OFF (the default) → 403, BEFORE any model call.
    if (!config.aiSimplifyEnabled) {
      return NextResponse.json({ error: "feature_disabled" }, { status: 403, headers: cors });
    }
    // Gate 2: no key configured → 503 (tool unavailable), BEFORE any model call.
    if (!env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "unavailable" }, { status: 503, headers: cors });
    }

    const langName = LANG_NAME[lang ?? "en"] ?? "English";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
    let simplified = "";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          system:
            `Rewrite the user's text in simpler, plain ${langName} at about a grade-6 reading level. ` +
            `Keep the original meaning and the same language. Do not add commentary or headings. ` +
            `Output only the simplified text.`,
          messages: [{ role: "user", content: text }],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        captureError(new Error(`anthropic ${res.status}`), { route: "widget-simplify" });
        return NextResponse.json({ error: "unavailable" }, { status: 502, headers: cors });
      }
      const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
      simplified = (data.content ?? [])
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string)
        .join("")
        .trim();
    } finally {
      clearTimeout(timer);
    }

    if (!simplified) {
      return NextResponse.json({ error: "no_result" }, { status: 502, headers: cors });
    }

    track("widget_simplify_ok", { siteId });
    return NextResponse.json({ ok: true, text: simplified }, { headers: cors });
  } catch (e) {
    captureError(e, { route: "widget-simplify" });
    return NextResponse.json(
      { error: "could not process request" },
      { status: 500, headers: cors }
    );
  }
}
