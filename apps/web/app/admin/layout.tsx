import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="transition-base hover:opacity-80">
              <Logo dark />
            </Link>
            <span className="rounded-full bg-brand-600/15 px-2.5 py-0.5 text-xs font-semibold text-brand-200 ring-1 ring-brand-500/30">
              Operator
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="transition-base rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-400 hover:bg-white/10 hover:text-white"
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
