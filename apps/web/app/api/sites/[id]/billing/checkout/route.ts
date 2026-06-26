/**
 * /api/sites/[id]/billing/checkout — AUTHED, owner-only "Buy now" (POST).
 *
 * Completes EVERYTHING about a plan purchase except the actual charge: it records
 * the chosen plan on the site's subscription as `trialing` ("selected, awaiting
 * payment"). The real Stripe charge is DEFERRED — see the TODO below.
 *
 * Auth + ownership mirror /api/sites/[id]/billing (GET): 401 with no session; 404
 * when the site doesn't exist or isn't the caller's (RLS already scopes the write
 * target, but the ownership check turns a not-found into a clean 404 and avoids
 * confirming foreign site ids). The body is validated with Zod via `parseBody`,
 * which DROPS field-level detail → a generic 400 — so only `planSlug` + `period`
 * (both enum-validated) ever reach the data layer, and never `free`/`enterprise`.
 *
 * The write goes through the SERVICE-ROLE client because `billing_subscriptions`
 * has no owner write policy (owners may only READ their row). The SERVER fixes
 * status + price; the client is never trusted for plan state (CLAUDE.md "Backend
 * / data rules"). DB errors never reach the client — they route through the
 * `captureError` observability seam as a generic 500.
 *
 * Returns `200 { ok:true, subscription, paymentPending:true }`. `paymentPending`
 * makes the deferred-charge state explicit to the dashboard.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite } from "@/lib/sites";
import { selectPlan } from "@/lib/billing";
import { parseBody } from "@/lib/validation/api";
import { checkoutBodySchema } from "@/lib/validation/checkout";
import { captureError } from "@/lib/observability";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = parseBody(checkoutBodySchema, json);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    // TODO(stripe): replace direct selectPlan with a Stripe Checkout Session; the
    // webhook flips status trialing→active on paid. For now we record the chosen
    // plan as `trialing` (selected, awaiting payment) and DO NOT charge.
    const subscription = await selectPlan(
      getAdminSupabase(),
      id,
      parsed.data.planSlug,
      parsed.data.period
    );
    return NextResponse.json({ ok: true, subscription, paymentPending: true });
  } catch (e) {
    // Generic message only — never echo a raw DB error to the client. Route the
    // detail through the observability seam, matching the billing summary route.
    captureError(e, { route: "sites/[id]/billing/checkout" });
    return NextResponse.json({ error: "failed to start checkout" }, { status: 500 });
  }
}
