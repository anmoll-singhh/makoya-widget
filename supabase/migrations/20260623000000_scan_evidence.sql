-- ───────────────────────────────────────────────────────────────────────────
-- v2 scanner: evidence-based, deterministic scoring.
--
-- Adds two nullable JSONB columns to `scans`:
--   score_breakdown — auditable per-rule line items (every deducted point)
--   engine_meta     — provenance (axe version, ruleset hash, content hash,
--                     engine + scoring-model versions) so a score change can be
--                     attributed to the SITE vs the ENGINE.
--
-- Both are NULLABLE with NO default, so existing scan rows are NOT rewritten
-- (no large-blob backfill). Pre-v2 scans simply have NULL here and are treated
-- as legacy; comparisons are gated on engine_meta.scoringModelVersion in app code.
--
-- The richer per-issue evidence (wcag criterion, why-it-matters, instanceCount,
-- pointsContributed) lives inside the existing `issues` JSONB column and needs
-- no schema change.
-- ───────────────────────────────────────────────────────────────────────────

alter table scans add column if not exists score_breakdown jsonb;
alter table scans add column if not exists engine_meta     jsonb;
