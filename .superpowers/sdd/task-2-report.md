# Task 2 Report — Persist new config fields (migration + mappers + API)

## Status
DONE

## Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/20260620010000_widget_config_v3.sql` | Created — adds 5 columns to `site_config`, updates `features_enabled` default to 15 items, backfills existing rows |
| `apps/web/lib/sites-mappers.ts` | Modified — extended `SiteConfig` interface with 5 new fields; added imports for `WidgetLauncherSize`, `WidgetLanguage`, `WidgetProfileKey`; updated `rowToConfig` with safe fallbacks (`?? "md"` etc.); updated `configToRow` with 5 new snake_case mappings |
| `apps/web/lib/sites-mappers.test.ts` | Modified — added `describe("widget config v3 mapping")` with 2 new tests; updated existing `rowToConfig` test expected value to include 5 new fields with safe-fallback defaults |
| `apps/web/app/api/config/[siteId]/route.ts` | Modified — added 5 new fields to both the fallback object (uses `DEFAULT_CONFIG.*`) and the happy-path object (uses `cfg.*`); explicit allowlist maintained in both branches |
| `apps/web/app/api/sites/[id]/config/route.ts` | Modified — replaced single `patch.hideBranding = false` free-plan gate with block that also `delete patch.panelTitle` and `delete patch.accessibilityStatementUrl` |

## Test Command + Output

```
cd apps/web && npm run typecheck && npx vitest run
```

**typecheck:** PASS (no output, exit 0)

**vitest run:**
```
✓ lib/sites-mappers.test.ts (4 tests) 20ms
✓ lib/admin-constants.test.ts (2 tests) 20ms
✓ lib/scanner/plain-language.test.ts (3 tests) 21ms
✓ lib/shared-config.test.ts (6 tests) 54ms
✓ lib/scans-mappers.test.ts (1 test) 31ms
✓ lib/auth/roles.test.ts (3 tests) 31ms

Test Files  6 passed (6)
Tests       19 passed (19)
Duration    3.63s
```

## Step 8 (supabase db push) — INTENTIONALLY SKIPPED

The live DB migration (`supabase db push`) was not run per the controller's instruction — it requires an interactive DB password this agent cannot supply. The migration FILE (`supabase/migrations/20260620010000_widget_config_v3.sql`) is committed and ready. The controller should run `supabase db push` (or apply the SQL directly in the Supabase dashboard) to activate the new columns.

## Commit Hash

_(filled in after commit below)_

## Note on existing test update

The existing `rowToConfig` test used `toEqual` with only 6 fields. Since `rowToConfig` now always returns 11 fields (including safe fallbacks for the 5 new ones), the expected object was updated to include the 5 new fields at their fallback values (`launcherSize: "md"`, etc.). This is correct behaviour — the test now covers that the safe fallback logic fires when the new columns are absent from the row.

## Concerns

None. The public config endpoint maintains its explicit field allowlist in both branches. The free-plan gate now also strips `panelTitle` and `accessibilityStatementUrl`. `rowToConfig` safe fallbacks ensure rows written before the migration never crash.
