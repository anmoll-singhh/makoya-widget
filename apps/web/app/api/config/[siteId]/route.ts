import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getConfig } from "@/lib/sites";
import { DEFAULT_CONFIG } from "@makoya/shared";

export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const headers = { "cache-control": "public, s-maxage=300, stale-while-revalidate=86400" };
  const cfg = await getConfig(getAdminSupabase(), siteId);
  if (!cfg) {
    // Explicit allowlist (same shape as the happy path) so a future
    // DEFAULT_CONFIG field can never silently leak through the fallback.
    return NextResponse.json({
      siteId,
      primaryColor: DEFAULT_CONFIG.primaryColor,
      position: DEFAULT_CONFIG.position,
      launcherIcon: DEFAULT_CONFIG.launcherIcon,
      featuresEnabled: DEFAULT_CONFIG.featuresEnabled,
      hideBranding: DEFAULT_CONFIG.hideBranding,
      brandingUrl: DEFAULT_CONFIG.brandingUrl,
    }, { headers });
  }
  // Only safe display fields cross to the public widget.
  return NextResponse.json({
    siteId,
    primaryColor: cfg.primaryColor,
    position: cfg.position,
    launcherIcon: cfg.launcherIcon,
    featuresEnabled: cfg.featuresEnabled,
    hideBranding: cfg.hideBranding,
    brandingUrl: DEFAULT_CONFIG.brandingUrl,
  }, { headers });
}
