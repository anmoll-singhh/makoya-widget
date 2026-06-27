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

        {/* Primary nav.
            Labels are wrapped in .admin-lbl so they can collapse to sr-only on
            narrow phones (icon-only topbar) while AT still announces them; the
            explicit aria-label keeps each control named when the text is hidden. */}
        <nav className="admin-nav" aria-label="Admin navigation">
          <Link href="/admin/requests" aria-label="Requests">
            <i className="ti ti-message-dots" aria-hidden="true" />
            <span className="admin-lbl">Requests</span>
          </Link>
          <Link href="/admin/leads" aria-label="Leads">
            <i className="ti ti-users" aria-hidden="true" />
            <span className="admin-lbl">Leads</span>
          </Link>
        </nav>

        {/* Trailing controls */}
        <div className="admin-topbar-end">
          <Link href="/dashboard" className="btn" aria-label="My dashboard">
            <i className="ti ti-layout-dashboard" aria-hidden="true" />
            <span className="admin-lbl">My dashboard</span>
          </Link>
          {/* Sign-out: real POST to /auth/signout — functionality unchanged */}
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn" aria-label="Sign out">
              <i className="ti ti-logout" aria-hidden="true" />
              <span className="admin-lbl">Sign out</span>
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
