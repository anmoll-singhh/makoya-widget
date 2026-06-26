/**
 * app/dashboard/[siteId]/settings/page.tsx  (RSC — C10)
 *
 * Agent settings screen. Thin RSC shell that:
 *  1. Calls requireAgent() to authenticate + verify site ownership.
 *  2. Renders SettingsClient with the siteId prop.
 *
 * SettingsClient fetches from two real APIs:
 *   GET/PATCH /api/sites/[siteId]/settings → private site_settings (owner info, notifications)
 *   GET       /api/sites/[siteId]/config   → widget config (advanced toggles)
 *
 * No mock values (Vikram Kandoriya, +1 (415) 555-0142, etc.) — all come from the DB.
 */
import { requireAgent } from "@/lib/agent-context";
import { SettingsClient } from "./_SettingsClient";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // Auth + ownership guard.
  await requireAgent(siteId);

  return <SettingsClient siteId={siteId} />;
}
