/**
 * /api/sites/[id]/install-status — AUTHED owner view of a site's widget liveness.
 *
 * Mirrors the auth + ownership pattern of `/api/sites/[id]/config`: a cookie-bound
 * server client (RLS-scoped) + an explicit ownership check. The owner sees whether
 * their widget is installed and phoning home, plus when it was first/last seen.
 *
 * The status is computed by the PURE `deriveInstallStatus` from two inputs:
 *  - the latest scan score for the site (so a live-but-failing site reads
 *    "action_needed" rather than a falsely reassuring "active"), and
 *  - the heartbeat's `last_seen_at` (liveness recency).
 *
 * RLS already scopes reads to the owner, so a null site → 404; a wrong-owner row
 * never returns. We still re-check `ownerId` defensively to match the config route.
 *
 * Honesty: this reports install/liveness state only — no WCAG/ADA compliance claim.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { getLatestScan } from "@/lib/scans";
import { getHeartbeat, deriveInstallStatus } from "@/lib/heartbeat";
import { captureError } from "@/lib/observability";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const site = await getSite(supabase, id);
    // RLS already hides other owners' rows → null means not found for this caller.
    if (!site) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (site.ownerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const [latestScan, heartbeat] = await Promise.all([
      getLatestScan(supabase, id),
      getHeartbeat(supabase, id),
    ]);

    const status = deriveInstallStatus({
      lastSeenAt: heartbeat?.lastSeenAt ?? null,
      latestScore: latestScan?.score ?? null,
    });

    return NextResponse.json({
      status,
      lastSeenAt: heartbeat?.lastSeenAt ?? null,
      firstSeenAt: heartbeat?.firstSeenAt ?? null,
      pingCount: heartbeat?.pingCount ?? 0,
    });
  } catch (e) {
    captureError(e, { route: "install-status" });
    return NextResponse.json({ error: "failed to load install status" }, { status: 500 });
  }
}
