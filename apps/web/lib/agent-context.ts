/**
 * lib/agent-context.ts — shared auth + ownership helper for all [siteId] RSC pages.
 *
 * Every Lane C page (Overview, Mike, Install, …) calls `requireAgent(siteId)` at
 * the top of its RSC body. This avoids duplicating the auth + ownership block across
 * four different files and ensures every per-agent route uses exactly the same
 * redirect/404 discipline as the v3 page.tsx.
 *
 * Contract:
 *  - No session  → redirect to /login?next=/dashboard/<siteId>
 *  - Site not found OR not owned by the caller → notFound() (404)
 *  - OK          → { site, token, userId }
 *
 * The token is minted server-side here (via mintSiteToken) so the signing secret
 * never crosses to the client. Pages pass the token string down to client
 * components as a plain prop — it is not stored in state, localStorage, or any
 * cookie.
 *
 * SERVER-ONLY: this file imports mintSiteToken from lib/licensing/token, which
 * uses node:crypto. Never import it from a client component.
 */
import { redirect, notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite, type Site } from "@/lib/sites";
import { mintSiteToken } from "@/lib/licensing/token";

export interface AgentContext {
  site: Site;
  token: string;
  userId: string;
}

/**
 * Authenticate + authorize the current request for a specific site.
 *
 * Uses the cookie-bound Supabase client (same-origin, RLS-scoped) to:
 *  1. Verify there is an active session. Absent → redirect to login.
 *  2. Load the site row. Not found or owned by a different user → 404.
 *  3. Mint the install token (deterministic HMAC, no DB write).
 *
 * Return is a plain object so it can be spread into RSC component props.
 */
export async function requireAgent(siteId: string): Promise<AgentContext> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/dashboard/${siteId}`);
  }

  const site = await getSite(supabase, siteId);

  // RLS already hides rows the caller doesn't own, but we re-check ownerId
  // explicitly so a missing row and a foreign row both yield a clean 404 rather
  // than a false empty-ish render. Mirrors the discipline in /api/sites/[id]/overview.
  if (!site || site.ownerId !== user.id) {
    notFound();
  }

  const token = mintSiteToken(siteId);

  return { site, token, userId: user.id };
}
