/**
 * components/scan/ScanForm.tsx — hero intro + URL input for the /scan page.
 *
 * Design decisions:
 * ─────────────────
 * • Single <h1> on the page (only this component renders one). The heading copy
 *   uses a short rhetorical question — "Can everyone actually use your website?"
 *   — which is specific enough to land meaning without being a compliance claim.
 *   Accessibility overlays that do claim compliance have generated lawsuits; this
 *   product explicitly does not make that claim. The word "compliant" appears only
 *   in the microcopy beneath the form, in a quoted negation.
 *
 * • The Vellum amber underline on "your website?" is a purely decorative flourish
 *   (aria-hidden="true") — it reinforces the key phrase without relying on colour
 *   alone to convey meaning. The text itself is unchanged and the underline
 *   carries no semantic role. WCAG 1.4.1 (Use of Colour) is satisfied because the
 *   text meaning is fully legible without the underline.
 *
 * • The form is a real <form> element with an onSubmit handler, not a button-click
 *   handler. This gives keyboard users Enter-to-submit from the input field and
 *   lets browsers auto-complete URL history on the inputMode="url" field.
 *
 * • <Input> receives aria-label="Website address to scan" because there is no
 *   visible <label> element — the placeholder text alone is not a label
 *   substitute. This satisfies WCAG 1.3.1 and 4.1.2.
 *
 * • Submit button is disabled when `scanning` is true or the URL field is empty
 *   (after trimming) — prevents double-submission and gives early feedback that
 *   an empty scan is not valid.
 *
 * • "Scanning…" text replaces "Scan my site" during the in-flight state so
 *   sighted users have a clear signal without a spinner. Parent can layer a
 *   loading indicator below this component if desired.
 *
 * • All state (url, scanning) is lifted to the parent page; this component is
 *   purely presentational and controlled. This makes testing and Storybook
 *   stories trivial — pass any prop combination, observe output.
 *
 * • Colour contrast: ink-900 on paper passes AA (>7:1); ink-600 subhead passes
 *   AA (>4.5:1); ink-400 microcopy is intentionally subdued — fine at small size
 *   for supplemental non-critical text, flagged here so reviewers can assess.
 *   Signal-600 button background on white text passes AA.
 *
 * Prop contract (exact, as specified):
 *   url          — controlled string value of the URL input
 *   onUrlChange  — callback invoked with the raw input value on every keystroke
 *   onSubmit     — called with the FormEvent (or undefined for programmatic calls)
 *   scanning     — when true: disables input + button, changes button label
 */

"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Prop types ───────────────────────────────────────────────────────────────

export interface ScanFormProps {
  /** Controlled URL string — the value currently in the input field. */
  url: string;
  /** Called on every keystroke with the raw `event.target.value` string. */
  onUrlChange: (v: string) => void;
  /**
   * Form submission handler. Receives the native FormEvent when the user
   * submits via the button or by pressing Enter in the input field.
   * Declared as optional FormEvent param so callers can also invoke it
   * programmatically (e.g., from an auto-scan trigger) without fabricating
   * a synthetic event.
   */
  onSubmit: (e?: React.FormEvent) => void;
  /**
   * Set to `true` while the scan API call is in flight. Disables both the
   * input and the submit button, and changes the button label to "Scanning…".
   */
  scanning: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Centered intro section + URL scan form for the /scan page.
 *
 * Renders a single <h1>, a subhead paragraph, the scan <form>, and honesty
 * microcopy. All state is owned by the parent — this component is fully
 * controlled and purely presentational.
 *
 * @example
 * // In app/(scan)/scan/page.tsx:
 * const [url, setUrl] = useState("");
 * const [scanning, setScanning] = useState(false);
 *
 * async function handleSubmit(e?: React.FormEvent) {
 *   e?.preventDefault();
 *   setScanning(true);
 *   await runScan(url);
 *   setScanning(false);
 * }
 *
 * <ScanForm
 *   url={url}
 *   onUrlChange={setUrl}
 *   onSubmit={handleSubmit}
 *   scanning={scanning}
 * />
 */
export function ScanForm({ url, onUrlChange, onSubmit, scanning }: ScanFormProps) {
  // Prevent the native form submission default — the parent owns the async call.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(e);
  }

  return (
    <section
      className="text-center"
      // aria-labelledby ties the section landmark to its <h1> so AT users who
      // navigate by regions hear "Can everyone actually use your website? — region"
      // rather than an anonymous unnamed section.
      aria-labelledby="scan-heading"
    >

      {/* ── Headline ─────────────────────────────────────────────────────── */}
      {/*
       * Single <h1> for the page — only this component renders one.
       * font-display = Newsreader (serif) for editorial weight.
       * leading-[1.08] tightens the multi-line stack without clipping descenders.
       * tracking-tight removes default letter-spacing that looks loose at display
       * sizes on a serif face.
       */}
      <h1
        id="scan-heading"
        className={cn(
          "font-display",
          "text-4xl md:text-5xl",
          "tracking-tight leading-[1.08]",
          "text-[var(--ink-900)]",
        )}
      >
        {/* Static portion of the headline */}
        Can everyone actually use{" "}

        {/*
         * "your website?" receives the Vellum amber underline decoration.
         * The outer <span> is `relative whitespace-nowrap` so the underline
         * absolutely-positioned child always tracks the exact phrase width and
         * never wraps to a second line independently. `whitespace-nowrap`
         * prevents "your website?" splitting across lines on mid-range viewports,
         * keeping the underline visually cohesive.
         */}
        <span className="relative whitespace-nowrap">
          your website?
          {/*
           * Decorative amber underline.
           *
           * aria-hidden="true" — this span carries no information; the text
           * above is fully meaningful without colour or decoration. WCAG 1.4.1
           * (Use of Colour) requires that colour not be the *only* means of
           * conveying information — it isn't here: "your website?" is the key
           * phrase regardless of the underline's presence.
           *
           * h-[4px] gives the stroke enough weight to read at small text sizes
           * but not so heavy it feels like a highlight.
           * -bottom-2 (–8px) clears Newsreader descenders so the underline
           * doesn't clip through letters like 'y'.
           * rounded-sm softens the ends to match the editorial aesthetic.
           */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-2 h-[4px] rounded-sm"
            style={{ background: "var(--color-vellum-500)" }}
          />
        </span>
      </h1>

      {/* ── Subhead ──────────────────────────────────────────────────────── */}
      {/*
       * max-w-xl keeps the line length readable (~65–75 chars) on wide viewports.
       * mx-auto centres it under the headline.
       * ink-600 is visually subordinate to ink-900 heading, establishing hierarchy
       * without losing legibility (passes AA).
       */}
      <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--ink-600)]">
        Run a real accessibility scan in seconds. You&apos;ll get a 0–100 score
        and the specific issues turning visitors away — in plain English.
      </p>

      {/* ── Scan form ────────────────────────────────────────────────────── */}
      {/*
       * flex-col on mobile (stacks input above button), sm:flex-row on wider
       * viewports (side-by-side). gap-3 gives breathing room between the two.
       * max-w-xl aligns the form width with the subhead above it.
       */}
      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
        // noValidate defers URL validation to our own logic (the parent call)
        // so the browser's native validation bubble doesn't fire on a pattern
        // mismatch before the user has finished typing.
        noValidate
      >
        {/*
         * aria-label replaces a visible <label> — there is no room for a label
         * above the input in this layout without disrupting the visual design.
         * WCAG 1.3.1 + 4.1.2 require a programmatically determinable name; this
         * satisfies both. The placeholder is supplemental guidance, not the label.
         *
         * inputMode="url" triggers a URL-optimised keyboard on mobile (shows
         * ".com", "/" keys prominently on iOS/Android).
         * autoComplete="url" allows browser URL history to surface here.
         */}
        <Input
          type="text"
          inputMode="url"
          autoComplete="url"
          aria-label="Website address to scan"
          placeholder="yourwebsite.com"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          disabled={scanning}
          className="h-12 flex-1 text-base"
        />

        {/*
         * disabled when scanning (prevents double-submit) or when url is empty
         * after trim (prevents submitting a blank or whitespace-only value).
         * h-12 matches the Input height so the row is optically even.
         * px-7 gives the button label comfortable padding on the CTA.
         */}
        <Button
          type="submit"
          size="lg"
          disabled={scanning || !url.trim()}
          className="h-12 px-7 text-base"
        >
          {scanning ? "Scanning…" : "Scan my site"}
        </Button>
      </form>

      {/* ── Honesty microcopy ────────────────────────────────────────────── */}
      {/*
       * This line is required copy (CLAUDE.md compliance guardrails):
       * — Must NOT make positive compliance claims ("makes your site compliant").
       * — The word "compliant" appears only in a quoted negation: we don't claim it.
       * — "what to fix" is an accurate description of the scanner's output.
       *
       * ink-400 is intentionally subdued — this is supplemental fine-print, not
       * the primary message. max-w-md keeps it tighter than the form above so
       * it reads as a footnote, not a headline.
       * The quotation marks around "compliant" are curly (“/”) for
       * typographic polish on the Newsreader–system-sans axis.
       */}
      <p className="mx-auto mt-3 max-w-md text-xs text-[var(--ink-400)]">
        We scan the page you give us and report real issues. We don&apos;t claim
        any site is &ldquo;compliant&rdquo; — we show you what to fix.
      </p>
    </section>
  );
}
