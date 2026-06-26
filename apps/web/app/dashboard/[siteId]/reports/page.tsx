/**
 * app/dashboard/[siteId]/reports/page.tsx  (RSC — C7)
 *
 * Reports screen. A thin RSC shell that:
 *  1. Calls requireAgent() to authenticate + verify site ownership.
 *  2. Renders ReportsClient with the siteId prop.
 *
 * ReportsClient fetches two APIs lazily:
 *   GET /api/sites/[siteId]/reports     → MonthlyReport[] (on mount)
 *   GET /api/sites/[siteId]/remediation → RemediationEntry[] (on first tab open)
 *
 * No monthly data is hard-coded. Months, scores, issue counts, and resolved counts
 * all come from the real `monthly_reports` table. PDF links are shown only when
 * the server returns a non-null `pdfUrl`; otherwise an honest "—" is rendered.
 */
import { requireAgent } from "@/lib/agent-context";
import { ReportsClient } from "./_ReportsClient";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // Auth + ownership guard.
  await requireAgent(siteId);

  return <ReportsClient siteId={siteId} />;
}
