/**
 * app/dashboard/[siteId]/page.tsx  (RSC)
 *
 * Overview screen — C1. A thin RSC shell that:
 *  1. Calls requireAgent() to authenticate + verify ownership.
 *  2. Passes {siteId, domain, token} down to the client OverviewClient component.
 *
 * The layout above already ran requireAgent(), so this call is cheap (same
 * cookie-bound Supabase client, same RLS read, O(1)) and produces identical
 * auth results. It is repeated here so each page.tsx is safe when navigated
 * to directly (deep link, refresh) without relying on layout-level state.
 *
 * All data is fetched client-side by OverviewClient from the authed
 * /api/sites/[siteId]/overview endpoint. Same-origin fetch forwards the
 * session cookie so RLS scopes every read to the owner.
 */
import { requireAgent } from "@/lib/agent-context";
import { OverviewClient } from "./_OverviewClient";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { site, token } = await requireAgent(siteId);

  return (
    <OverviewClient
      siteId={siteId}
      domain={site.domain}
      token={token}
    />
  );
}
