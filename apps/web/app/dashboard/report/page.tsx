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
 *
 * Presentation: Redline design-system tokens.
 *  bg-brand-50/ring-brand-* → bg-signal-50/ring-signal-*
 *  bg-white/ring-neutral-200/text-neutral-600 → bg-[var(--surface)]/border-[var(--border)]/text-[var(--ink-600)]
 *  text-neutral-900/500 → text-[var(--ink-900)] / text-[var(--ink-400)]
 *  font-display → font-sans  (Redline calm app — Geist only, no Newsreader)
 *  hover:bg-neutral-50 → hover:bg-[var(--paper)]
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal-50 ring-1 ring-signal-100">
            <span className="text-2xl" aria-hidden="true">⏳</span>
          </div>
          <h1 className="font-sans text-xl font-bold text-[var(--ink-900)]">
            Your widget is being set up
          </h1>
          <p className="text-sm leading-relaxed text-[var(--ink-600)]">
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
        <h1 className="font-sans text-2xl font-bold tracking-tight text-[var(--ink-900)]">
          Accessibility Report
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-600)]">
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
                    ? "inline-flex items-center rounded-full bg-signal-50 px-3 py-1 text-xs font-semibold text-signal-700 ring-1 ring-signal-300"
                    : "inline-flex items-center rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--ink-600)] ring-1 ring-[var(--border)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink-900)]"
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
