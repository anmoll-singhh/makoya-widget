import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink-900)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--paper)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="transition-colors hover:opacity-80">
              <Logo dark />
            </Link>
            <span className="rounded-full bg-signal-600/15 px-2.5 py-0.5 text-xs font-semibold text-signal-700 ring-1 ring-signal-500/30">
              Operator
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/admin/requests"
              className="transition-colors rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--ink-600)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-900)]"
            >
              Requests
            </Link>
            <Link
              href="/admin/leads"
              className="transition-colors rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--ink-600)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-900)]"
            >
              Leads
            </Link>
            <Link
              href="/dashboard"
              className="transition-colors rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--ink-600)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-900)]"
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
