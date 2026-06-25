/**
 * components/scan/ScanHeader.tsx — top bar for the /scan page.
 *
 * Design decisions:
 * ─────────────────
 * • Matches the LandingHeader's visual language (Redline warm-paper system:
 *   Paper background at 85% opacity + backdrop-blur, Signal border-b) so the
 *   /scan experience feels like a coherent extension of the marketing site, not
 *   a separate product.
 * • Deliberately leaner than LandingHeader: no primary nav links, no "Scan free"
 *   CTA (the user is already on the scan page). The only secondary action is
 *   "Sign in", which is a quiet text link — returning users should be able to
 *   authenticate without the link competing with the form below.
 * • max-w-3xl constrains the inner rail to match ScanForm's own max-w layout,
 *   keeping the header and form optically aligned even on wide viewports.
 * • Logo is wrapped in a <Link> with an explicit aria-label so screen-reader
 *   users hear a clear destination ("Makoya — back to home") rather than just
 *   the wordmark text.
 * • Visible focus rings on every interactive element — critical for an
 *   accessibility product whose own scanner would flag a missing focus style
 *   right at the top of its own page.
 * • No `role="banner"` explicit annotation here (HTML5 <header> already implies
 *   the banner landmark when it is a direct descendant of <body>).
 *
 * This is a purely presentational CLIENT component; it holds no state or data
 * fetching. The parent page (app/scan/page.tsx or similar) owns layout context.
 */

"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Slim header bar rendered at the top of the /scan page.
 *
 * Contains:
 * - Left: Logo wordmark linked to "/" (home)
 * - Right: "Sign in" quiet text link pointing to "/login"
 *
 * No props required — this component has no configurable surface at this stage.
 *
 * @example
 * // In app/(scan)/scan/page.tsx:
 * <ScanHeader />
 * <main>…</main>
 */
export function ScanHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--paper)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">

        {/* ── Wordmark / home link ───────────────────────────────────────── */}
        {/*
         * Linking the wordmark to "/" is the standard convention; it gives
         * every /scan visitor a one-click escape hatch back to the landing page
         * without needing a full back-navigation affordance.
         * aria-label spells out the link purpose so AT users are not left to
         * infer destination from "Makoya" alone.
         */}
        <Link
          href="/"
          aria-label="Makoya — back to home"
          className={[
            "rounded-sm",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-[var(--ring)]",
            "focus-visible:ring-offset-2",
          ].join(" ")}
        >
          <Logo />
        </Link>

        {/* ── Sign in ───────────────────────────────────────────────────── */}
        {/*
         * Quiet text link rather than a button: returning users are a minority
         * of /scan visitors and the link should not pull visual weight away from
         * the scan form below. Text colour uses ink-600 at rest → ink-900 on
         * hover, matching the landing header's sign-in treatment exactly so the
         * two pages share a cohesive interaction pattern.
         */}
        <Link
          href="/login"
          className={[
            "text-sm font-medium",
            "text-[var(--ink-600)] hover:text-[var(--ink-900)]",
            "transition-colors duration-150",
            "rounded-sm",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-[var(--ring)]",
            "focus-visible:ring-offset-2",
          ].join(" ")}
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
