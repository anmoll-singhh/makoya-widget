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
import { getSiteBundle, type SiteLicense, type SiteConfig } from "@/lib/sites";
import { readSiteBundle, writeSiteBundle } from "@/lib/config-cache";
import { logWidgetGate } from "@/lib/observability";
import { verifySiteToken } from "@/lib/licensing/token";
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
  if (
    site.licenseStatus === "trial" &&
    site.trialEndsAt &&
    new Date(site.trialEndsAt) < new Date()
  ) {
    return false;
  }
  return true; // active, trial-not-expired, and past_due (grace) all pass
}

export async function GET(req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const origin = req.headers.get("origin");
  const host = hostFromOrigin(origin);
  const enforce = process.env.WIDGET_ENFORCE === "true"; // monitor → enforce flag

  // Signed-token check (Phase 1.5 §A2). The loader forwards the snippet's
  // data-token as `?t=` (or the `x-makoya-token` header). GRACE: a *missing*
  // token must NOT fail the verdict — legacy token-less installs keep working;
  // only a *wrong* token fails. With no secret configured verify returns
  // reason "ok", so tokenOk is true and nothing changes.
  //
  // Two-flag truth table (spec §A2 — keep in sync with INSTALL/SETUP docs):
  //   WIDGET_ENFORCE | secret set | token on snippet | result
  //   ---------------|------------|------------------|-------------------------------
  //   unset (monitor)| any        | any              | active (verdict only logged)
  //   true           | unset      | any              | gated by license+domain only
  //   true           | set        | valid            | active (if license+domain ok)
  //   true           | set        | missing          | active (grace) + log reason "token"
  //   true           | set        | wrong            | blocked
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? req.headers.get("x-makoya-token");
  const tok = verifySiteToken(siteId, token);
  const tokenOk = tok.reason !== "bad"; // grace: only a WRONG token fails

  // The verdict is computed per-request from Origin and must NOT be cached/shared
  // on a CDN. No Vary, no s-maxage — every origin gets its own fresh decision.
  const headers = {
    "cache-control": "no-store",
    "access-control-allow-origin": "*", // public read-only data, no credentials
  };

  let site: SiteLicense | null = null;
  let cfg: SiteConfig | null = null;
  let infraError = false;
  // Populated on a cache MISS for an existing site; written to Redis AFTER the
  // verdict try/catch below (see review H1) so a hypothetical Redis-write throw can
  // never be mistaken for a DB infra error and flip the gate to fail-OPEN.
  let bundleToCache: { site: SiteLicense; config: SiteConfig | null } | null = null;
  try {
    // Cache-first. readSiteBundle NEVER throws — null means miss / unconfigured /
    // Redis blip, all of which correctly fall through to Postgres below.
    const cached = await readSiteBundle(siteId);
    if (cached) {
      site = cached.site;
      cfg = cached.config;
    } else {
      // MISS → one Postgres round-trip (was two), then populate the cache so the
      // next visitor of this site skips the DB entirely.
      const admin = getAdminSupabase();
      const bundle = await getSiteBundle(admin, siteId); // throws on infra error
      site = bundle.site;
      cfg = bundle.config;
      // Positive cache only: never cache a missing site, so a freshly created site
      // appears immediately and a bad-id flood can't pin a negative result.
      if (bundle.site) bundleToCache = { site: bundle.site, config: bundle.config };
    }
  } catch {
    infraError = true; // DB/transport failure → fail OPEN below
  }

  // Cache populate lives OUTSIDE the verdict try/catch (review H1). writeSiteBundle
  // never throws today; the extra guard keeps the never-500 contract even if a
  // future SDK change ever broke that invariant.
  if (bundleToCache) {
    try {
      await writeSiteBundle(siteId, bundleToCache);
    } catch {
      /* best-effort: a missed populate just means the next read repopulates */
    }
  }

  const pass =
    !!site && licenseActive(site) && isAllowedDomain(host, site.allowedDomains) && tokenOk;

  // Fail OPEN on our own outage; monitor mode never blocks; otherwise honor verdict.
  const active = infraError ? true : enforce ? pass : true;

  // Observe the gate (CLAUDE.md: never raw console here). Two cases are logged:
  //  1. A real would-be denial (`!pass`) — including monitor mode — tagged with the
  //     first failing check so the founder can watch the funnel before enforcing.
  //  2. The missing-token GRACE case — a configured secret saw a token-less request
  //     that otherwise passes. It stays active (legacy installs never break) but is
  //     logged `reason:"token"` so the founder can confirm every live snippet carries
  //     a token BEFORE flipping enforcement (truth-table row 4).
  if (!infraError) {
    if (!pass) {
      const reason: "domain" | "license" | "token" | "no-site" = !site
        ? "no-site"
        : !licenseActive(site)
          ? "license"
          : !isAllowedDomain(host, site.allowedDomains)
            ? "domain"
            : "token"; // remaining cause: !tokenOk → a WRONG token
      logWidgetGate({
        siteId,
        host,
        status: site?.licenseStatus ?? "no-site",
        enforced: enforce,
        reason,
      });
    } else if (tok.reason === "missing" && !!site && licenseActive(site)) {
      // Grace: secret is set, license+domain ok, but the snippet sent no token.
      logWidgetGate({
        siteId,
        host,
        status: site.licenseStatus,
        enforced: enforce,
        reason: "token",
      });
    }
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
        customTriggerSelector: DEFAULT_CONFIG.customTriggerSelector,
        domObserverEnabled: DEFAULT_CONFIG.domObserverEnabled,
        inheritFonts: DEFAULT_CONFIG.inheritFonts,
        mobileEnabled: DEFAULT_CONFIG.mobileEnabled,
        launcherShape: DEFAULT_CONFIG.launcherShape,
        offsetX: DEFAULT_CONFIG.offsetX,
        offsetY: DEFAULT_CONFIG.offsetY,
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
      customTriggerSelector: cfg.customTriggerSelector,
      domObserverEnabled: cfg.domObserverEnabled,
      inheritFonts: cfg.inheritFonts,
      mobileEnabled: cfg.mobileEnabled,
      launcherShape: cfg.launcherShape,
      offsetX: cfg.offsetX,
      offsetY: cfg.offsetY,
    },
    { headers }
  );
}
