import type { ReactNode } from "react";
import { SignOutButton } from "@/components/SignOutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <span className="font-semibold">Makoya · Admin</span>
        <SignOutButton />
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
