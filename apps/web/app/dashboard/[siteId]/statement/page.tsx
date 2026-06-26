/**
 * app/dashboard/[siteId]/statement/page.tsx  (RSC — C5)
 *
 * Accessibility Statement screen. A thin RSC shell that:
 *  1. Calls requireAgent() to authenticate + verify site ownership.
 *  2. Gets the user's email from the session (used as a default accessibility
 *     contact pre-fill before the owner sets a custom address).
 *  3. Renders StatementClient with siteId, domain, and accountEmail props.
 *
 * All data is fetched client-side by StatementClient:
 *   GET  /api/sites/[siteId]/statement → current record or null
 *   POST /api/sites/[siteId]/statement → save / generate the statement
 *
 * The generated HTML in the statement record is XSS-escaped server-side
 * by lib/statement.ts (not a compliance claim — see the honesty note in
 * StatementClient).
 */
import { requireAgent } from "@/lib/agent-context";
import { getServerSupabase } from "@/lib/supabase/server";
import { StatementClient } from "./_StatementClient";

export default async function StatementPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // Auth + ownership guard.
  const { site } = await requireAgent(siteId);

  // Grab the session email so the client can use it as the default contact.
  // If the email isn't available for any reason we fall back to an empty string
  // — StatementClient handles this gracefully with a placeholder.
  let accountEmail = "";
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    accountEmail = user?.email ?? "";
  } catch {
    // Non-fatal — the client form still works without a pre-filled email.
  }

  return (
    <StatementClient
      siteId={siteId}
      domain={site.domain}
      accountEmail={accountEmail}
    />
  );
}
