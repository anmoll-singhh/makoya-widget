/**
 * app/dashboard/[siteId]/page.tsx  (RSC)
 *
 * Overview screen — C1. A thin RSC shell that:
 *  1. Calls requireAgent() to authenticate + verify ownership.
 *  2. Fetches the Overview view-model SERVER-SIDE via getOverview and passes it
 *     to OverviewClient as `initialData`.
 *  3. Passes {siteId, domain} down to the client component.
 *
 * PERF — no client fetch waterfall:
 *   Previously OverviewClient fetched /api/sites/[siteId]/overview from a
 *   useEffect on mount, so the user saw a spinner while a second round-trip ran
 *   AFTER the page already loaded. We now fetch the same view-model here on the
 *   server (same cookie-bound, RLS-scoped Supabase client) and hand it to the
 *   client as a prop — real content paints immediately. If the server fetch
 *   fails for any reason we pass `null` and the client falls back to its own
 *   fetch, so the screen is never left blank.
 *
 * The layout above already ran requireAgent(), so that call is cheap (same
 * cookie-bound client, same RLS read) and is repeated here so this page.tsx is
 * safe when navigated to directly (deep link, refresh).
 */
import { requireAgent } from "@/lib/agent-context";
import { getServerSupabase } from "@/lib/supabase/server";
import { getOverview, type OverviewData } from "@/lib/overview";
import { OverviewClient } from "./_OverviewClient";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { site } = await requireAgent(siteId);

  // Server-side fetch of the overview view-model removes the client waterfall.
  // Any infra error is swallowed to null so the client falls back to its fetch
  // (and shows its own skeleton/error state) — the page never crashes here.
  let initialData: OverviewData | null = null;
  try {
    const supabase = await getServerSupabase();
    initialData = await getOverview(supabase, siteId);
  } catch {
    initialData = null;
  }

  return (
    <OverviewClient
      siteId={siteId}
      domain={site.domain}
      initialData={initialData}
    />
  );
}
