/**
 * /api/sites/[id]/billing — AUTHED, owner-only billing summary (GET).
 *
 * Powers the v3.1 Billing screen. Mirrors the auth+ownership discipline of
 * /api/sites/[id]/analytics: 401 with no session; 404 when the site doesn't exist
 * or isn't the caller's (RLS already scopes the subscription read to the owner —
 * the ownership check just turns a not-found into a clean 404 and avoids
 * confirming foreign site ids).
 *
 * Returns `{ subscription, quota, catalog }`:
 *  - `subscription` — the site's billing_subscriptions record (a default
 *    free/inactive record when no row exists yet — never null).
 *  - `quota` — the plan_quotas row for the EFFECTIVE plan. Until a real Stripe
 *    subscription writes a row, "effective" = the legacy `sites.plan` mapped
 *    through `legacyToCatalogSlug` (pro→growth, managed→scale). Once an active
 *    subscription exists, its own `planSlug` wins. This keeps the live admin's
 *    `sites.plan` authoritative during the scaffold phase.
 *  - `catalog` — the typed PLAN_CATALOG the pricing cards map over.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { getSubscription, getPlanQuota, legacyToCatalogSlug } from "@/lib/billing";
import { PLAN_CATALOG } from "@/lib/billing/plans";
import { captureError } from "@/lib/observability";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  try {
    const subscription = await getSubscription(supabase, id);
    // No active catalog subscription yet → the legacy admin plan is authoritative.
    const effectiveSlug =
      subscription.status === "inactive"
        ? legacyToCatalogSlug(site.plan)
        : subscription.planSlug;
    const quota = await getPlanQuota(supabase, effectiveSlug);
    return NextResponse.json({ subscription, quota, catalog: PLAN_CATALOG });
  } catch (e) {
    // Generic message only — never echo a raw DB error to the client. Route the
    // detail through the observability seam, matching the analytics route.
    captureError(e, { route: "sites/[id]/billing" });
    return NextResponse.json({ error: "failed to load billing" }, { status: 500 });
  }
}
