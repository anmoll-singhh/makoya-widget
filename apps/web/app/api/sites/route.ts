/**
 * /api/sites — AUTHED owner agent list (GET) + self-serve site create (POST).
 *
 * GET → { agents: AgentSummary[], kpis } (owner's full portfolio + KPIs).
 * POST { name?, domain } → 201 { siteId, token } (creates site + mints token).
 *
 * Auth discipline mirrors /api/sites/[id]/overview: cookie-bound Supabase client
 * → getUser() → 401 if no session. Raw DB errors are never echoed — always
 * routed through captureError with a generic message returned to the caller.
 *
 * POST security posture:
 *  1. Zod body schema (shape gate) — rejects missing / wrong-type fields early.
 *  2. Domain normalization — strips scheme/path so only the bare hostname is stored.
 *  3. isPublicHttpUrl (SSRF gate) — rejects localhost / private ranges / bad schemes.
 *  4. Upstash rate-limit (namespace: sites-create, fail-open) — same pattern as
 *     /api/public-scan. Uses the authenticated user's ID as the rate-limit key.
 *
 * Token is minted SERVER-SIDE only (mintSiteToken reads WIDGET_SIGNING_SECRET
 * which must never reach the client bundle). The 201 response hands it to the
 * caller so the wizard can pass it to the /install page as a URL param.
 *
 * Entitlement: site creation is allowed for any authenticated user. Plan gating
 * (e.g. site limits) is enforced separately via billing; it is NOT done here.
 *
 * RLS note: the `sites` table has a `for all` policy with `with check (owner_id
 * = auth.uid())` that covers INSERT — the cookie-bound client used here enforces
 * it automatically. No service-role key is used.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { createSite } from "@/lib/sites";
import { listAgents, portfolioKpis } from "@/lib/portfolio";
import { mintSiteToken } from "@/lib/licensing/token";
import { captureError } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";
import { isPublicHttpUrl } from "@/lib/scan-utils/public-url";
import { parseBody } from "@/lib/validation/api";

// ── POST body schema ──────────────────────────────────────────────────────
// Domain accepts bare hostname OR full URL (we normalize to hostname below).
// name is optional metadata displayed in the UI only (no DB column — stored
// as-domain until a migration adds a name column).
const createSiteBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().min(1).max(253),
});

// ── Rate-limit config (POST only, authed) ─────────────────────────────────
// Tighter than public-scan (no browser spin-up cost, but DB writes are expensive).
// Fail-open per project contract — rate limiting must never block a real user when
// Redis is unhealthy. Namespace kept distinct from public-scan / scan-ingest.
const POST_RATE_WINDOW_MS = 60_000;
const POST_RATE_MAX = 10;

/**
 * Normalise a raw domain input to a bare lowercase hostname.
 * Accepts "example.com", "https://example.com", "https://example.com/path?q=1".
 * Returns the hostname only (no scheme, no path, no port unless custom).
 */
function normalizeDomain(raw: string): string {
  const trimmed = raw.trim();
  // If it already looks like a URL (has ://) parse it; else prepend scheme first.
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    // Unparseable → return as-is; the SSRF gate will reject it downstream.
    return trimmed.toLowerCase();
  }
}

// ── GET /api/sites ─────────────────────────────────────────────────────────

export async function GET(_req: Request): Promise<NextResponse> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const agents = await listAgents(supabase, user.id);
    const kpis = portfolioKpis(agents);
    return NextResponse.json({ agents, kpis });
  } catch (e) {
    captureError(e, { route: "GET /api/sites" });
    return NextResponse.json({ error: "Failed to load agents." }, { status: 500 });
  }
}

// ── POST /api/sites ────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Body parsing (shape gate) ──────────────────────────────────────────
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseBody(createSiteBodySchema, json);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Enter a valid domain (e.g. example.com)." },
      { status: 400 }
    );
  }

  // ── Normalize domain ────────────────────────────────────────────────────
  const domain = normalizeDomain(parsed.data.domain);

  // ── SSRF gate (string/AST predicate) ───────────────────────────────────
  // isPublicHttpUrl accepts bare domains by internally prepending https://, so
  // we pass the normalized bare hostname directly. Private/loopback/internal
  // hostnames are rejected with a generic 400 — same pattern as public-scan.
  if (!isPublicHttpUrl(domain)) {
    return NextResponse.json(
      { error: "Enter a public domain (e.g. example.com)." },
      { status: 400 }
    );
  }

  // ── Rate limit (per authenticated user, fail-open) ─────────────────────
  // Using user.id as the rate-limit key scopes the bucket per account rather
  // than per IP (more appropriate for an authed create endpoint).
  const limited = await checkRateLimit(user.id, {
    name: "sites-create",
    limit: POST_RATE_MAX,
    windowMs: POST_RATE_WINDOW_MS,
  });
  if (limited) {
    return NextResponse.json(
      { error: "Too many sites created recently. Please wait a moment." },
      { status: 429 }
    );
  }

  // ── Create site + mint token ────────────────────────────────────────────
  try {
    const site = await createSite(supabase, user.id, domain);
    const token = mintSiteToken(site.id);
    return NextResponse.json({ siteId: site.id, token }, { status: 201 });
  } catch (e) {
    captureError(e, { route: "POST /api/sites" });
    return NextResponse.json({ error: "Failed to create agent." }, { status: 500 });
  }
}
