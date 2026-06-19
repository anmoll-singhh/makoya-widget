# Phase 0 Final Fix Report

Date: 2026-06-20

## Summary

Two consistency gaps from the Phase 0 FeatureKey widening (9 → 15 keys) addressed and verified.

---

## Finding C1 (Critical): Widget typecheck was red

**Root cause:** `packages/widget/src/ui/ui.ts` declared three exhaustive `Record<FeatureKey, …>` maps covering only the original 9 keys. Widening `FeatureKey` to 15 keys caused TS2740 exhaustiveness errors on all three.

**Fix applied to** `packages/widget/src/ui/ui.ts`:

1. Line 13 — changed `const ICON: Record<FeatureKey, string>` → `const ICON: Partial<Record<FeatureKey, string>>`
2. Line 25 — changed `const LABELS: Record<FeatureKey, string>` → `const LABELS: Partial<Record<FeatureKey, string>>`
3. Line 129 — changed `const FEATURES: Record<FeatureKey, (prefs: Prefs, onChange: () => void) => HTMLElement>` → `const FEATURES: Partial<Record<FeatureKey, (prefs: Prefs, onChange: () => void) => HTMLElement>>`
4. Line 82 — added `?? ""` fallbacks in `row()`: `${ICON[key] ?? ""}<span>${LABELS[key] ?? ""}</span>`

No placeholder icons/labels/effects were added for the 6 new keys. The existing `if (build)` guard at the `FEATURES[key]` call site (line 373) was already present — unknown keys are silently skipped.

---

## Finding I1 (Important): infra/schema.sql diverged from migration

**Root cause:** `infra/schema.sql` (the fresh-DB source of truth) still had the 9-key `features_enabled` default and was missing the 5 new columns added by `supabase/migrations/20260620010000_widget_config_v3.sql`.

**Fix applied to** `infra/schema.sql`:

- Changed `features_enabled` default array from 9 keys to all 15:
  `textSize, lineSpacing, contrast, stopMotion, readingRuler, highlightLinks, bigCursor, readableFont, hideImages, saturation, readingMask, highlightTitles, textAlign, muteSounds, readAloud`
- Added 5 new columns (matching migration defaults exactly):
  - `launcher_size              text    not null default 'md'`
  - `default_profile            text    not null default 'none'`
  - `accessibility_statement_url text   not null default ''`
  - `default_language           text    not null default 'en'`
  - `panel_title                text    not null default ''`

Column alignment updated to match file style.

---

## Verification

### `cd packages/widget && npm run typecheck`

```
> @makoya/widget@0.1.0 typecheck
> tsc --noEmit
```

**Result: PASS — 0 errors**

### `cd apps/web && npm run typecheck && npx vitest run`

Typecheck:
```
> @makoya/web@0.1.0 typecheck
> tsc --noEmit
```

Vitest:
```
 ✓ lib/auth/roles.test.ts (3 tests)
 ✓ lib/sites-mappers.test.ts (4 tests)
 ✓ lib/shared-config.test.ts (6 tests)
 ✓ lib/scanner/plain-language.test.ts (3 tests)
 ✓ lib/scans-mappers.test.ts (1 test)
 ✓ lib/admin-constants.test.ts (2 tests)
 ✓ lib/admin-issues.test.ts (3 tests)

 Test Files  7 passed (7)
       Tests  22 passed (22)
```

**Result: PASS — 22/22 tests**

---

## Commit

Files staged: `packages/widget/src/ui/ui.ts infra/schema.sql`

Commit message: `fix(phase0): widget FeatureKey maps Partial + skip unimplemented; sync schema.sql with v3 migration`
