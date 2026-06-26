/**
 * app/dashboard/[siteId]/billing/page.tsx  (RSC — C9)
 *
 * Plan & billing screen. Thin RSC shell that:
 *  1. Calls requireAgent() to authenticate + verify site ownership.
 *  2. Renders BillingClient with the siteId prop.
 *
 * BillingClient fetches real plan/subscription data from:
 *   GET  /api/sites/[siteId]/billing         → subscription, quota, usage, catalog
 *   POST /api/sites/[siteId]/billing/checkout → sets status 'trialing' (no charge)
 *
 * ENTITLEMENT CONTRACT: trialing ≠ active. Paid features gate on status === 'active'.
 * Invoices are an honest empty state ("appears here once billing is connected") —
 * no fake "Paid" rows.
 */
import { requireAgent } from "@/lib/agent-context";
import { BillingClient } from "./_BillingClient";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // Auth + ownership guard.
  await requireAgent(siteId);

  return <BillingClient siteId={siteId} />;
}
