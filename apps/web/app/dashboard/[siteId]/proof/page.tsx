/**
 * app/dashboard/[siteId]/proof/page.tsx  (RSC — C6)
 *
 * Proof of effort screen. A thin RSC shell that:
 *  1. Calls requireAgent() to authenticate + verify site ownership.
 *  2. Renders ProofClient with siteId + domain props so the client can
 *     fetch the proof pack from the authed /api/sites/[id]/proof-pack endpoint.
 *
 * All evidence data comes from the API — no item is hard-coded as "Ready".
 * Each item shows its real state or an honest "not yet" when evidence is absent.
 */
import { requireAgent } from "@/lib/agent-context";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSiteEntitlement } from "@/lib/billing/site-entitlement";
import { UpgradeNotice } from "../../_components/UpgradeNotice";
import { ProofClient } from "./_ProofClient";

export default async function ProofPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { site } = await requireAgent(siteId);

  // Plan gate: the proof-of-effort pack is a Growth+ feature. Soft-lock the
  // screen with an upgrade prompt for lower tiers (the API route 403s too).
  const supabase = await getServerSupabase();
  const ent = await getSiteEntitlement(supabase, siteId, site.plan);
  if (!ent.allows("proof_pack")) {
    return (
      <UpgradeNotice
        feature="proof_pack"
        title="Proof of effort"
        currentPlan={ent.plan}
        siteId={siteId}
      />
    );
  }

  return <ProofClient siteId={siteId} domain={site.domain} />;
}
