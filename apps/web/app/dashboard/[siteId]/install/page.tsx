/**
 * app/dashboard/[siteId]/install/page.tsx  (RSC)
 *
 * Install widget screen — C3. Thin RSC that calls requireAgent() then renders
 * the InstallClient component.
 *
 * The install token is minted SERVER-SIDE here (via requireAgent → mintSiteToken)
 * and passed down as a plain string prop — the signing secret never crosses to
 * the client bundle. Matches the discipline of app/v3/page.tsx.
 */
import { requireAgent } from "@/lib/agent-context";
import { InstallClient } from "./_InstallClient";

export default async function InstallPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { site, token } = await requireAgent(siteId);

  return (
    <InstallClient
      siteId={siteId}
      domain={site.domain}
      token={token}
    />
  );
}
