# Makoya — Strategic Frontend Rebuild · Design Spec

**Date:** 2026-06-25 · **Status:** Approved direction (brainstorming) → next: implementation plan
**Owner:** Claude · **Founder approvals captured:** scope, brand feel, theme, motion, identity, "Redline" direction, color.

---

## 1. Purpose & strategy

Rebuild every customer-facing surface of Makoya into one cohesive, premium, **converting** SaaS frontend that is demonstrably better than the incumbents — while keeping everything wired to the real backend (Supabase auth/RLS, the scanner engine, the licensing/config endpoints, Resend, PostHog, Sentry, Upstash). Nothing is a mockup.

**Positioning wedge (from competitor research).** Every overlay vendor (accessiBe, AudioEye, UserWay) runs the same funnel: **legal-fear → vague/binary verdict → email/demo wall**. accessiBe was FTC-fined $1M for false "compliant in 48 hours" claims. Deque/axe are credible but enterprise-only and give an SMB owner nothing to *do*. Makoya wins by being the **honest, instant, scored, plain-English opposite**:

- Hero CTA is an **action** ("Scan my site free"), never "Book a demo".
- The scan **runs live in the browser** and shows a real **0–100 score + plain-English issues + the offending element** *before* any email wall. Email is captured only to **save/share/track** the report.
- **Honesty is the headline:** "A scan doesn't make you compliant — and no widget does. Here's what's actually wrong, and how to fix it." The FTC-sanctioned incumbents cannot say this.
- **Transparent methodology** ("Built on axe-core + real WCAG 2.2 checks via Playwright") turns the category's credibility scandal into our moat.
- **Free re-scan to prove progress** — a return-visit hook none of the overlay funnels offer.

**Compliance guardrail (non-negotiable, from CLAUDE.md):** never use "WCAG/ADA/Section-508 compliant" or "guaranteed accessible" claims in user-facing copy. We offer accessibility *preferences/tools* and an honest scan — never a compliance guarantee. A copy guardrail unit test enforces this (extend the existing `landing-copy.test.ts` pattern).

---

## 2. The signature concept — "The Redline"

Makoya looks like a **meticulous human editor red-lining your real page in the margin** — not a laser scanning it. **Editorial and forensic, never sci-fi-scanner.** The visual language is proofreading marks, architectural redlines, and the annotated margin. We dramatize the *honest finding and the fix*, not the machine.

This deliberately **rejects "measurement theater"** (radial gauges, sweeping scan-lines, glowing blueprint grids, count-up animations) — that is the exact fake-magic aesthetic the overlay scammers use, and for a truth-positioned brand, looking like them is the one unforgivable failure.

**How it manifests across the product:**
- **The Margin** — a persistent thin left annotation gutter (manuscript / code-review feel) where findings, ticks, and line-numbers live. The structural fingerprint.
- **The Mark** — each finding is revealed by a **Vellum-amber annotation stroke** (underline / circle / bracket) that **draws on exactly once** (~200ms, ease-out) next to the offending element. A red pen, never a looping laser. One mark per finding.
- **The Score, still** — huge, mono, **no count-up**. It cuts in sharp at full size with a single amber tick and a one-line plain-English verdict. Optional single beat: the ring *draws once* like an ink stroke completing, then holds. Never loops.
- **Loading** — a margin **filling top-to-bottom with hairline line-ticks** (a checklist being worked through), not a sweep. Methodical, not magic.
- **Empty states** — honesty baked in: *"Nothing flagged here — and we'd tell you if there were."*
- **Focus rings / dividers** — Signal cobalt 2px ink rule; warm hairline borders, occasionally with a margin-tick.

**The one-line identity:** *warm document paper, near-black ink, cobalt-instrument primary, one amber annotation-mark per honest finding — editorial and forensic, never sci-fi-scanner.*

---

## 3. Design tokens

All tokens live as CSS variables (Tailwind v4 `@theme`) so both themes and all surfaces share one source of truth. Light is primary; dark is a polished option.

### 3.1 Color — light (primary)

**Primary — "Signal" (cobalt-indigo ink):**
| Step | Hex | Use |
|---|---|---|
| 50 | `#F0F1FE` | tints, selected rows |
| 100 | `#E0E2FD` | hover wash |
| 300 | `#A9ACF5` | active borders, disabled-primary |
| 500 | `#4A4FE8` | secondary actions, links |
| **600** | **`#3B40E0`** | **primary brand / buttons** (~6.3:1 on Paper) |
| 700 | `#2E32B8` | pressed |
| 900 | `#1A1C66` | text on tint |

**Secondary — "Vellum" (annotation amber):** `#C8821E` (500). Used sparingly: the active/marked finding, a key data highlight, the annotation stroke. **Never a primary button.**

**Warm neutrals (document-grade):**
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FBFAF8` | page background (warm off-white, never pure white) |
| `--surface` | `#FFFFFF` | cards/panels (lift off Paper by being *purer*, not by shadow) |
| `--surface-2` | `#F4F2EE` | inset/muted blocks |
| `--border` | `#ECE9E3` | hairline borders (carry structure) |
| `--border-strong` | `#DCD8D0` | emphasized dividers |
| `--ink-900` | `#1A1815` | headings / primary text (warm near-black) |
| `--ink-600` | `#6B6760` | secondary text |
| `--ink-400` | `#9A958C` | muted text |

**Severity — premium earth/clay, NOT traffic-light** (bound 1:1 to scanner severities):
| Tier | Hex | Note |
|---|---|---|
| critical | `#C5403B` | deep clay-red (not `#EF4444`) |
| serious | `#C8821E` | the Vellum amber (shared = cohesion) |
| moderate | `#8A7D2E` | muted olive-gold (not yellow) |
| minor | `#6B6760` | grayscale (ink-600) — radical restraint |
| passed | `#3E8E6E` | muted green appears **only** here — earned, never the brand |

Each severity gets a faint `-bg` tint for chip/row backgrounds (e.g. `--sev-critical-bg #FBEFEE`).

### 3.2 Color — dark (polished option)

Warm ink-charcoal (same brand at night, not a different app):
`--paper #16140F` · `--surface #201D17` · `--surface-2 #262219` · `--border #322E26` · `--ink-900 #EDEAE3` · `--ink-600 #A8A399`. Signal lifts to `#7A7EF0`; Vellum to `#D99A3C`; severity reds/oranges lighten so they don't vibrate on black.

### 3.3 Typography

- **UI + body: Geist Sans** (`next/font`, free). Workhorse emphasis weight **500** (Linear's crispness), body **400**.
- **Display (marketing + report headlines): Newsreader** (Google, variable, optical sizing) — an editorial serif for "investigative-journalism / printed-report" authority that separates Makoya from every tech-bro sans. Weight ~500, tracking ~-0.005em, large optical size.
- **Numbers / score / counts: Geist Mono**, `font-variant-numeric: tabular-nums` everywhere a number can change.

**Type scale:**
| Token | Size/Line | Face / Weight | Tracking |
|---|---|---|---|
| display-xl (hero) | 76/80 | Newsreader 500 | -0.005em |
| display-l | 52/56 | Newsreader 500 | -0.005em |
| h1 | 32/38 | Geist 600 | -0.015em |
| h2 | 24/30 | Geist 600 | -0.01em |
| h3 | 19/26 | Geist 600 | -0.01em |
| body-l | 18/28 | Geist 400 | 0 |
| body | 15/24 | Geist 400 | 0 |
| mono-score | 96/96 | Geist Mono 500, tabular | -0.02em |
| label | 12/16 | Geist 500, UPPERCASE | +0.08em |
| caption | 13/18 | Geist 400 | 0 |

**Expensive headline treatment:** Newsreader serif, warm near-black ink, set tight + large with a generous left margin and a single Vellum-amber underline-tick on one key word. Editorial, not "centered hero with gradient." No gradient text.

### 3.4 Spacing / radius / elevation

- **Spacing (4px base):** 2,4,6,8,12,16,20,24,32,40,48,64,80,96,128. App ≤24 between elements (Linear density); marketing 64–128 section rhythm.
- **Radius:** sm 6 (chips/inputs) · md 10 (buttons/cards default) · lg 14 (panels/modals) · xl 20 (marketing feature cards) · full 999 (pills).
- **Elevation — "expensive = barely-there":** resting card = `1px --border + shadow-xs`. Shadows only float interactive layers (dropdowns/modals) and appear on hover/open.
  - `--shadow-xs 0 1px 2px rgba(26,24,21,.04)`
  - `--shadow-sm 0 1px 3px rgba(26,24,21,.06), 0 1px 2px rgba(26,24,21,.04)`
  - `--shadow-md 0 4px 12px rgba(26,24,21,.08), 0 2px 4px rgba(26,24,21,.04)`
  - `--shadow-lg 0 12px 32px rgba(26,24,21,.10), 0 4px 8px rgba(26,24,21,.05)`

### 3.5 Motion

**Principle:** *marketing performs; the app respects your time; nothing loops.*
- **Marketing:** scroll-driven reveals + parallax via **Framer Motion** (`useScroll`/`useTransform`, `whileInView`, staggered children). 280–360ms strokes, generous ease-out.
- **App:** 150–220ms micro-interactions.
- **Signature easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (confident decelerate). Reveal strokes ("the Mark", the score ring) play **exactly once** — nothing pulses or loops (looping = anxiety/theater; one-and-done = authority).
- **`prefers-reduced-motion`: hard requirement** — all motion gated; reduced-motion users get the static, fully-legible end state. This is both correct and a credibility flex for an a11y brand.

### 3.6 Premium details (top-1% separators)
1. **Paper grain** — 1–2% opacity tactile noise (SVG feTurbulence, fixed) on `--paper` so it reads as document stock, not a flat white div.
2. **Optical alignment** — hang serif punctuation + the mono score's first glyph into the margin (negative indent ~0.05em) so type aligns to the rule, not metrically.
3. **Severity as ink-weight, not just color** — critical = heavier 1.5px hairline + filled margin-tick; minor = grayscale + hollow tick. The report stays legible in grayscale (an a11y flex we make loudly).
4. **Surveyor cursor** — over annotated elements in the report/preview, the cursor becomes a thin caret/crosshair (instrument signal).
5. **Tabular numerals everywhere** — counts never shift width.

---

## 4. Signature components

Built on shadcn/ui primitives (re-themed to tokens): Button, Input, Select, Switch, Tabs, Dialog, Popover, Tooltip, Dropdown-menu, Accordion, Badge, Card, Table, Sheet, Toast (Sonner), Progress, Separator, Skeleton, Command (⌘K). Radix = accessible primitives for free (fitting).

**Custom signature components (the distinctive layer):**
1. **`<AnnotationMargin>`** — the persistent left gutter primitive (line-ticks, finding markers, line numbers). The structural fingerprint reused across hero, report, app.
2. **`<ScoreMark>`** — the still, huge mono 0–100 score with one amber tick + one-line verdict; optional single ring-draw (no count-up, no loop). Color-banded by severity.
3. **`<AnnotatedPreview>`** — a framed mock-browser showing a real-ish page with Vellum-amber annotation strokes drawing on (once) next to flagged elements; the hero demo *and* the in-app scan-result/preview view. Includes a before/after split-handle for the widget customizer.
4. **`<SeverityChip>` / `<SeverityBar>`** — the critical/serious/moderate/minor system (chips with count+label; a single stacked bar summarizing distribution), severity carried by ink-weight + earth tones.
5. **`<IssueCard>`** — expandable plain-English finding: severity chip + WCAG ref + what/why/who-it-affects/how-to-fix, with the offending element shown. The honest-product differentiator.
6. **`<ScanLoading>`** — the margin-filling line-tick loading state (methodical checklist), reused by hero + in-app scanning.

---

## 5. Surfaces — scope, sequence & per-surface intent

**Sequence (founder choice: customer-facing first):**

0. **Design-system foundation** — tokens (Tailwind v4 `@theme`), fonts, dark theme, paper grain, the 6 signature components, plus a **live `/style` style-tile page the founder approves before any surface build proceeds** (the first visual checkpoint).
1. **Marketing landing (`/`)** — expressive motion. The Redline hero (annotated real page + serif headline in the margin + "Scan my site free" action), honest-differentiator section, live-scan teaser, how-it-works (axe-core transparency), the three surfaces (scan/widget/monitor), transparency/methodology block, final CTA. Scores 100/100 on our own scanner. Copy guardrail test.
2. **Scanner (`/scan`)** — the live funnel: URL input → live `<ScanLoading>` → `<ScoreMark>` + `<SeverityBar>` + `<IssueCard>` list (plain-English, worst-first) → email gate to save/share/track + PDF → re-scan. All real (`/api/public-scan`, `/api/scan-ingest`, `/api/report-pdf`). Value before the email wall.
3. **Auth (`/login`, `/auth/*`)** — calm, premium, on-brand; real Supabase Auth flows unchanged underneath.
4. **Client dashboard + customizer (`/dashboard`, report tab)** — calm/fast app feel. Customizer-first model **kept** (proven IA) but elevated: `<AnnotatedPreview>` live widget preview with before/after, severity-aware report tab, install surface (token-minted snippet) re-skinned. Real config autosave + `@makoya/shared` flow unchanged.
5. **Admin CRM (`/admin/*`)** — re-skinned with the same system, **last** (internal/founder-only).

**Hard rule:** the redesign is **presentation only** — it must not change the backend contracts (Supabase queries, RLS, scanner API shapes, `@makoya/shared` config, licensing/token flow, the generated mirror). Never hand-edit `apps/web/lib/shared`. Keep the widget itself (packages/widget) untouched unless a surface explicitly needs its embed.

---

## 6. Build method

- **Multi-agent, file-disjoint lanes in parallel**, one per surface, each on its own branch/worktree, after the shared design-system foundation is merged first (so no lane collides on tokens/components/`package.json`). Mirrors the proven block-9/13 pattern (pre-provision shared deps + tokens on the base, then parallel lanes).
- **Adversarial "go-against-the-competitors" agent** reviews each completed surface against accessiBe/AudioEye + Stripe/Linear-grade bars and the "Redline" identity, returning concrete improvements **before merge** (the founder's requested challenge loop).
- **QA gate around every merge** (standing rule): `npm run ci` green on base + branch (QA-before), merge, `npm run ci` + live smoke (QA-after). Our own scanner must score the marketing + scan pages ≥ near-100. Lighthouse a11y stays 1.0 (existing CI gate).
- **Visual verification** via the browser/gstack tooling + full-page screenshots per surface; founder sign-off at the style-tile and again per surface.
- **Analytics + observability stay wired** — instrument funnel events through the existing `track()` seam as surfaces are built.

---

## 7. Success criteria
- Every customer-facing surface visibly premium + cohesive under "The Redline" identity; passes the adversarial competitor bar.
- The funnel demonstrably beats the incumbents (instant live scan, real score, plain-English issues, value-before-email, honest framing).
- Everything connected + working against the real backend; `npm run ci` green; our scanner scores marketing + `/scan` ≥ near-100; Lighthouse a11y = 1.0; `prefers-reduced-motion` fully honored.
- Zero compliance/guarantee claims (guardrail test passes). No backend/contract regressions. No hand-edited shared mirror.

## 8. Non-goals / out of scope
- No backend/data-model/scanner-engine changes (presentation only).
- Admin CRM polish is last and may trail the public surfaces.
- Widget internals (packages/widget) unchanged.
- Stripe/billing UI is its own later phase (Phase 2), not this rebuild.
- No "measurement theater" visuals (gauges, scan-lines, glowing grids, count-ups) — explicitly rejected.

## 9. Open decisions to confirm at the style-tile
- Exact final Signal/Vellum shades (founder eyeballs them live).
- Serif final pick (Newsreader vs Source Serif 4) once seen at hero scale.
- Dark mode: ship with surfaces or fast-follow.
