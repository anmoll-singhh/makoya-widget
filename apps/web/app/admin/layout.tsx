import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";

/**
 * Operator shell. Dark, dense, fast. The header carries identity + a clear
 * primary-section nav (Customers / Requests / Leads) with an active-state
 * indicator so the operator always knows where they are. A thin utility row
 * holds the escape hatches (own dashboard, sign out).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="transition-base hover:opacity-80" aria-label="Makoya operator home">
              <Logo dark />
            </Link>
            <span className="rounded-full bg-brand-600/15 px-2.5 py-0.5 text-xs font-semibold text-brand-200 ring-1 ring-brand-500/30">
              Operator
            </span>
          </div>

          {/* Primary section nav — the operator's spine. */}
          <AdminNav />

          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="transition-base hidden rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-400 hover:bg-white/10 hover:text-white sm:inline-block"
            >
              My dashboard
            </Link>
            <SignOutButton dark />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
