# Frontend Rebuild — Plan 0: Design-System Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "Redline" design-system foundation — premium tokens, fonts, the 6 signature components, and a live `/style` style-tile — that every customer-facing surface is then rebuilt on, with the founder signing off the style-tile before any surface build.

**Architecture:** Token-first. All visual decisions live as CSS variables in `globals.css` (Tailwind v4 `@theme` + `:root`/`.dark`), so re-theming the existing shadcn `components/ui/*` primitives is a token swap, not a rewrite. Pure design logic (severity/score/motion mapping) lives in small tested `lib/design/*` modules. The 6 signature components compose primitives + tokens + logic. A `/style` route renders everything for visual sign-off.

**Tech Stack:** Next.js 15 / React 19, Tailwind v4, shadcn/ui (+ Radix), `geist` fonts, Newsreader (next/font/google), Framer Motion, lucide-react, vitest.

## Global Constraints

- **Presentation only** — do NOT change backend contracts: Supabase queries/RLS, scanner API shapes, `@makoya/shared` config, licensing/token flow. NEVER hand-edit `apps/web/lib/shared` (generated mirror).
- **No compliance/guarantee claims** in any copy ("WCAG/ADA/Section-508 compliant", "guaranteed accessible"). Offer *preferences/tools* + an *honest scan* only.
- **`prefers-reduced-motion` is a hard requirement** — every animated component must render its static end-state when reduced motion is set.
- **No "measurement theater"** — no radial gauges, sweeping scan-lines, glowing blueprint grids, or count-up number animations. Stillness + the annotation-margin + one-shot "ink draws once" strokes only.
- **Exact brand tokens (verbatim):** primary Signal-600 `#3B40E0`; secondary Vellum-500 `#C8821E`; Paper `#FBFAF8`; Surface `#FFFFFF`; Border `#ECE9E3`; Ink-900 `#1A1815`, Ink-600 `#6B6760`, Ink-400 `#9A958C`. Severity: critical `#C5403B`, serious `#C8821E`, moderate `#8A7D2E`, minor `#6B6760`, passed `#3E8E6E`.
- **Fonts:** Geist Sans (UI, weight 500 emphasis / 400 body), Geist Mono (numbers, tabular), Newsreader (display, ~500).
- **Run `npm run ci` (root) before every commit that touches shared/typed code; it must stay green.** Tests use vitest in `apps/web`.
- Full design rationale: `docs/superpowers/specs/2026-06-25-frontend-rebuild-design.md`.

---

### Task 1: Dependencies + fonts

**Files:**
- Modify: `apps/web/package.json` (add `geist`, `framer-motion`)
- Modify: `apps/web/app/layout.tsx` (swap fonts)

**Interfaces:**
- Produces: CSS font variables `--font-geist-sans`, `--font-geist-mono`, `--font-newsreader` available on `<html>`.

- [ ] **Step 1: Install deps**

Run: `npm install geist framer-motion -w @makoya/web`
Expected: both added to `apps/web/package.json` dependencies.

- [ ] **Step 2: Wire fonts in `apps/web/app/layout.tsx`**

Replace the Inter/Sora imports with Geist (from the `geist` package) + Newsreader (from `next/font/google`). Keep the existing `PostHogProvider` wrapper.

```tsx
import "./globals.css";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Newsreader } from "next/font/google";
import { PostHogProvider } from "./posthog-provider";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Makoya — find what's turning visitors away, and fix it",
  description:
    "An honest accessibility scan: a real 0–100 score and the exact issues on your site, in plain English. No 'instant compliance' lies.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${newsreader.variable}`}
    >
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify typecheck + build resolve fonts**

Run: `npm run typecheck -w @makoya/web`
Expected: exit 0 (no missing-module errors for `geist`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json package-lock.json apps/web/app/layout.tsx
git commit -m "feat(design): install geist + framer-motion, wire Geist + Newsreader fonts"
```

---

### Task 2: The "Redline" token system

**Files:**
- Modify: `apps/web/app/globals.css` (replace the `@theme` brand block + `:root`/`.dark` token values; add paper-grain + margin utilities)

**Interfaces:**
- Produces: Tailwind utilities + CSS vars consumed by every later task: `--color-signal-{50..900}`, `--color-vellum-500`, `--paper`, `--surface`, `--surface-2`, `--border`, `--border-strong`, `--ink-900/600/400`, `--sev-{critical,serious,moderate,minor,passed}` (+ `-bg`), and remapped shadcn vars (`--primary` → Signal-600, `--destructive` → critical, `--border`, `--ring` → Signal-500). A `.paper-grain` utility and `--ease-ink` (`cubic-bezier(0.22,1,0.36,1)`).

- [ ] **Step 1: Replace the brand `@theme` block + token roots**

In `apps/web/app/globals.css`, replace the indigo `--color-brand-*` block and the `:root` color values with the Redline tokens. Map the Geist/Newsreader font vars. Set `--primary`, `--ring`, `--destructive`, `--border`, `--input` to the new tokens so existing `components/ui/*` adopt the look automatically. Add a `.dark` block with the warm-charcoal values from the spec §3.2. Define `--ease-ink: cubic-bezier(0.22, 1, 0.36, 1)`.

Use the exact hex values from Global Constraints. Severity tints: `--sev-critical-bg #FBEFEE`, `--sev-serious-bg #FBF1E2`, `--sev-moderate-bg #F4F1E2`, `--sev-minor-bg #F2F1EE`, `--sev-passed-bg #E9F4EF`.

- [ ] **Step 2: Add the paper-grain + annotation-margin utilities**

Append to `globals.css`. The grain is a fixed, ~1.5% opacity SVG-noise overlay applied to the body; the margin rule is a reusable hairline.

```css
body {
  background: var(--paper);
  color: var(--ink-900);
  font-feature-settings: "tnum" 0;
}
/* 1–2% tactile grain so Paper reads as document stock, not flat CSS. */
.paper-grain::before {
  content: "";
  position: fixed; inset: 0; pointer-events: none; z-index: 1;
  opacity: 0.015;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.tnums { font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
}
```

- [ ] **Step 3: Verify the app still builds + renders with new tokens**

Run: `npm run typecheck -w @makoya/web` → exit 0.
Run (manual smoke): `npm run dev -w @makoya/web`, open `/` — page renders on warm Paper, no console errors, existing shadcn buttons now show Signal cobalt. (Surfaces look unstyled-for-Redline still; that's expected — this task only swaps tokens.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat(design): Redline token system (Signal/Vellum/warm neutrals/earth severity + grain)"
```

---

### Task 3: Severity + score logic module

**Files:**
- Create: `apps/web/lib/design/severity.ts`
- Test: `apps/web/lib/design/severity.test.ts`

**Interfaces:**
- Produces:
  - `type Severity = "critical" | "serious" | "moderate" | "minor"`
  - `SEVERITY_META: Record<Severity, { label: string; token: string; bgToken: string; rank: number }>` (token = CSS var name string, e.g. `"--sev-critical"`).
  - `scoreBand(score: number): { token: string; label: string }` — maps 0–100 to passed/critical bands for `<ScoreMark>` color (≥90 passed, 75–89 serious, 50–74 moderate, <50 critical).
  - `sortBySeverity<T extends { impact: Severity | null }>(items: T[]): T[]` — worst-first, stable.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { SEVERITY_META, scoreBand, sortBySeverity } from "./severity";

describe("severity", () => {
  it("ranks worst-first", () => {
    expect(SEVERITY_META.critical.rank).toBeLessThan(SEVERITY_META.minor.rank);
  });
  it("maps each severity to its CSS token", () => {
    expect(SEVERITY_META.serious.token).toBe("--sev-serious");
    expect(SEVERITY_META.minor.bgToken).toBe("--sev-minor-bg");
  });
  it("bands the score (passed/critical edges)", () => {
    expect(scoreBand(95).token).toBe("--sev-passed");
    expect(scoreBand(80).token).toBe("--sev-serious");
    expect(scoreBand(60).token).toBe("--sev-moderate");
    expect(scoreBand(20).token).toBe("--sev-critical");
  });
  it("sorts items worst-first, nulls last, stably", () => {
    const out = sortBySeverity([
      { id: "a", impact: "minor" }, { id: "b", impact: "critical" },
      { id: "c", impact: null }, { id: "d", impact: "minor" },
    ]);
    expect(out.map((x) => x.id)).toEqual(["b", "a", "d", "c"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/design/severity.test.ts` (from `apps/web`)
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `severity.ts`**

Implement the types + `SEVERITY_META` (ranks critical=0, serious=1, moderate=2, minor=3; labels "Critical"/"Serious"/"Moderate"/"Minor"; tokens `--sev-*` + `-bg`), `scoreBand` per the thresholds above, and a stable `sortBySeverity` (sort by rank; `null` impact → rank 99; preserve input order on ties).

- [ ] **Step 4: Run tests → PASS**

Run: `npx vitest run lib/design/severity.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/design/severity.ts apps/web/lib/design/severity.test.ts
git commit -m "feat(design): severity + score-band logic with tests"
```

---

### Task 4: Motion module

**Files:**
- Create: `apps/web/lib/design/motion.ts`
- Test: `apps/web/lib/design/motion.test.ts`

**Interfaces:**
- Produces:
  - `EASE_INK = [0.22, 1, 0.36, 1] as const`
  - `DUR = { app: 0.18, mark: 0.32, section: 0.6 } as const`
  - `revealVariant` (Framer Motion variants: hidden `{opacity:0,y:8}` → visible `{opacity:1,y:0}` with `EASE_INK`, `DUR.section`) — for marketing `whileInView`.
  - `staggerParent(stagger = 0.04)` — returns variants with `staggerChildren`.
  - `inkStroke` — variants for the "draws once" annotation mark (pathLength 0→1, opacity 0→1, `DUR.mark`, no repeat).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { EASE_INK, DUR, revealVariant, staggerParent, inkStroke } from "./motion";

describe("motion tokens", () => {
  it("exposes the ink ease + durations", () => {
    expect(EASE_INK).toEqual([0.22, 1, 0.36, 1]);
    expect(DUR.app).toBeLessThan(DUR.section);
  });
  it("reveal goes from hidden offset to resting", () => {
    expect(revealVariant.hidden).toMatchObject({ opacity: 0 });
    expect(revealVariant.visible.opacity).toBe(1);
  });
  it("stagger parent carries staggerChildren", () => {
    expect(staggerParent(0.05).visible.transition.staggerChildren).toBe(0.05);
  });
  it("ink stroke never loops", () => {
    expect(inkStroke.visible.transition.repeat ?? 0).toBe(0);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run lib/design/motion.test.ts`).
- [ ] **Step 3: Implement `motion.ts`** with the exact shapes above (plain objects typed loosely as `Variants` from `framer-motion`).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/design/motion.ts apps/web/lib/design/motion.test.ts
git commit -m "feat(design): shared motion tokens (ink ease, reveal/stagger/stroke) with tests"
```

---

### Task 5: Ensure + re-theme shadcn primitives

**Files:**
- Modify (verify themed): `apps/web/components/ui/{button,badge,card,input,select,switch,tabs,tooltip,dialog,label,table}.tsx`
- Create (missing, via shadcn CLI): `apps/web/components/ui/{progress,separator,skeleton,accordion,sheet,sonner,dropdown-menu,command}.tsx`

**Interfaces:**
- Produces: a complete themed primitive set the signature components + surfaces import from `@/components/ui/*`.

- [ ] **Step 1: Add the missing primitives**

Run (from `apps/web`): `npx shadcn@latest add progress separator skeleton accordion sheet sonner dropdown-menu command`
Expected: files created under `components/ui/`. They inherit the new tokens automatically (they read `--primary`, `--border`, etc.).

- [ ] **Step 2: Spot-check Button uses the token primary**

Confirm `button.tsx` default variant maps to `bg-primary text-primary-foreground` (Signal cobalt now). No code change if already token-based; otherwise align to tokens.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck -w @makoya/web` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ui
git commit -m "feat(design): add missing shadcn primitives (progress/sheet/sonner/command/etc.)"
```

---

### Task 6: `<SeverityChip>` + `<SeverityBar>`

**Files:**
- Create: `apps/web/components/makoya/SeverityChip.tsx`
- Create: `apps/web/components/makoya/SeverityBar.tsx`
- Test: `apps/web/components/makoya/severity-components.test.tsx`

**Interfaces:**
- Consumes: `SEVERITY_META`, `Severity` (Task 3); `cn` (`@/lib/utils`).
- Produces:
  - `<SeverityChip severity={Severity} count?={number} />` — a pill: earth-tone token color + `-bg` tint, label from `SEVERITY_META`, optional count (tabular). Severity carried by ink-weight: critical/serious filled tick, minor hollow/grayscale.
  - `<SeverityBar totals={{critical:number;serious:number;moderate:number;minor:number}} />` — a single stacked horizontal bar, segments proportional, worst-first, each segment its severity token color; accessible `aria-label` summarizing counts.

- [ ] **Step 1: Write the failing test (render + a11y label)**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityChip } from "./SeverityChip";
import { SeverityBar } from "./SeverityBar";

describe("severity components", () => {
  it("chip shows label + count", () => {
    render(<SeverityChip severity="critical" count={3} />);
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
  it("bar summarizes counts in an accessible label", () => {
    render(<SeverityBar totals={{ critical: 1, serious: 2, moderate: 0, minor: 4 }} />);
    expect(screen.getByLabelText(/1 critical/i)).toBeInTheDocument();
  });
});
```

*(Note: this is the first React render test — install dev deps `@testing-library/react @testing-library/jest-dom jsdom` and add a `vitest` jsdom environment + setup if not already present; fold that setup into this task's Step 2.)*

- [ ] **Step 2: Ensure the test environment**

If `apps/web/vitest.config.ts` lacks `environment: "jsdom"`, add it (or a `// @vitest-environment jsdom` docblock atop the test). Install: `npm install -D @testing-library/react @testing-library/jest-dom jsdom -w @makoya/web`. Add `apps/web/vitest.setup.ts` importing `@testing-library/jest-dom` if not present, referenced from the vitest config `setupFiles`.

- [ ] **Step 3: Run → FAIL** (`npx vitest run components/makoya/severity-components.test.tsx`).
- [ ] **Step 4: Implement both components** per the interface. Colors via inline `style={{ color: \`var(${meta.token})\`, background: \`var(${meta.bgToken})\` }}`. Bar segments use `flex` with `flex-grow` proportional to counts; zero-count severities omitted. Provide the `aria-label` "N critical, N serious, …".
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Commit**

```bash
git add apps/web/components/makoya apps/web/vitest.* apps/web/package.json package-lock.json
git commit -m "feat(design): SeverityChip + SeverityBar (earth-tone, ink-weight hierarchy)"
```

---

### Task 7: `<ScoreMark>`

**Files:**
- Create: `apps/web/components/makoya/ScoreMark.tsx`
- Test: `apps/web/components/makoya/ScoreMark.test.tsx`

**Interfaces:**
- Consumes: `scoreBand` (Task 3), `inkStroke`/`DUR` (Task 4), Framer Motion.
- Produces: `<ScoreMark score={number} verdict?={string} size?={"hero"|"app"} />` — the **still**, huge Geist-Mono tabular score, banded color from `scoreBand`, one Vellum amber tick beside it, a one-line verdict. A single ring that **draws once** (`pathLength` 0→1 via `inkStroke`) then holds — gated by `prefers-reduced-motion` (renders complete ring statically). NO count-up.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreMark } from "./ScoreMark";

describe("ScoreMark", () => {
  it("renders the exact score (no count-up placeholder) + verdict", () => {
    render(<ScoreMark score={87} verdict="Good — a few real issues to fix" />);
    expect(screen.getByText("87")).toBeInTheDocument();
    expect(screen.getByText(/few real issues/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — score in `font-mono tnums`, color `var(scoreBand(score).token)`, ring via an SVG `<motion.circle>` with `inkStroke` variants (initial hidden → animate visible once; `useReducedMotion()` → render at `pathLength: 1`). Vellum tick = a small amber mark element. `size` controls the type scale (hero `mono-score` 96 / app ~48).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(design): ScoreMark (still mono score, draws-once ring, reduced-motion safe)`.

---

### Task 8: `<AnnotationMargin>`

**Files:**
- Create: `apps/web/components/makoya/AnnotationMargin.tsx`
- Test: `apps/web/components/makoya/AnnotationMargin.test.tsx`

**Interfaces:**
- Produces: `<AnnotationMargin lineCount?={number} marks?={{at:number;severity?:Severity}[]} children />` — a layout primitive rendering a thin left gutter (hairline `--border` rule, optional line-ticks/line-numbers) with `children` in the main column; `marks` place severity-colored ticks at given line indices. This is the structural fingerprint reused by hero/report/app.

- [ ] **Step 1: Failing test** — renders children + a gutter element with `role="presentation"`, and one tick per `marks` entry (assert tick count).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — CSS grid `[margin] [content]`; gutter is `--border` hairline; ticks absolutely positioned by line index; numbers optional. Decorative parts `aria-hidden`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(design): AnnotationMargin gutter primitive`.

---

### Task 9: `<AnnotatedPreview>`

**Files:**
- Create: `apps/web/components/makoya/AnnotatedPreview.tsx`
- Test: `apps/web/components/makoya/AnnotatedPreview.test.tsx`

**Interfaces:**
- Consumes: `inkStroke`/`DUR` (Task 4), `Severity`.
- Produces: `<AnnotatedPreview src?={ReactNode|imageUrl} annotations={{x:number;y:number;w:number;h:number;severity:Severity;label:string}[]} mode?={"reveal"|"static"} />` — a framed mock-browser (chrome bar + viewport) showing a page, with Vellum-amber annotation strokes (underline/bracket) that **draw on once** next to each annotation. Optional `beforeAfter` split-handle prop reserved for the customizer (declare it; full drag impl deferred to the dashboard surface plan).

- [ ] **Step 1: Failing test** — renders the frame + one annotation marker per `annotations` entry with its `label` as accessible text.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — absolute-positioned annotation overlays over the framed content; each stroke an SVG `<motion.path>` with `inkStroke` (once; reduced-motion → final state). Frame uses `--surface`, `--border`, `--shadow-sm`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(design): AnnotatedPreview (mock-browser + draws-once amber marks)`.

---

### Task 10: `<IssueCard>`

**Files:**
- Create: `apps/web/components/makoya/IssueCard.tsx`
- Test: `apps/web/components/makoya/IssueCard.test.tsx`

**Interfaces:**
- Consumes: `SeverityChip` (Task 6), shadcn `Accordion` (Task 5).
- Produces: `<IssueCard issue={{ id:string; impact:Severity|null; help:string; whatItMeans:string; whoItAffects:string; howToFix?:string; wcag?:string; element?:string }} />` — an expandable finding: collapsed shows severity chip + `help` + WCAG ref; expanded reveals what/why/who/how-to-fix + the offending `element` in a mono code block. Matches the shape returned by `topPlainIssues` / `/api/public-scan` `topIssues`.

- [ ] **Step 1: Failing test** — collapsed shows `help` + chip; expanding (fireEvent click) reveals `whatItMeans` + `howToFix`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** on shadcn Accordion; element shown in `<pre class="font-mono">`; severity via `SeverityChip`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(design): IssueCard (plain-English expandable finding)`.

---

### Task 11: `<ScanLoading>`

**Files:**
- Create: `apps/web/components/makoya/ScanLoading.tsx`
- Test: `apps/web/components/makoya/ScanLoading.test.tsx`

**Interfaces:**
- Consumes: `AnnotationMargin` (Task 8), motion (Task 4).
- Produces: `<ScanLoading label?={string} progress?={number} />` — the margin-filling line-tick loader (methodical checklist, top-to-bottom), NOT a sweep. `progress` (0–1) optionally drives how many ticks are filled; otherwise an indeterminate one-shot-per-tick stagger that does not loop visually beyond a calm idle. Reduced-motion → static partially-filled state + the label.

- [ ] **Step 1: Failing test** — renders `label` text and a list of tick elements (assert ≥ some count); `role="status"` + `aria-live="polite"`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — vertical hairline ticks filling with the stagger; `role="status"`. Keep motion calm and non-anxious.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(design): ScanLoading (margin-fill line-tick loader)`.

---

### Task 12: `/style` style-tile page (founder checkpoint)

**Files:**
- Create: `apps/web/app/style/page.tsx`

**Interfaces:**
- Consumes: all tokens + all 6 signature components + key shadcn primitives.

- [ ] **Step 1: Build the style-tile**

A single page (gated to non-prod or admin to keep it internal) that renders, in labeled sections on `.paper-grain` Paper: the full color palette (Signal scale, Vellum, neutrals, severity swatches with hex), the type scale (Newsreader display + Geist UI + Geist Mono samples), buttons/inputs/switch/tabs/cards (themed primitives), and a live gallery of every signature component with realistic props — `<ScoreMark score={87}>`, `<SeverityBar>`, `<SeverityChip>` set, `<IssueCard>` (real plain-English sample), `<AnnotatedPreview>` with 2–3 amber marks, `<ScanLoading>`, and an `<AnnotationMargin>` demo. Include a light/dark toggle.

- [ ] **Step 2: Verify it renders end-to-end**

Run `npm run dev -w @makoya/web`, open `/style`. Confirm: warm Paper + grain, Newsreader serif headlines, Signal cobalt primary, Vellum amber marks, earth-tone severity (no traffic-light), score is still (no count-up), and the reduced-motion OS setting flattens all motion. No console errors.

- [ ] **Step 3: Full-page screenshots (light + dark) for founder sign-off**

Use the project browser tooling (gstack/Playwright) to capture full-page PNGs of `/style` in light and dark at 1440px. Save under `docs/superpowers/specs/assets/`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/style docs/superpowers/specs/assets
git commit -m "feat(design): /style style-tile (founder visual checkpoint) + screenshots"
```

- [ ] **Step 5: FOUNDER CHECKPOINT** — present the screenshots; get explicit sign-off (or token tweaks) before any surface build begins. Tweaks are token-only edits in `globals.css` (cheap).

---

### Task 13: Foundation QA gate

**Files:** none (verification only).

- [ ] **Step 1: Full CI green**

Run (root): `npm run ci`
Expected: exit 0; new severity/motion/component tests included; typecheck 0; shared-sync clean. (Re-run once if the known Windows vitest worker-flake hits.)

- [ ] **Step 2: Our own scanner + Lighthouse on `/style`** (sanity that the system itself is accessible)

Confirm `/style` has no critical axe violations (it's a component gallery, must be clean) and `prefers-reduced-motion` is honored.

- [ ] **Step 3: Commit any fixes; update `docs/STATUS.md` + `docs/SESSION.md`** with the foundation-complete entry and the next step (surface plans).

---

## Self-Review

**Spec coverage:** tokens (T2) ✓, fonts/type (T1) ✓, severity system (T3,T6) ✓, motion + reduced-motion (T4, throughout) ✓, all 6 signature components (T6–T11) ✓, style-tile checkpoint (T12) ✓, no-measurement-theater constraint enforced in ScoreMark/ScanLoading ✓, QA/our-scanner gate (T13) ✓. Surfaces (marketing/scanner/auth/dashboard/admin) are intentionally OUT of this plan — each gets its own plan after the style-tile is approved (noted in spec §5).

**Placeholder scan:** none — each task has concrete files, interfaces, and test code; visual JSX is specified by contract + token usage + verification (the build agent writes the markup against the locked tokens and the style-tile, which is the correct altitude for a visual system).

**Type consistency:** `Severity`, `SEVERITY_META`, `scoreBand`, `sortBySeverity`, `EASE_INK`/`DUR`/`inkStroke`/`revealVariant`/`staggerParent` names are used consistently across Tasks 3,4,6,7,8,9,11.

---

## Execution Handoff

Foundation tasks 1–5 are sequential (tokens/fonts/logic gate everything). Tasks 6–11 (the 6 components) are largely independent and parallelizable. Task 12 assembles them; Task 13 + the founder checkpoint gate the surface work. After sign-off, each **surface gets its own plan** and the surfaces build in parallel file-disjoint lanes with the adversarial competitor-review agent per surface (per spec §6).
