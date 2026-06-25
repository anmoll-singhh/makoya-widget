/**
 * components/landing/LandingFooter.tsx — quiet, warm editorial footer for the
 * marketing landing page.
 *
 * PURPOSE
 * The final visible element on the landing page. It anchors the brand, offers
 * quick navigation (Sign in / Scan), and surfaces the two most important copy
 * pieces from lib/landing-copy:
 *   - footer.tagline  — one-line product positioning.
 *   - footer.disclaimer — the honesty guardrail (no compliance claims).
 *
 * DESIGN (The Redline — editorial light theme)
 * - bg-[var(--paper)] (#FBFAF8) — the warmest, quietest surface in the system.
 *   This ensures the footer visually recedes below the dark FinalCta band.
 * - Top border hairline in var(--border) (#ECE9E3) creates a clean section
 *   boundary without heaviness.
 * - Logo in its default (light) mode, accompanied by minimal nav links.
 * - Tagline in ink-600 (#6B6760) — readable but muted.
 * - Disclaimer in ink-600 (#6B6760) — contrast vs paper ≈ 4.8:1, meeting
 *   WCAG AA for normal text (4.5:1 threshold) even at 12px. ink-400 (~3.1:1)
 *   fails AA for normal text — WCAG requires 4.5:1 for text below 18px
 *   (or 14px bold). Our own scanner flags this, so we use ink-600. ✓
 *
 * MOTION
 * No motion in the footer — it's the last thing on screen and animating it
 * in adds no value and can feel jarring. Keeping it static also means we can
 * safely omit "use client" and let it be a Server Component... but "use client"
 * is harmless here (no extra bundle since it has no interactivity or hooks)
 * and keeps the file consistent with the other landing components.
 *
 * ACCESSIBILITY
 * - <footer> landmark (role="contentinfo") for screen readers.
 * - Nav links are real <a> via next/link — tabbable, visibly focusable.
 * - Logo text ("Makoya") is meaningful to AT users — no aria-hidden on it.
 * - The "visually hidden" dot separator between nav items is aria-hidden.
 */
"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { footer } from "@/lib/landing-copy";

// ---------------------------------------------------------------------------
// Navigation links shown in the top row of the footer.
// Kept as a local constant so copy and routes are easy to extend.
// ---------------------------------------------------------------------------

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Sign in", href: "/login" },
  { label: "Scan", href: "/scan" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LandingFooter() {
  return (
    <footer
      className="border-t border-[var(--border)] bg-[var(--paper)]"
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-6xl px-6 py-12">

        {/* ── Top row: logo + nav ─────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-y-4">

          {/* Logo — left-anchored, default (light) colour mode */}
          <Link
            href="/"
            aria-label="Makoya — go to home page"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-600 focus-visible:ring-offset-2 rounded-lg"
          >
            <Logo />
          </Link>

          {/* Small inline nav — right-anchored on wider screens */}
          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-6" role="list">
              {NAV_LINKS.map((link, index) => (
                <li key={link.href} className="flex items-center gap-6">
                  {/* Separator dot between links (hidden from AT) */}
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className="text-[var(--ink-400)] select-none"
                    >
                      ·
                    </span>
                  )}
                  <Link
                    href={link.href}
                    className={[
                      "text-sm text-[var(--ink-600)]",
                      "underline-offset-4 transition-colors duration-150",
                      "hover:text-[var(--ink-900)] hover:underline",
                      "focus-visible:text-[var(--ink-900)] focus-visible:underline focus-visible:outline-none",
                    ].join(" ")}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* ── Tagline ─────────────────────────────────────────── */}
        {/*
          ink-600 (#6B6760) on paper (#FBFAF8) → ~4.8:1. Meets WCAG AA
          for normal text (4.5:1 threshold). ✓
        */}
        <p className="mt-6 max-w-xl text-sm text-[var(--ink-600)]">
          {footer.tagline}
        </p>

        {/* ── Disclaimer / honesty note ───────────────────────── */}
        {/*
          ink-600 (#6B6760) on paper (#FBFAF8) → ~4.8:1. Meets WCAG AA
          for normal text (4.5:1 threshold) at 12px. ink-400 (~3.1:1) fails
          AA for text below 18px regular weight — our own scanner would flag it.
        */}
        <p className="mt-2 max-w-xl text-xs text-[var(--ink-600)]">
          {footer.disclaimer}
        </p>

      </div>
    </footer>
  );
}
