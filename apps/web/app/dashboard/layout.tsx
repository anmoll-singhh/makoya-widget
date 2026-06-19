import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/dashboard" className="transition-base hover:opacity-80">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">{children}</main>
    </div>
  );
}
