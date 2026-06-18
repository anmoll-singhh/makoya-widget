/**
 * Public, read-only widget config. The widget loader fetches this.
 * Returns ONLY safe display settings. Falls back to defaults so the widget
 * never breaks if config is missing.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_CONFIG } from "@makoya/shared";

export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const c = await db.getConfig(siteId);
  const headers = { "cache-control": "public, s-maxage=300, stale-while-revalidate=86400" };
  if (!c) return NextResponse.json({ ...DEFAULT_CONFIG, siteId }, { headers });
  return NextResponse.json({
    siteId,
    primaryColor: c.primaryColor,
    position: c.position,
    featuresEnabled: c.featuresEnabled,
    hideBranding: c.hideBranding,
    brandingUrl: DEFAULT_CONFIG.brandingUrl,
  }, { headers });
}
