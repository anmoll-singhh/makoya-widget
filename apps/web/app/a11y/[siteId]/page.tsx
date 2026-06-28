/**
 * app/a11y/[siteId]/page.tsx  (RSC) — the PUBLIC accessibility-statement page.
 *
 * This is the URL a merchant puts in their footer (`accessibilityStatementUrl`,
 * surfaced to the widget as `/a11y/<siteId>`). It has NO auth: any visitor can
 * read it. It therefore reads with the SERVICE-ROLE client and — critically —
 * exposes ONLY the rendered statement `html` for this one site
 * (`getPublicStatementHtml` selects a single column), never any owner-private
 * field. The html is owner-authored, non-secret, and already XSS-escaped at
 * generation time (lib/statement.ts#generateStatementHtml).
 *
 * Behaviour:
 *  - No statement saved for this site → `notFound()` (clean 404, no detail leak).
 *  - Statement present → render it standalone via <PublicStatementView/>.
 *
 * `dynamic = "force-dynamic"` keeps the page fresh: an owner who updates their
 * statement sees the change immediately, and a freshly-created statement starts
 * resolving without a stale 404 cached at the edge.
 *
 * HONESTY (CLAUDE.md): no "compliant"/"certified"/"ADA-guaranteed" copy is added
 * here; the statement body itself is guarded by the generator.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPublicStatementHtml } from "@/lib/statement";
import { PublicStatementView } from "./_PublicStatementView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accessibility statement",
  description: "Our commitment to digital accessibility and how to reach us.",
};

export default async function PublicStatementPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // Guard malformed path input: site ids are UUIDs. A non-UUID can't match any
  // row and would otherwise make Postgres throw on the uuid cast → a 500 on this
  // public, unauthenticated page. Treat bad input as a clean 404 instead.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(siteId)) notFound();

  const html = await getPublicStatementHtml(getAdminSupabase(), siteId);
  if (!html) notFound();

  return <PublicStatementView html={html} />;
}
