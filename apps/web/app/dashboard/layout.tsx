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
    <div className="min-h-dvh bg-[var(--paper)]">
      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/dashboard" className="transition-colors hover:opacity-80">
            <Logo />
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/dashboard/account"
              className="transition-colors flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-3 shadow-sm hover:border-[var(--border-strong)] hover:shadow"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-signal-600 text-xs font-bold text-white">
                {initial}
              </span>
              <span className="hidden max-w-[160px] truncate text-sm font-medium text-[var(--ink-600)] sm:block">
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

      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">{children}</main>
    </div>
  );
}
