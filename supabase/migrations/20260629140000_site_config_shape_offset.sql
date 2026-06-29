-- ───────────────────────────────────────────────────────────────────────────
-- site_config: launcher shape + position offsets (2026-06-29).
--
-- BUG FIX: a prior batch shipped the launcher SHAPE (circle/rounded/square) and
-- X/Y OFFSET customizer controls end-to-end — shared config type, widget runtime,
-- customizer UI, the config PATCH validation schema (configPatchSchema), and the
-- camelCase⇄snake_case mappers (configToRow maps launcherShape→launcher_shape,
-- offsetX→offset_x, offsetY→offset_y) — but the matching site_config COLUMNS were
-- never added. Result: saving any of these three settings issued an UPDATE against
-- non-existent columns and 500'd ("update failed"); reads fell back to defaults via
-- rowToConfig's `?? 'circle' / ?? 0`, masking the write failure.
--
-- This adds the three columns with defaults that match DEFAULT_CONFIG in
-- packages/shared (circle / 0 / 0), so persistence now works and the public config
-- endpoint can serve the real values. NOT NULL + default keeps existing rows valid.
-- ───────────────────────────────────────────────────────────────────────────

alter table site_config
  add column if not exists launcher_shape text    not null default 'circle',
  add column if not exists offset_x       integer not null default 0,
  add column if not exists offset_y       integer not null default 0;
