import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getConfig } from "@/lib/sites";
import { DEFAULT_CONFIG } from "@makoya/shared";

export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const headers = { "cache-control": "public, s-maxage=300, stale-while-revalidate=86400" };
  const cfg = await getConfig(getAdminSupabase(), siteId);
  if (!cfg) {
    return NextResponse.json({ ...DEFAULT_CONFIG, siteId }, { headers });
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
