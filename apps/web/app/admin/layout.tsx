/**
 * app/admin/layout.tsx — Admin CRM shell
 *
 * v7 restyle: uses the shared dashboard CSS tokens + component classes
 * (imported via admin.css → dashboard.css) so the admin and client
 * dashboard share the same visual identity. Markup is visual-only —
 * all routes, auth gating, and sign-out behaviour are unchanged.
 *
 * Shell shape: sticky glass topbar (brand + nav + sign-out) + full-bleed
 * content well. No sidebar grid — admin is topbar-only.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import "./admin.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-layout">
      {/* Skip navigation for keyboard / screen-reader users */}
      <a href="#admin-main" className="skip">
        Skip to content
      </a>

      {/* ── Sticky glass topbar ─────────────────────────────────────────── */}
      <header className="admin-topbar" role="banner">
        {/* Brand: logo + "Admin" badge */}
        <Link href="/admin" className="admin-brand" aria-label="Makoya Admin home">
          <Logo />
          <span className="admin-badge">Admin</span>
        </Link>

        {/* Primary nav */}
        <nav className="admin-nav" aria-label="Admin navigation">
          <Link href="/admin/requests">
            <i className="ti ti-message-dots" aria-hidden="true" />
            Requests
          </Link>
          <Link href="/admin/leads">
            <i className="ti ti-users" aria-hidden="true" />
            Leads
          </Link>
        </nav>

        {/* Trailing controls */}
        <div className="admin-topbar-end">
          <Link href="/dashboard" className="btn">
            <i className="ti ti-layout-dashboard" aria-hidden="true" />
            My dashboard
          </Link>
          {/* Sign-out: real POST to /auth/signout — functionality unchanged */}
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn">
              <i className="ti ti-logout" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main id="admin-main" className="admin-content">
        {children}
      </main>
    </div>
  );
}
