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
      <div className="flex min-h-[55vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white px-8 py-10 text-center shadow-sm">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-sm shadow-brand-600/30">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 11l3 3 5-5" />
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
            Setting things up
          </span>
          <h1 className="font-display mt-2 text-xl font-bold tracking-tight text-neutral-900">
            Your report is on the way
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
            Once your operator provisions your site, your plain-language
            accessibility report will appear here automatically.
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900">
            Accessibility report
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
            <svg
              className="h-3.5 w-3.5 text-neutral-400"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6.25" />
              <path d="M1.75 8h12.5M8 1.75c1.7 1.7 2.6 3.9 2.6 6.25S9.7 12.55 8 14.25C6.3 12.55 5.4 10.35 5.4 8S6.3 3.45 8 1.75Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="truncate font-medium text-neutral-700">{activeSite.domain}</span>
          </p>
        </div>
        <a
          href={`https://${activeSite.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-base inline-flex items-center gap-1.5 self-start rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm hover:border-neutral-300 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 sm:self-auto"
        >
          Visit site
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M6 3.5h6.5V10M12.5 3.5 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>

      {/* Site switcher — only shown when user owns more than one site */}
      {sites.length > 1 && (
        <nav aria-label="Switch site" className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-400">Sites</span>
          {sites.map((s) => {
            const active = s.id === activeSiteId;
            return (
              <Link
                key={s.id}
                href={`/dashboard/report?site=${s.id}`}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "transition-base inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
                    : "transition-base inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
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
