/**
 * app/dashboard/[siteId]/audit/page.tsx (RSC)
 *
 * Full Audit screen — the honest, accessScan-parity per-rule breakdown. A thin
 * RSC shell that authenticates + verifies ownership, then renders the client
 * view which fetches GET /api/sites/[siteId]/audit and can trigger a fresh deep
 * audit via POST /api/sites/[siteId]/audit/run.
 */
import { requireAgent } from "@/lib/agent-context";
import { AuditClient } from "./_AuditClient";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireAgent(siteId);
  return <AuditClient siteId={siteId} />;
}
