# Makoya landing page (`/`) — design spec

> 2026-06-23. Research-informed (last30days + 2026 conversion sources). Locked strategy: honest hybrid, SMB self-serve via the scanner funnel, never overlay-compliance claims.

## Goal
A demo-quality marketing landing page at `/` that makes the value obvious in <3s, drives every CTA into the free scan (`/scan`), and converts through honesty rather than hype. Replaces the current `/ → /dashboard` redirect.

## Research → decisions (why this converts)
- **<3s clarity / 5-second hero test** → outcome headline ≤8 words + the scan input *in the hero* (the interactive tool is the hook; interactive lead magnets ~47% vs static).
- **One value-loaded CTA, repeated** → every CTA is "Scan your site free" (value: a real score in ~30s) at hero / after contrast / final. No competing buttons.
- **Proof by relevance + placement, not volume** → we have no customer logos yet, so the category-fact stat cards (FTC $1M overlay action; 22.6% of overlay sites still sued H1-2025; WebAIM 67%/72% rate overlays ineffective) are our credibility, placed right before a CTA. Zero fabricated logos/testimonials.
- **Docs-as-product trust for technical buyers** → a short "how the scan actually works / what it can and can't catch" transparency block.
- **3-field capture** confirmed optimal (we already gate with email only on `/scan`).

## Page structure (top → bottom)
1. **Header** — Logo · nav (How it works · Why honest) · "Sign in" (`/login`) · "Scan your site" button (`/scan`).
2. **Hero** — gradient headline ≤8 words ("See what's really blocking your visitors"), one-line honest subhead, **inline URL input → `/scan?url=<encoded>`**, honest microcopy (no "compliant" claims), `glow-brand` backdrop.
3. **Why honest (contrast = our proof)** — "The 'one line of code = compliant' era is ending." 3 stat cards (category facts, NO company named), then a CTA.
4. **How it works (3 steps)** — Scan (real axe-core) → Fix at the source (plain English, not an overlay patch) → Monitor (re-scan + alerts).
5. **The three surfaces** — Widget (15 honest preferences, never auto-detects AT, one-click dismiss) · Scanner (real WCAG 2.0/2.1/2.2 engine) · Dashboard + Admin (customize, track worst-first).
6. **How the scan works (transparency)** — short, honest: what it checks, that automated tools catch only part of all barriers, that we never sell a compliance badge.
7. **Final CTA** — "Scan your site free" (`/scan`) primary; "Sign in" secondary. (Calendly "book a call" added later when the link exists.)
8. **Footer** — Logo, honest tagline, links, explicit honesty disclaimer line.

## Technical approach
- Static **Server Component** at `app/page.tsx` (fast cold load, SEO). Existing Tailwind v4 + shadcn + `Logo` + `font-display` + `text-gradient` + `glow-brand`. No new deps.
- Hero scan input is a **tiny client component** that navigates to `/scan?url=<encoded>`.
- `/scan` reads the `url` search param (via `useSearchParams`), prefills the input, and auto-runs the scan once. Wrap in `<Suspense>` as Next requires for `useSearchParams`.
- Logged-in users still see the landing at `/` (no auto-redirect away). Header links into the app via Sign in.

## Accessibility (non-negotiable — an inaccessible a11y site is fatal)
Semantic landmarks (`header`/`main`/`section`/`footer`), real `<button>`/`<a>`, visible focus states, alt text, AA contrast, logical heading order. QA: run our own scanner against the deployed landing.

## Honesty guardrail
All copy free of "WCAG/ADA compliant", "fully compliant", "guaranteed", "lawsuit-proof". Add a unit test asserting the landing copy strings contain none of these (extend the existing honest-copy guardrail pattern).

## Scope / non-goals
No pricing table, no blog, no new animation deps (subtle CSS only), single page, no Calendly yet (placeholder).

## Testing
Honest-copy unit test on landing copy; `npm run ci` green; react-best-practices + security review; deploy; browser QA (renders, hero input deep-links + auto-runs scan, no console errors) + scan our own landing for accessibility.
