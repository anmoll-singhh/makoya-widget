/**
 * app/dashboard/layout.tsx  (RSC)
 *
 * Shared shell for all /dashboard/* routes.  Renders:
 *  - Sticky header: logo on the left, avatar/account-link + sign-out on the right
 *  - <DashboardTabs>: "Customize" / "Report" tab nav under the header
 *  - <main>: page content
 *
 * Account is reachable via the avatar pill (not as a tab — it is a secondary
 * destination, not a primary workflow step).
 */

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { getServerSupabase } from "@/lib/supabase/server";
import { DashboardTabs } from "./DashboardTabs";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email   = user?.email ?? "";
  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-dvh bg-neutral-50">
      {/* Skip link — first focusable element, lets keyboard/SR users jump
          straight past the header chrome to the page content. */}
      <a
        href="#dashboard-main"
        className="sr-only z-50 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        Skip to content
      </a>

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
          <Link
            href="/dashboard"
            aria-label="Makoya dashboard home"
            className="transition-base rounded-lg hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <Logo />
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/dashboard/account"
              aria-label={email ? `Account settings for ${email}` : "Account settings"}
              className="transition-base flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1 pl-1 pr-3 shadow-sm hover:border-neutral-300 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <span
                aria-hidden="true"
                className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-violet-600 text-xs font-bold text-white"
              >
                {initial}
              </span>
              <span className="hidden max-w-[160px] truncate text-sm font-medium text-neutral-700 sm:block">
                {email}
              </span>
            </Link>
            <SignOutButton />
          </div>
        </div>

        {/* Tab nav — useSearchParams requires Suspense boundary */}
        <Suspense fallback={null}>
          <DashboardTabs />
        </Suspense>
      </header>

      <main id="dashboard-main" className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
