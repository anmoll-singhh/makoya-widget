/**
 * GET /api/config/[siteId] — the public widget config endpoint.
 *
 * This is the single server-side chokepoint every visitor's browser passes
 * through to boot the widget, so Phase 1 enforces the per-site license + domain
 * allowlist HERE (Phase 1 §4). Two contracts are non-negotiable:
 *
 *  1. NEVER 500 / always render. Any malformed id, missing config, or DB blip
 *     resolves to a safe response — the host page must never break.
 *  2. Availability > enforcement. We fail OPEN on our OWN infra error (a thrown
 *     DB error → active:true so a paying site is never punished for our outage),
 *     and fail CLOSED only on a real verdict (not-found / inactive / domain
 *     mismatch). Monitor mode (`WIDGET_ENFORCE` unset) computes the verdict and
 *     logs would-be denials but NEVER blocks.
 *
 * CACHE: the verdict depends on the request `Origin`, so the response is
 * `no-store` — it must not be shared/stale on a CDN across origins.
 */
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getConfig, getSiteLicense, type SiteLicense } from "@/lib/sites";
import { logWidgetGate } from "@/lib/observability";
import { DEFAULT_CONFIG } from "@makoya/shared";

/** Origin header → bare lowercase hostname, null-safe. */
function hostFromOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Best-effort domain deterrence (Phase 1 §6.5 — Origin is attacker-spoofable
 * outside a real browser; this is not a cryptographic wall). Lenient by design:
 *  - empty allowlist (not yet configured) → don't block,
 *  - no Origin (non-browser GET) → don't block,
 *  - otherwise the host must be explicitly listed.
 */
function isAllowedDomain(host: string | null, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  if (!host) return true;
  return allowed.includes(host);
}

/** A site is "active" unless suspended/canceled, or a trial whose end has passed. */
function licenseActive(site: Pick<SiteLicense, "licenseStatus" | "trialEndsAt">): boolean {
  if (site.licenseStatus === "suspended" || site.licenseStatus === "canceled") return false;
  if (site.licenseStatus === "trial" && site.trialEndsAt && new Date(site.trialEndsAt) < new Date()) {
    return false;
  }
  return true; // active, trial-not-expired, and past_due (grace) all pass
}

export async function GET(req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const origin = req.headers.get("origin");
  const host = hostFromOrigin(origin);
  const enforce = process.env.WIDGET_ENFORCE === "true"; // monitor → enforce flag

  // The verdict is computed per-request from Origin and must NOT be cached/shared
  // on a CDN. No Vary, no s-maxage — every origin gets its own fresh decision.
  const headers = {
    "cache-control": "no-store",
    "access-control-allow-origin": "*", // public read-only data, no credentials
  };

  let site: SiteLicense | null = null;
  let cfg: Awaited<ReturnType<typeof getConfig>> = null;
  let infraError = false;
  try {
    const admin = getAdminSupabase();
    site = await getSiteLicense(admin, siteId); // throws on infra error; null if no such site
    cfg = await getConfig(admin, siteId);
  } catch {
    infraError = true; // DB/transport failure → fail OPEN below
  }

  const pass = !!site && licenseActive(site) && isAllowedDomain(host, site.allowedDomains);

  // Fail OPEN on our own outage; monitor mode never blocks; otherwise honor verdict.
  const active = infraError ? true : enforce ? pass : true;

  // Log every would-be denial (including monitor mode) via the observability seam.
  if (!infraError && !pass) {
    logWidgetGate({ siteId, host, status: site?.licenseStatus ?? "no-site", enforced: enforce });
  }

  if (!active) {
    return NextResponse.json({ siteId, active: false }, { headers });
  }

  if (!cfg) {
    // Explicit allowlist (same shape as the happy path) so a future
    // DEFAULT_CONFIG field can never silently leak through the fallback.
    return NextResponse.json(
      {
        siteId,
        active: true,
        primaryColor: DEFAULT_CONFIG.primaryColor,
        position: DEFAULT_CONFIG.position,
        launcherIcon: DEFAULT_CONFIG.launcherIcon,
        featuresEnabled: DEFAULT_CONFIG.featuresEnabled,
        hideBranding: DEFAULT_CONFIG.hideBranding,
        brandingUrl: DEFAULT_CONFIG.brandingUrl,
        launcherSize: DEFAULT_CONFIG.launcherSize,
        defaultProfile: DEFAULT_CONFIG.defaultProfile,
        accessibilityStatementUrl: DEFAULT_CONFIG.accessibilityStatementUrl,
        defaultLanguage: DEFAULT_CONFIG.defaultLanguage,
        panelTitle: DEFAULT_CONFIG.panelTitle,
      },
      { headers }
    );
  }

  // Only safe display fields cross to the public widget.
  return NextResponse.json(
    {
      siteId,
      active: true,
      primaryColor: cfg.primaryColor,
      position: cfg.position,
      launcherIcon: cfg.launcherIcon,
      featuresEnabled: cfg.featuresEnabled,
      hideBranding: cfg.hideBranding,
      brandingUrl: DEFAULT_CONFIG.brandingUrl,
      launcherSize: cfg.launcherSize,
      defaultProfile: cfg.defaultProfile,
      accessibilityStatementUrl: cfg.accessibilityStatementUrl,
      defaultLanguage: cfg.defaultLanguage,
      panelTitle: cfg.panelTitle,
    },
    { headers }
  );
}
