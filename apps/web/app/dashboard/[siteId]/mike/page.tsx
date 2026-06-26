/**
 * app/dashboard/[siteId]/mike/page.tsx  (RSC)
 *
 * Mike audit screen — C2. Thin RSC that calls requireAgent() then renders
 * the MikeClient component.
 *
 * requireAgent() already ran in the parent [siteId]/layout.tsx, but we call it
 * again here so this page is safe on deep-link / hard refresh. The call is cheap:
 * same cookie-bound Supabase client, same RLS read, deterministic token mint.
 */
import { requireAgent } from "@/lib/agent-context";
import { MikeClient } from "./_MikeClient";

export default async function MikePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { site } = await requireAgent(siteId);

  return <MikeClient siteId={siteId} domain={site.domain} />;
}
