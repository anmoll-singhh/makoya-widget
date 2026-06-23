"use client";

/**
 * Primary operator nav. Lives in the header. Highlights the active section so
 * the operator always knows which surface they're on. Kept accessible:
 * real links, aria-current on the active item, visible focus ring.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/admin", label: "Customers", match: (p: string) => p === "/admin" || p.startsWith("/admin/sites") },
  { href: "/admin/requests", label: "Requests", match: (p: string) => p.startsWith("/admin/requests") },
  { href: "/admin/leads", label: "Leads", match: (p: string) => p.startsWith("/admin/leads") },
] as const;

export function AdminNav() {
  const pathname = usePathname() ?? "/admin";
  return (
    <nav aria-label="Operator sections" className="flex items-center gap-1 rounded-xl bg-neutral-900/70 p-1 ring-1 ring-neutral-800">
      {SECTIONS.map((s) => {
        const active = s.match(pathname);
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={`transition-base rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
              active
                ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                : "text-neutral-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
