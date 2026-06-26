/**
 * app/v3/page.tsx  (RSC) — the v3.1 dashboard preview shell.
 *
 * A NON-BREAKING, additive route that renders the founder-facing v3.1 UI (a port
 * of docs/makoya_v3.1.html) wired to the LIVE authed APIs. It does NOT touch the
 * production /dashboard or /admin routes.
 *
 * Responsibilities (server-side only):
 *  1. Require a session — redirect to /login when there is none (mirrors the
 *     dashboard's auth posture).
 *  2. Resolve the user's first site via RLS-scoped `listSites`.
 *  3. Mint the install token SERVER-SIDE (`mintSiteToken` — the signing secret
 *     never crosses to the client) and pass { siteId, domain, token } down.
 *  4. If the user has no site yet, render a calm empty state.
 *
 * Every screen's REAL data is fetched client-side from the authed
 * `/api/sites/[siteId]/*` endpoints (same-origin fetch forwards the auth cookie).
 */
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { listSites } from "@/lib/sites";
import { mintSiteToken } from "@/lib/licensing/token";
import { Dashboard } from "./Dashboard";
import "./v3.css";

export const metadata = {
  title: "Makoya — v3.1 dashboard (preview)",
};

export default async function V3Page() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/v3");

  const sites = await listSites(supabase, user.id);

  // ── Empty state: no site provisioned yet ──────────────────────────────────
  if (sites.length === 0) {
    return (
      <div className="v3app">
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "40px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <div
              className="h1"
              style={{ fontSize: 22, marginBottom: 8 }}
            >
              Your widget is being set up
            </div>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              Your operator will hand over access shortly. Once your site is
              provisioned it will appear here automatically — no action needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const site = sites[0];
  const token = mintSiteToken(site.id);

  return (
    <Dashboard
      siteId={site.id}
      domain={site.domain}
      token={token}
      accountEmail={user.email ?? ""}
    />
  );
}
