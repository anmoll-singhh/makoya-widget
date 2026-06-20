# WS2 — Client Dashboard (Customizer-First) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use **ui-ux-pro-max + frontend-design** skills for every visual decision.

**Goal:** Replace the self-serve "add a site" client dashboard with a customizer-first experience: the client lands straight on a live widget customizer for their pre-assigned site (big real-widget preview + grouped controls with debounced autosave), plus a separate Scanner & report tab, on a shadcn-powered UI.

**Architecture:** Init shadcn/ui in `apps/web` on top of the existing Tailwind v4 + brand tokens (indigo→violet, Sora/Inter). `/dashboard` server-loads the user's sites + the active site's config and renders a client `<Customizer>` (site switcher + grouped controls + live preview). The live preview is an `<iframe>` whose `srcdoc` embeds the real `/widget/core.js` and calls `MakoyaWidget.init(config)`; it reloads (debounced) on config change and auto-opens the panel. Controls write local state (instant preview) and debounce a `PATCH /api/sites/[id]/config`. A separate `/dashboard/report` tab reuses `ScanReport`. The old `AddSiteForm` + `POST /api/sites` self-serve path is removed.

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, Tailwind CSS v4, shadcn/ui, Supabase SSR, `@makoya/shared` (vendored mirror), Vitest.

## Global Constraints

- **`@makoya/shared` is VENDORED** at `apps/web/lib/shared/index.ts` (mirror of `packages/shared/src/index.ts`). Edit BOTH if you change the shared shape. (WS2 should NOT need shared changes — config shape is already complete from Phase 0.)
- **No "WCAG/ADA/Section-508 compliant" or "guaranteed accessible" / "compliance guaranteed" claims** in any user-facing copy. Describe accessibility *preferences/tools*.
- **Service-role key never reaches the client.** Customizer persists only via the existing owner-scoped `PATCH /api/sites/[id]/config` (RLS-enforced).
- **Free-plan branding gating stays server-authoritative:** `PATCH /api/sites/[id]/config` already forces `hideBranding=false` and drops `panelTitle`/`accessibilityStatementUrl` for free plans. The UI mirrors this (disabled + upsell) but never relies on the client for enforcement.
- Keep existing brand identity: Sora display + Inter body, `brand-*` indigo→violet scale, rounded-2xl/3xl cards, `transition-base`. shadcn primitives must adopt these tokens, not introduce a second visual language.
- Local dev/build: `cd apps/web && npm run typecheck` and `npm run test` must pass before each commit. The app runs on **port 3000**.
- Deploy at end of workstream only: `cd apps/web && vercel --prod --yes --scope anmolsinghh17-9375s-projects`.
- Migration `widget_config_v3` is **applied to prod** (5 new `site_config` columns) — persistence of new fields works.

---

## File Structure

- `apps/web/components.json` — shadcn config (new).
- `apps/web/lib/utils.ts` — `cn()` helper (new; shadcn standard).
- `apps/web/components/ui/*` — shadcn primitives (button, select, switch, input, label, tabs, dialog, card, tooltip, sonner/toast as needed).
- `apps/web/app/globals.css` — add shadcn CSS variables + base layer, keep existing `@theme` brand tokens.
- `apps/web/lib/customizer/feature-meta.ts` — single source for the 15 feature keys → label/description/group (new).
- `apps/web/lib/customizer/feature-order.ts` — pure helpers to build/normalize the ordered feature list (new) + unit test.
- `apps/web/components/customizer/LivePreview.tsx` — iframe running the real widget (new).
- `apps/web/components/customizer/Customizer.tsx` — the client customizer shell: site switcher + grouped controls + autosave + preview (new).
- `apps/web/components/customizer/controls/*` — small control components (AppearanceControls, FeatureList, BehaviorControls, BrandingControls) (new).
- `apps/web/components/customizer/useAutosave.ts` — debounced PATCH hook + save status (new).
- `apps/web/app/dashboard/page.tsx` — rewritten: customizer-first landing (modify).
- `apps/web/app/dashboard/report/page.tsx` — Scanner & report tab (new).
- `apps/web/app/dashboard/DashboardTabs.tsx` — client tab nav (Customize / Report) (new).
- `apps/web/app/dashboard/layout.tsx` — add tab nav region (modify).
- `apps/web/app/dashboard/sites/[id]/page.tsx` — redirect to customizer (modify) OR delete.
- `apps/web/components/AddSiteForm.tsx` — delete.
- `apps/web/app/api/sites/route.ts` — delete the self-serve POST (or gate to admin) — remove self-serve add.
- `apps/web/components/ConfigEditor.tsx` — delete (superseded by Customizer) after migration.

---

### Task 1: Initialize shadcn/ui reconciled with existing Tailwind v4 + brand tokens

**Files:**
- Create: `apps/web/components.json`, `apps/web/lib/utils.ts`, `apps/web/components/ui/*`
- Modify: `apps/web/app/globals.css`

**Interfaces:**
- Produces: `cn(...inputs)` from `@/lib/utils`; shadcn primitives importable from `@/components/ui/*`; CSS variables (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, `--radius`, etc.) in `globals.css`.

- [ ] **Step 1: Use the `vercel:shadcn` skill** to initialize shadcn in `apps/web`. Confirm Tailwind v4 + React 19 + the `@/` alias (tsconfig `paths` already maps `@/*`). Choose the "new-york" style, base color neutral, CSS variables = yes. Do NOT let it overwrite the existing `@theme` brand block or fonts.
- [ ] **Step 2:** Reconcile `globals.css`: keep `@import "tailwindcss";`, the existing `@theme` brand tokens, `.font-display`, `.text-gradient`, `.glow-brand`, `.bg-grid`, `.transition-base`, and the reduced-motion block. Add shadcn's `:root`/`.dark` CSS variables and `@layer base` (border/ring defaults). Map shadcn `--primary` to the brand indigo (`#4f46e5`) and `--ring` to brand so primitives match the brand out of the box.
- [ ] **Step 3:** Add the primitives this workstream needs: `npx shadcn@latest add button select switch input label tabs dialog card tooltip sonner` (via the skill). Verify each file lands in `components/ui/`.
- [ ] **Step 4: Verify build is intact.** Run: `cd apps/web && npm run typecheck` → Expected: PASS (no type errors). Run: `npm run build` → Expected: succeeds; existing pages (`/`, `/login`, `/admin`) still compile.
- [ ] **Step 5: Smoke a primitive** — temporarily render a `<Button>` on `/dashboard/account` or a scratch route, run `npm run dev`, confirm it renders with brand styling, then remove the scratch usage.
- [ ] **Step 6: Commit**
```bash
git add apps/web/components.json apps/web/lib/utils.ts apps/web/components/ui apps/web/app/globals.css apps/web/package.json apps/web/package-lock.json
git commit -m "feat(web): init shadcn/ui reconciled with brand tokens + Tailwind v4"
```

---

### Task 2: Feature metadata + ordered-list helpers (pure logic, TDD)

**Files:**
- Create: `apps/web/lib/customizer/feature-meta.ts`, `apps/web/lib/customizer/feature-order.ts`
- Test: `apps/web/lib/customizer/feature-order.test.ts`

**Interfaces:**
- Produces:
  - `FEATURE_META: { key: FeatureKey; label: string; description: string; group: "content"|"color"|"navigation"|"audio" }[]` (all 15, in canonical default order matching `DEFAULT_CONFIG.featuresEnabled`).
  - `buildFeatureRows(enabled: FeatureKey[]): { key: FeatureKey; on: boolean }[]` — returns ALL 15 keys: the `enabled` ones first in their given order (filtered to valid keys, deduped), then the remaining keys in canonical order, each with `on` set correctly.
  - `rowsToEnabled(rows: { key: FeatureKey; on: boolean }[]): FeatureKey[]` — the on-rows' keys in row order.
  - `moveRow(rows, index, dir: -1|1)` — returns a new array with the row at `index` swapped with its neighbor (no-op at bounds).

- [ ] **Step 1: Write `feature-meta.ts`** with all 15 entries. Labels/descriptions (plain, user-side, no compliance claims):
  - textSize "Text size" / "Scale the page text up or down."
  - lineSpacing "Line spacing" / "Add space between lines for easier reading."
  - contrast "Contrast & dark mode" / "High-contrast and dark color modes."
  - stopMotion "Stop animations" / "Pause motion and autoplay effects."
  - readingRuler "Reading ruler" / "A guide line that follows the cursor."
  - highlightLinks "Highlight links" / "Make links stand out on the page."
  - bigCursor "Big cursor" / "A larger black or white pointer."
  - readableFont "Readable font" / "Switch to a clearer, dyslexia-friendly font."
  - hideImages "Hide images" / "Replace images to reduce distraction."
  - saturation "Saturation" / "Grayscale, low, or high color saturation."
  - readingMask "Reading mask" / "Dim the page around a focus band, or tint it."
  - highlightTitles "Highlight titles" / "Outline headings to map the page."
  - textAlign "Left-align text" / "Force text to align left."
  - muteSounds "Mute sounds" / "Silence audio and video on the page."
  - readAloud "Read aloud" / "Click text to have it read out loud."
  - Group mapping: content = textSize,lineSpacing,readableFont,hideImages,highlightLinks,highlightTitles,textAlign; color = contrast,saturation,readingMask; navigation = readingRuler,bigCursor,stopMotion; audio = muteSounds,readAloud. (Order of the array itself MUST equal `DEFAULT_CONFIG.featuresEnabled`.)
- [ ] **Step 2: Write the failing test** `feature-order.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildFeatureRows, rowsToEnabled, moveRow } from "./feature-order";
import { DEFAULT_CONFIG } from "@/lib/shared";

describe("feature-order", () => {
  it("buildFeatureRows returns all 15 keys with enabled first in order", () => {
    const rows = buildFeatureRows(["contrast", "textSize"]);
    expect(rows).toHaveLength(15);
    expect(rows.slice(0, 2).map(r => r.key)).toEqual(["contrast", "textSize"]);
    expect(rows.slice(0, 2).every(r => r.on)).toBe(true);
    expect(rows.slice(2).every(r => r.on)).toBe(false);
  });
  it("drops unknown/duplicate keys and keeps canonical fill order", () => {
    const rows = buildFeatureRows(["textSize", "textSize", "nope" as any]);
    expect(rows.filter(r => r.on).map(r => r.key)).toEqual(["textSize"]);
    expect(rows).toHaveLength(15);
  });
  it("rowsToEnabled round-trips an all-on default", () => {
    const rows = buildFeatureRows(DEFAULT_CONFIG.featuresEnabled);
    expect(rowsToEnabled(rows)).toEqual(DEFAULT_CONFIG.featuresEnabled);
  });
  it("moveRow swaps neighbors and no-ops at bounds", () => {
    const rows = buildFeatureRows(["textSize", "contrast"]);
    expect(moveRow(rows, 0, 1)[0].key).toBe("contrast");
    expect(moveRow(rows, 0, -1)[0].key).toBe("textSize");
  });
});
```
- [ ] **Step 3: Run test to verify it fails.** Run: `cd apps/web && npx vitest run lib/customizer/feature-order.test.ts` → Expected: FAIL (module not found).
- [ ] **Step 4: Implement `feature-order.ts`** using `FEATURE_META` for the canonical order; `buildFeatureRows` validates against the known key set, dedupes, fills the rest; `rowsToEnabled` filters `on`; `moveRow` does a bounded swap returning a new array.
- [ ] **Step 5: Run tests.** Run: `npx vitest run lib/customizer/feature-order.test.ts` → Expected: PASS (4 tests).
- [ ] **Step 6: Typecheck + commit**
```bash
cd apps/web && npm run typecheck
git add apps/web/lib/customizer
git commit -m "feat(web): feature metadata + ordered-list helpers for customizer"
```

---

### Task 3: Live preview (real widget in an iframe)

**Files:**
- Create: `apps/web/components/customizer/LivePreview.tsx`

**Interfaces:**
- Consumes: `SiteConfig` from `@/lib/sites-mappers`.
- Produces: `<LivePreview config={SiteConfig} />` — a browser-chrome framed iframe that renders the real widget for `config` and auto-opens the panel.

- [ ] **Step 1:** Build a client component that renders a "browser window" frame (traffic-light dots header, like `WidgetPreview`) around an `<iframe>` with `title="Widget preview"`, ~`h-[560px]`, rounded, brand-consistent. The iframe sandbox = `allow-scripts` (same-origin not needed; we inline config). Use `ui-ux-pro-max` + `frontend-design` for the framing/spacing so it reads as the page's signature element.
- [ ] **Step 2:** Compute the iframe `srcDoc` from `config` (memoized). The doc:
  - A small, realistic sample page (heading, paragraphs with a link, an image placeholder) so effects are visible.
  - `<script src="/widget/core.js" data-no-auto></script>` (the real bundle, same origin as the app — resolves against the parent origin for a `srcDoc` iframe).
  - An inline script that calls `window.MakoyaWidget.init(CONFIG)` where `CONFIG` is `JSON.stringify(config)` (include `siteId`), then after ~150ms auto-opens the panel: `document.getElementById("makoya-widget-root")?.shadowRoot?.querySelector("button[aria-expanded]")?.click();`.
  - Guard: wrap init in try/catch; if `MakoyaWidget` is missing, do nothing (preview just shows the page).
- [ ] **Step 3:** Re-render on `config` change by setting `srcDoc` (React updates it; the iframe reloads). Debouncing happens upstream in the Customizer, so LivePreview can react to every prop change directly. Add a one-line caption under the frame: "Live preview — your real widget. Click the button to explore the panel."
- [ ] **Step 4: Manual verify in dev.** Run `npm run dev`, mount `<LivePreview>` on a scratch route with a sample config; confirm the launcher shows the chosen color/icon/size/position and the panel auto-opens showing the enabled features. Remove scratch route.
- [ ] **Step 5: Typecheck + commit**
```bash
cd apps/web && npm run typecheck
git add apps/web/components/customizer/LivePreview.tsx
git commit -m "feat(web): live widget preview iframe running the real bundle"
```

---

### Task 4: Debounced autosave hook

**Files:**
- Create: `apps/web/components/customizer/useAutosave.ts`

**Interfaces:**
- Consumes: `siteId: string`, the current `SiteConfig`.
- Produces: `useAutosave(siteId, config)` → `{ status: "idle"|"saving"|"saved"|"error", saveNow(): void }`. Debounces a `PATCH /api/sites/[id]/config` (~700ms) whenever `config` changes after first mount; coalesces rapid edits; ignores the initial value so it doesn't save on load.

- [ ] **Step 1:** Implement the hook: keep a ref of the last-saved serialized config; on `config` change (skip first render), set `status="saving"`, debounce, then `fetch(PATCH, body: JSON.stringify(config))`. On `res.ok` → `status="saved"` (auto-reset to idle after ~1.5s); else `status="error"`. `saveNow()` flushes immediately. Clean up timers on unmount. Wrap fetch in try/catch (never throw).
- [ ] **Step 2: Typecheck + commit**
```bash
cd apps/web && npm run typecheck
git add apps/web/components/customizer/useAutosave.ts
git commit -m "feat(web): debounced autosave hook for customizer config"
```

---

### Task 5: Customizer controls (grouped) + Customizer shell

**Files:**
- Create: `apps/web/components/customizer/controls/AppearanceControls.tsx`, `FeatureList.tsx`, `BehaviorControls.tsx`, `BrandingControls.tsx`, `apps/web/components/customizer/Customizer.tsx`

**Interfaces:**
- Consumes: `buildFeatureRows`/`rowsToEnabled`/`moveRow`/`FEATURE_META`, `useAutosave`, `<LivePreview>`, shadcn primitives, `LAUNCHER_ICONS`, `WIDGET_PROFILE`/language constants from `@/lib/shared`.
- Produces: `<Customizer sites={Site[]} activeSiteId={string} initialConfig={SiteConfig} plan={string} />`.

- [ ] **Step 1: `AppearanceControls`** — `primaryColor` (color input + hex text), `launcherIcon` (icon button group from `LAUNCHER_ICONS`), `launcherSize` (segmented sm/md/lg using shadcn ToggleGroup or buttons), `position` (2×2 grid). Controlled via `value` + `onChange` props.
- [ ] **Step 2: `FeatureList`** — render `buildFeatureRows(config.featuresEnabled)`; each row: a shadcn `Switch` (`aria-label` = feature label), the label + description, and ↑/↓ icon buttons (disabled for off-rows or at bounds) calling `moveRow`. On any change, call `onChange(rowsToEnabled(rows))`. Group rows under the 4 group headers (content/color/navigation/audio) OR render as one ordered list with a "Drag to reorder" affordance — choose the clearer layout via the design skills; ordering must stay keyboard-accessible (↑/↓ buttons are required even if drag is added).
- [ ] **Step 3: `BehaviorControls`** — `defaultProfile` (shadcn Select: none + the 8 profiles with friendly labels: Vision impaired, Low vision, Dyslexia, ADHD / focus, Seizure safe, Senior, Cognitive, Color-blind) and `defaultLanguage` (Select: English/Español/Français/Deutsch).
- [ ] **Step 4: `BrandingControls`** — `hideBranding` (Switch), `panelTitle` (Input), `accessibilityStatementUrl` (Input, type=url). When `plan === "free"`: disable all three, show an inline upsell ("Branding controls are available on paid plans.") — copy must NOT claim compliance. These mirror the server gating.
- [ ] **Step 5: `Customizer` shell** — holds `config` state (init from `initialConfig`), a site switcher (shadcn Select over `sites`, navigates to `/dashboard?site=<id>` when changed; hidden if only one site), the four control sections in `Card`s on the left, `<LivePreview config={config}>` sticky on the right (lg), and `useAutosave(activeSiteId, config)` driving a small status line ("Saving…/Saved ✓/Couldn't save — retry"). Every control updates `config` (instant preview); autosave persists. Layout/spacing/hierarchy decided with `ui-ux-pro-max` + `frontend-design`.
- [ ] **Step 6: Typecheck + build.** Run: `cd apps/web && npm run typecheck` → PASS. `npm run build` → succeeds.
- [ ] **Step 7: Commit**
```bash
git add apps/web/components/customizer
git commit -m "feat(web): customizer controls + shell (appearance/features/behavior/branding)"
```

---

### Task 6: Customizer-first landing + report tab + remove self-serve add

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`, `apps/web/app/dashboard/layout.tsx`
- Create: `apps/web/app/dashboard/report/page.tsx`, `apps/web/app/dashboard/DashboardTabs.tsx`
- Modify/Delete: `apps/web/app/dashboard/sites/[id]/page.tsx` (redirect to `/dashboard?site=<id>`), `apps/web/components/AddSiteForm.tsx` (delete), `apps/web/components/ConfigEditor.tsx` (delete), `apps/web/app/api/sites/route.ts` (remove self-serve POST)

**Interfaces:**
- Consumes: `listSites`, `getConfig`, `getSite`, `<Customizer>`, `<ScanReport>`, `<DashboardTabs>`.

- [ ] **Step 1: Rewrite `/dashboard/page.tsx`** (RSC): get `user`; `const sites = await listSites(supabase, user.id)`. If `sites.length === 0` → render a calm empty state ("Your widget is being set up — your operator will hand over access shortly."), no add form. Else: resolve `activeSiteId` from `searchParams.site` (validate it's owned; fallback to `sites[0]`), `const config = await getConfig(supabase, activeSiteId)`; render `<Customizer sites activeSiteId initialConfig={config} plan={site.plan} />`. `searchParams` is async in Next 15 — `await props.searchParams`.
- [ ] **Step 2: `DashboardTabs.tsx`** (client) — a shadcn-styled tab nav with two links: "Customize" (`/dashboard`) and "Report" (`/dashboard/report`), preserving the `?site=` param, highlighting the active route via `usePathname`.
- [ ] **Step 3: `layout.tsx`** — render `<DashboardTabs>` under the header (keep the avatar/account + signout). Account stays reachable via the avatar link.
- [ ] **Step 4: `/dashboard/report/page.tsx`** (RSC) — same site-resolution as the landing (switcher param), render the existing `<ScanReport siteId={activeSiteId} />` inside a titled section, plus a site switcher if multiple sites. (Re-scan: `ScanReport` already POSTs `/api/scan` on mount; add a visible "Re-scan" button that re-triggers it — pass an optional `key`/refresh affordance or a thin client wrapper that remounts `ScanReport`.)
- [ ] **Step 5: Remove self-serve add** — delete `AddSiteForm.tsx`; delete the `POST` handler in `app/api/sites/route.ts` (leave the file only if other verbs exist; otherwise delete the file). Redirect `app/dashboard/sites/[id]/page.tsx` to `/dashboard?site=<id>` (so old links keep working), then delete `ConfigEditor.tsx` once nothing imports it. Grep to confirm no remaining imports: `git grep -n "AddSiteForm\|ConfigEditor"`.
- [ ] **Step 6: Typecheck + build + unit tests.** Run: `cd apps/web && npm run typecheck && npm run test && npm run build` → all PASS.
- [ ] **Step 7: Commit**
```bash
git add -A apps/web/app/dashboard apps/web/app/api/sites apps/web/components
git commit -m "feat(web): customizer-first dashboard + report tab; remove self-serve add-site"
```

---

### Task 7: Live QA on prod + deploy

**Files:** scratch `apps/web/_ws2_qa.mjs` (gitignored, deleted after).

- [ ] **Step 1: Deploy** `cd apps/web && vercel --prod --yes --scope anmolsinghh17-9375s-projects`; capture the prod URL alias `https://makoya-gamma.vercel.app`.
- [ ] **Step 2: QA script** (the established pattern): stub `globalThis.WebSocket`; via service role, ensure a throwaway client + pre-assigned site exist (or reuse `anmol.singhh17@gmail.com`); GoTrue password sign-in; mint the `@supabase/ssr` cookie; drive the LIVE app with Playwright. Assert: client lands on the customizer (NOT an add-site form); changing primaryColor/launcherSize/position updates the preview iframe; a feature toggle + reorder persists (re-fetch `/api/config/<siteId>` shows the new `features_enabled` order + new scalar fields); free-plan branding controls are disabled; Report tab renders score/issues + CTA. Screenshot desktop (1440) + mobile (390×844) into a gitignored `apps/web/.qa-shots/`.
- [ ] **Step 3:** Verify `/api/config/<siteId>` returns the new fields (`launcherSize`, `defaultProfile`, `defaultLanguage`, `panelTitle`, `accessibilityStatementUrl`) after a save — proves migration persistence end-to-end.
- [ ] **Step 4:** Clean up throwaway records via service role; delete `_ws2_qa.mjs`. Keep screenshots dir gitignored.
- [ ] **Step 5: Final whole-branch review** (requesting-code-review), fix loop, then merge `ws2-client-dashboard` → `main`, push, update `SESSION.md`.

---

## Self-Review notes
- Spec coverage: shadcn init (T1), customizer-first landing + switcher (T6), grouped controls incl. all new fields + feature order (T2/T5), live preview (T3), debounced save via existing PATCH (T4/T5), free-plan branding gating mirrored (T5) + server-authoritative (Global Constraints), separate report tab + re-scan (T6), keep account page (T6 keeps avatar link), remove self-serve add (T6). ✓
- The customizer relies on the applied migration for new-field persistence (verified in T7 step 3). ✓
- No compliance claims in any specified copy. ✓
