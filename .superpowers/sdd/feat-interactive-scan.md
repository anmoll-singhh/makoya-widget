# feat: interactive scanning experience — AddAgent wizard step 2

**Branch:** `worktree-agent-ab3902d1942ca0d44`
**Files changed:** `apps/web/app/dashboard/agents/new/AddAgent.tsx`, `apps/web/app/dashboard/dashboard.css`

## What was done

Replaced the plain spinner-wait in the AddAgent wizard's "Free scan" step with an interactive, animated phase checklist that plays while the REAL `/api/public-scan` call is in-flight. When the scan returns, the result reveals with a fade-up animation and the score ring strokes in.

## Architecture decisions

### State machine
Added `scanUIState: "idle" | "scanning" | "done"` to drive which UI is mounted in step 2. Transition: form submit → site created → `scanning` (phase checklist) → real scan lands → `done` (result panel). `revealResult: boolean` gates the reveal animation independently, set 600 ms after `scanUIState = "done"` to let the all-phases-checked state register first.

### Phase ticker
A `setInterval` (stored in `phaseIntervalRef`) advances `scanPhaseIndex` every `PHASE_MS = 1800 ms`. 7 phases × 1.8 s ≈ 12.6 s. The ticker holds at the last phase ("Scoring…") until `finalizeScan` is called. `finalizeScan` stops the timer, jumps `scanPhaseIndex` to `SCAN_PHASES.length` (all ✓), then after 600 ms reveals the result.

### Cosmetic vs real
The phase checklist is **entirely cosmetic** — it does not represent real sub-step progress from the scanner. The actual result (score, issues) comes unchanged from `/api/public-scan`. The honest copy ("We scanned your homepage", "install to unlock the full audit", etc.) is preserved verbatim.

### Reduced-motion (non-negotiable for an a11y product)
Defence in depth — two independent layers:

1. **CSS layer** — `dashboard.css` already has `@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`. This suppresses all four new keyframes (`mky-phase-in`, `mky-spin`, `mky-shimmer`, `mky-reveal`) and the `ScoreRing` stroke transition automatically, even if the React layer has a bug.
2. **React layer** — `reduceMotionRef` is set from `window.matchMedia("(prefers-reduced-motion: reduce)")` on mount and tracks live changes. When set:
   - `startPhaseTimer()` is a no-op (no interval fires)
   - `ScanningAnimation` is replaced with a plain `<p>Scanning {domain}…</p>`
   - `animateIn={false}` on `ScoreRing` (ring renders at final dashoffset, no transition)
   - `finalizeScan` uses delay=0 (instant reveal)

Result for reduced-motion users: "Scanning example.com…" text → instant result reveal with no motion.

### Stale closure safety
`reduceMotionRef` (a `useRef`) is used inside `finalizeScan` and `startPhaseTimer` instead of the `reduceMotion` state value. These functions execute asynchronously (after the scan returns, which may be 30+ s), by which time the `reduceMotion` closure from their definition render would be stale.

### ScoreRing animation
`ScoreRing` now accepts `animateIn: boolean`. When true, it initialises `strokeDashoffset` at 98 (empty ring) and after an 80 ms paint delay transitions to the real value via `stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)`. The CSS layer suppresses this for reduced-motion users. The caller passes `animateIn={revealResult && !reduceMotion}`.

## Accessibility checklist

- `role="status" aria-live="polite"` wraps the scanning state container.
- An inner `<span className="sr-only" aria-live="polite" aria-atomic="true">` carries the current phase label for screen readers, updating every 1.8 s. The visual checklist list is `aria-hidden` to avoid double-reading.
- Progress bar is `aria-hidden` (purely decorative).
- No keyboard trap introduced; real `<button>` elements only.
- All animation icons are `aria-hidden`; text carries the meaning.
- Text sizes ≥ 13 px, font-weight ≥ 500.
- Reduced-motion path verified by reasoning (no interval, no keyframe classes, no transitions).

## No-op for error paths
If `/api/public-scan` fails or times out, `finalizeScan(null, ...)` is called — same as before. The existing honest empty state ("We couldn't complete the homepage scan…") is shown unchanged.

## API / data contracts unchanged
- POST `/api/sites` — unchanged
- POST `/api/public-scan` — unchanged
- Redirect to `/dashboard/<siteId>/install` — unchanged
- PostHog `agent_added` + `free_scan_viewed` events — unchanged
