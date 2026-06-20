/**
 * app/dashboard/report/page.tsx  (RSC)
 *
 * Accessibility report tab. Resolves the active site (same RLS-scoped
 * validation as the customizer landing) then renders <ScanReport> inside a
 * thin client wrapper that allows Re-scan by remounting via a React key.
 *
 * If the user owns multiple sites, a simple site-switcher set of links is
 * rendered above the report so they can jump between sites without needing
 * the Customizer's Select.
 */

import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { listSites } from "@/lib/sites";
import { RescannableScanReport } from "./RescannableScanReport";

interface Props {
  searchParams: Promise<{ site?: string }>;
}

export default async function ReportPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sites = user ? await listSites(supabase, user.id) : [];

  // ── Empty state ────────────────────────────────────────────────────────────
  if (sites.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-md space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-100">
            <span className="text-2xl" aria-hidden="true">⏳</span>
          </div>
          <h1 className="font-display text-xl font-bold text-neutral-900">
            Your widget is being set up
          </h1>
          <p className="text-sm leading-relaxed text-neutral-500">
            Your operator will hand over access shortly. Once your site is
            provisioned your accessibility report will appear here.
          </p>
        </div>
      </div>
    );
  }

  // ── Resolve active site ────────────────────────────────────────────────────
  const ownedIds = new Set(sites.map((s) => s.id));
  const activeSiteId =
    sp.site && ownedIds.has(sp.site) ? sp.site : sites[0].id;
  const activeSite = sites.find((s) => s.id === activeSiteId)!;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900">
          Accessibility Report
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {activeSite.domain}
        </p>
      </div>

      {/* Site switcher — only shown when user owns more than one site */}
      {sites.length > 1 && (
        <nav aria-label="Site switcher" className="flex flex-wrap gap-2">
          {sites.map((s) => {
            const active = s.id === activeSiteId;
            return (
              <Link
                key={s.id}
                href={`/dashboard/report?site=${s.id}`}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200"
                    : "inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
                }
              >
                {s.domain}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Report + re-scan */}
      <RescannableScanReport siteId={activeSiteId} />
    </div>
  );
}
