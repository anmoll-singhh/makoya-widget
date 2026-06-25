/**
 * components/landing/LandingHeader.tsx — sticky marketing-site header.
 *
 * Design decisions:
 * ─────────────────
 * • Sticky at the top (z-30) with a warm Paper background at 85% opacity +
 *   backdrop-blur so page content scrolls behind a semi-translucent chrome bar —
 *   a pattern that keeps the header lightweight without losing orientation.
 * • Nav links are hidden on mobile (< sm) to keep the header clean; they are
 *   only necessary for users who have already decided to explore and are on a
 *   desktop with room to display them. Mobile users have the scan CTA immediately.
 * • "Sign in" is a quiet text link, not a button — returning users are a smaller
 *   subset, and a second button would compete with the primary "Scan free" CTA.
 * • The primary CTA is a full <Button> wrapping a <Link> via `asChild` / Slot —
 *   this keeps native <a> semantics and keyboard navigation intact.
 * • All interactive elements have visible focus rings via Tailwind's
 *   focus-visible:ring-2 pattern — critical for an accessibility brand whose own
 *   scanner would flag a missing focus style on this exact header.
 * • The landmark is a proper <header> element; nav is wrapped in <nav
 *   aria-label="Primary"> so screen-reader users can jump to or skip past it.
 *   The skip-link anchor is left to the host page layout (app/layout.tsx).
 */

"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

// ─── Nav Link Data ────────────────────────────────────────────────────────────
// Kept as a typed constant so label/href pairs are in one place and easy to
// diff or extend (e.g., adding "Pricing #pricing") without touching JSX.

const NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "How it works", href: "#how" },
  { label: "Why honest", href: "#honest" },
  { label: "What you get", href: "#surfaces" },
];

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Sticky top header for the marketing landing page.
 *
 * Renders at the very top of <body> (inside a <header> landmark) so assistive
 * technology can jump directly to the navigation region. The host layout is
 * responsible for rendering a "skip to content" link above this component.
 *
 * @example
 * // In app/page.tsx or the landing layout:
 * <LandingHeader />
 * <main id="content">…</main>
 */
export function LandingHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--paper)]/85 backdrop-blur"
      // Explicitly set as a banner landmark; redundant but
      // explicit for screen readers that may not infer from position.
      role="banner"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        {/* ── Wordmark / home link ───────────────────────────────────────── */}
        {/*
         * Logo is wrapped in an <a> pointing to "/" so clicking it always
         * returns the visitor to the top of the landing page. The aria-label
         * makes the link purpose unambiguous for screen-reader users who may
         * hear only "Makoya" without the visual wordmark context.
         */}
        <Link
          href="/"
          aria-label="Makoya — back to home"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-sm"
        >
          <Logo />
        </Link>

        {/* ── Primary navigation ────────────────────────────────────────── */}
        {/*
         * aria-label="Primary" distinguishes this from any secondary nav that
         * may appear (e.g., footer navigation, breadcrumbs) so AT users can
         * easily orient.
         */}
        <nav aria-label="Primary" className="flex items-center gap-6">

          {/* Anchor links — hidden on mobile to keep the header uncluttered.
              They scroll to section IDs defined on the landing page. */}
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={[
                "hidden sm:inline",
                "text-sm font-medium",
                "text-[var(--ink-600)] hover:text-[var(--ink-900)]",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
                "rounded-sm",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}

          {/* Divider — visual separation between nav links and auth/CTA cluster.
              aria-hidden because it carries no information. */}
          <span
            aria-hidden="true"
            className="hidden sm:block h-4 w-px bg-[var(--border)]"
          />

          {/* Sign in — quiet ghost link for returning authenticated users.
              Intentionally styled as a text link (not a button) so it does
              not visually compete with "Scan free". */}
          <Link
            href="/login"
            className={[
              "text-sm font-medium",
              "text-[var(--ink-600)] hover:text-[var(--ink-900)]",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
              "rounded-sm",
            ].join(" ")}
          >
            Sign in
          </Link>

          {/* Scan free — primary conversion CTA. Uses Button's default variant
              (Signal-600 cobalt) which meets AA contrast on Paper (#FBFAF8).
              asChild passes the button styles to the inner <Link>, preserving
              <a> semantics (right-click, cmd+click, href in status bar, etc.). */}
          <Button asChild size="sm">
            <Link href="/scan">Scan free</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
