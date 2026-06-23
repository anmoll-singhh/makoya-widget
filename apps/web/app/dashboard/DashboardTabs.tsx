/**
 * DashboardTabs.tsx  (client component)
 *
 * Tab navigation for the two top-level dashboard views:
 *  - "Customize" → /dashboard (preserves ?site= param)
 *  - "Report"    → /dashboard/report (preserves ?site= param)
 *
 * Reads the active route via usePathname and the current site param via
 * useSearchParams so the tab link always carries the correct ?site= value
 * when switching tabs.
 */

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Customize", href: "/dashboard" },
  { label: "Report",    href: "/dashboard/report" },
] as const;

export function DashboardTabs() {
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const siteParam  = searchParams.get("site");

  function tabHref(base: string) {
    return siteParam ? `${base}?site=${siteParam}` : base;
  }

  function isActive(href: string) {
    // /dashboard/report is active only on that exact path.
    // /dashboard is active only on /dashboard exactly.
    if (href === "/dashboard/report") return pathname === "/dashboard/report";
    return pathname === "/dashboard";
  }

  return (
    <nav
      aria-label="Dashboard sections"
      className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl gap-1 px-5">
        {TABS.map(({ label, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={tabHref(href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "transition-base relative -mb-px inline-flex items-center rounded-t-md px-3.5 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
                active
                  ? "text-brand-700"
                  : "text-neutral-500 hover:bg-neutral-50/80 hover:text-neutral-900",
              )}
            >
              {label}
              {/* Active underline. A persistent 2px baseline sits under every
                  tab; only the active one is brand-coloured, so the cue never
                  relies on colour alone — position + weight reinforce it. */}
              <span
                aria-hidden
                className={cn(
                  "transition-base absolute inset-x-2 bottom-0 h-0.5 rounded-full",
                  active ? "bg-brand-600" : "bg-transparent",
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
