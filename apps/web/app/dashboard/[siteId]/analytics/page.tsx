/**
 * app/dashboard/[siteId]/analytics/page.tsx  (RSC — C8)
 *
 * Analytics screen. Thin RSC shell that:
 *  1. Calls requireAgent() to authenticate + verify site ownership.
 *  2. Renders AnalyticsClient with the siteId prop.
 *
 * AnalyticsClient fetches real widget-event data from:
 *   GET /api/sites/[siteId]/analytics?days=30
 *
 * No mock numbers — 3,418 opens / 1,902 activations / "512 Bigger text" are
 * NEVER hard-coded; all values come from the real widget_events rollup.
 */
import { requireAgent } from "@/lib/agent-context";
import { AnalyticsClient } from "./_AnalyticsClient";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // Auth + ownership guard.
  await requireAgent(siteId);

  return <AnalyticsClient siteId={siteId} />;
}
