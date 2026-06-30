import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { isValidPlan, isValidLicenseStatus } from "@/lib/admin-constants";
import { updateSitePlan, updateSiteLicenseStatus, updateSiteAllowedDomains } from "@/lib/admin";

/**
 * Normalize a client-supplied allowlist to bare lowercase hostnames, or return
 * null if the shape is invalid. Rejects schemes/paths/spaces so a typo can't
 * silently widen the gate (e.g. "https://x.com/" would never match an Origin
 * host and would look "set" while blocking everything).
 */
function normalizeDomains(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const d of v) {
    if (typeof d !== "string") return null;
    const host = d.trim().toLowerCase();
    if (host === "") continue;
    if (!/^[a-z0-9.-]+$/.test(host)) return null; // bare hostname only
    out.push(host);
  }
  return Array.from(new Set(out));
}

/**
 * Admin site update. Accepts a PARTIAL body — any of `plan`, `licenseStatus`,
 * `allowedDomains` may be present; each is validated and applied independently.
 * licenseStatus + allowedDomains drive the widget licensing gate and purge the
 * config cache on write (see lib/admin.ts), giving the founder a UI kill-switch
 * instead of a manual Supabase edit. Admin-gated (ADMIN_EMAILS).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  let body: { plan?: unknown; licenseStatus?: unknown; allowedDomains?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  let touched = false;

  if (body.plan !== undefined) {
    if (!isValidPlan(body.plan))
      return NextResponse.json({ error: "invalid plan" }, { status: 400 });
    await updateSitePlan(id, body.plan);
    touched = true;
  }

  if (body.licenseStatus !== undefined) {
    if (!isValidLicenseStatus(body.licenseStatus)) {
      return NextResponse.json({ error: "invalid licenseStatus" }, { status: 400 });
    }
    await updateSiteLicenseStatus(id, body.licenseStatus);
    touched = true;
  }

  if (body.allowedDomains !== undefined) {
    const domains = normalizeDomains(body.allowedDomains);
    if (domains === null) {
      return NextResponse.json({ error: "invalid allowedDomains" }, { status: 400 });
    }
    await updateSiteAllowedDomains(id, domains);
    touched = true;
  }

  if (!touched) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
