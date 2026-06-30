/**
 * /api/widget-feedback — PUBLIC widget endpoint (accessiBe-parity Feedback Form).
 *
 * A visitor on a customer's site uses the widget's "report an issue" form. We
 *   1. answer the browser's CORS preflight + emit CORS headers (the widget is
 *      cross-origin on arbitrary customer domains),
 *   2. best-effort origin-check against the site's domain allowlist,
 *   3. rate-limit (durable, cross-instance via Upstash; in-memory fallback),
 *   4. validate the body with Zod (generic errors only — no field leakage),
 *   5. look up the site OWNER's email (service role) and email them the report
 *      via the provider seam (Resend in prod, stub in dev).
 *
 * Non-negotiables:
 *  - NEVER echo internal errors; respond with generic copy.
 *  - The widget treats ANY failure as fail-silent — but we still return honest
 *    status codes for observability.
 *  - No WCAG/ADA "compliance" copy anywhere.
 */

import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite, getSiteLicense } from "@/lib/sites";
import { getEmailProvider } from "@/lib/email";
import { track, captureError } from "@/lib/observability";
import { parseBody, widgetFeedbackBodySchema } from "@/lib/validation/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { corsHeaders, isAllowedOrigin } from "@/lib/widget-cors";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5; // a visitor reporting issues; generous but abuse-resistant

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** HTML-escape user text for element-content use in the email body. Escapes the
 *  single-quote too so the helper stays safe if later reused in an attribute. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip CR/LF so a value can't fake extra lines in the plain-text email body. */
function oneLine(s: string): string {
  return s.replace(/[\r\n]+/g, " ");
}

export function OPTIONS(req: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  // Rate limit first (cheap, pre-DB).
  if (
    await checkRateLimit(clientIp(req), {
      name: "widget-feedback",
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

  const parsed = parseBody(widgetFeedbackBodySchema, json);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid request" }, { status: 400, headers: cors });
  }
  const { siteId, message, email, url } = parsed.data;

  // Per-siteId cap (in ADDITION to per-IP) so an attacker rotating IPs can't mail
  // bomb a site owner with the public, non-secret siteId. 30 reports/hour/site.
  if (await checkRateLimit(siteId, { name: "widget-feedback-site", limit: 30, windowMs: 3_600_000 })) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: cors });
  }

  try {
    const admin = getAdminSupabase();

    // Origin deterrence against the site's allowlist (lenient — see widget-cors).
    const license = await getSiteLicense(admin, siteId);
    if (!isAllowedOrigin(origin, license?.allowedDomains ?? [])) {
      return NextResponse.json({ error: "origin not allowed" }, { status: 403, headers: cors });
    }

    const site = await getSite(admin, siteId);
    if (!site) {
      // Unknown site — accept-and-drop (200) so the status code can't be used to
      // enumerate which siteIds exist. Identical shape to the no-owner path.
      return NextResponse.json({ ok: true, emailed: false }, { headers: cors });
    }

    const { data: ownerData } = await admin.auth.admin.getUserById(site.ownerId);
    const ownerEmail = ownerData?.user?.email;
    if (!ownerEmail) {
      // No deliverable owner — accept the report but nothing to send to.
      track("widget_feedback_no_owner", { siteId });
      return NextResponse.json({ ok: true, emailed: false }, { headers: cors });
    }

    const where = url ? `\nPage: ${oneLine(url)}` : "";
    const replyTo = email ? `\nReply-to: ${email}` : "\nReply-to: (anonymous)";
    const provider = getEmailProvider();
    const sent = await provider.send({
      to: ownerEmail,
      subject: `Accessibility feedback on ${site.domain || siteId}`,
      text: `A visitor sent accessibility feedback via your Makoya widget.\n\nMessage:\n${message}${where}${replyTo}`,
      html:
        `<p>A visitor sent accessibility feedback via your Makoya widget.</p>` +
        `<p><strong>Message:</strong><br>${esc(message).replace(/\n/g, "<br>")}</p>` +
        (url ? `<p><strong>Page:</strong> ${esc(url)}</p>` : "") +
        `<p><strong>Reply-to:</strong> ${email ? esc(email) : "(anonymous)"}</p>`,
    });

    track("widget_feedback_sent", { siteId, emailed: sent.ok });
    return NextResponse.json({ ok: true, emailed: sent.ok }, { headers: cors });
  } catch (e) {
    captureError(e, { route: "widget-feedback" });
    return NextResponse.json(
      { error: "could not process request" },
      { status: 500, headers: cors }
    );
  }
}
