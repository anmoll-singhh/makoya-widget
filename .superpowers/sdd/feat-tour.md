# feat-tour — First-login product tour

**Branch:** `worktree-agent-a7aa6d3ce93d9cdd5`  
**Status:** Done — typecheck clean, committed.

## What was built

### `apps/web/app/dashboard/_components/Tour.tsx`
New `"use client"` component. A 5-step modal tour that appears on first dashboard visit.

**Steps:**
1. Welcome to Makoya
2. Agents (switcher in top-left)
3. Mike (audit screen)
4. Widget (install + customize)
5. Compliance & insights (statement, proof, analytics, reports)

**Gating:** `localStorage.getItem("makoya_tour_v1")` checked inside `useEffect` (SSR-safe). On any dismiss path (skip / finish / Esc / click-away) → `localStorage.setItem("makoya_tour_v1","done")`.

**Accessibility contract met:**
- `role="dialog" aria-modal="true" aria-labelledby="tour-dialog-title"` on the card element.
- `tabIndex={-1}` on the card; `requestAnimationFrame → dialogRef.current.focus()` on open.
- Focus restored to `returnFocusRef.current` on close.
- Full focus trap via `document.addEventListener("keydown", ...)` when visible: Tab wraps last→first, Shift+Tab wraps first→last.
- Esc key = dismiss (preventDefault + dismiss()).
- Step counter has `aria-live="polite" aria-atomic="true"` for screen-reader announcement.
- Backdrop is `aria-hidden="true"`.
- Dot indicators are `aria-hidden="true"`.
- All controls are real `<button>` elements (Skip, Back, Next, Get started).
- "Skip" button has `aria-label="Skip tour and don't show again"` for clarity.
- `prefers-reduced-motion`: dashboard.css globally blankets `*{transition:none!important}` when set — dot indicator transitions auto-disable.

**Visual:** uses v7 tokens (`--surface`, `--border`, `--primary`, `--primary-soft`, `--primary-hover`, `--deep`, `--t2`, `--t3`, `--sh-pop`). Card uses `.btn`, `.btn.ghost`, `.btn.pri` classes. Text ≥ 14.5 px body, weight 500+, dark (`--t2` / `--deep`).

### `apps/web/app/dashboard/Shell.tsx`
Added import of `Tour` and rendered `<Tour />` as the first child of the root `.app` div. No other changes to Shell behavior.

## Verification
- `npm run typecheck -w @makoya/web` → exit 0, no errors.
- Logic trace: `visible` starts `false` → `useEffect` reads localStorage → sets `true` only if key absent → SSR renders nothing → client hydrates and shows tour if needed.
- Focus trap covers all buttons rendered per step (Skip always present, Back on steps 2-5, Next/Get-started always present) — minimum 2, maximum 3 focusable targets.
- `pointerEvents: "none"` on the centering wrapper means click-outside-card falls through to the backdrop `onClick`, giving dismiss-on-backdrop-click without the backdrop intercepting clicks on the card.
