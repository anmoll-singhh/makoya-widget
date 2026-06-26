/**
 * app/dashboard/[siteId]/customize/page.tsx  (RSC — C4)
 *
 * Customize widget screen. A thin RSC shell that:
 *  1. Calls requireAgent() to authenticate + verify site ownership.
 *  2. Renders the CustomizeClient component, passing the siteId so the client
 *     can fetch and mutate the config via the authed /api/sites/[id]/config
 *     endpoint (GET initial state; PATCH on Publish).
 *
 * Data-fetch is client-side so the Customize screen can update optimistically as
 * the user toggles features, then commit on Publish. The client Reset reverts to
 * the last-published state without a round-trip.
 */
import { requireAgent } from "@/lib/agent-context";
import { CustomizeClient } from "./_CustomizeClient";

export default async function CustomizePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // Auth + ownership guard. Throws redirect on no session; notFound() on foreign site.
  await requireAgent(siteId);

  return <CustomizeClient siteId={siteId} />;
}
