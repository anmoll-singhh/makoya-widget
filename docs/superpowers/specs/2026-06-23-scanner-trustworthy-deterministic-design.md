# Scanner: Trustworthy, Deterministic, Evidence-Based — Design Spec

**Date:** 2026-06-23
**Status:** Approved (design) · specialist review incorporated (B1–B4 + improvements) → building Phase 1
**Owner:** Makoya scanner

### Decisions locked
- **Vercel plan: Hobby / 60s for now.** → **Phase the build** (see §3.1). The 2–4 min async worker is **Phase 2**, deferred until Pro/Fluid Compute. Phase 1 delivers a trustworthy, deterministic score synchronously within 60s.
- **Score migration: version + re-score on next scan.** Tag every score with `scoringModelVersion`; old scans stay as-is, never diff across versions (§8).
- **Calibrate before ship** against real-world distribution (WebAIM Million) so weights aren't degenerate (§6).

## 1. Goal

Make the accessibility score a **trusted benchmark**, not a number on a dashboard:

1. **Deterministic** — the same site produces (near-)identical scores across runs unless the site actually changed.
2. **Evidence-based** — every point deducted is backed by a real WCAG violation with a severity and verifiable findings.
3. **Explainable** — every issue carries: the impacted WCAG criterion + level, severity, why it matters / who it affects, instance count, points contributed, and per-node evidence (selector, HTML, fix).
4. **Reliable with a fallback** — accuracy is prioritised over speed (a 2–4 min scan is acceptable), and no single component failure breaks the product.

Non-goal: WCAG/ADA "compliance" or "guaranteed accessible" claims (see CLAUDE.md compliance guardrails). We report accessibility *findings and preferences*, never legal compliance.

## 2. Current state (what we're changing and why)

- `lib/scanner/index.ts` runs synchronously inside a Vercel function (`maxDuration = 60`). On a ~14s axe timeout it **silently falls back to a reduced ruleset** (`wcag2a + wcag2aa`) and flags `isPartialScan`. A reduced ruleset finds fewer violations → **the same unchanged site can score differently between runs.** This is the primary determinism bug.
- `lib/utils/score.ts` scores by **distinct rule IDs** (`100 − Σ(uniqueRule × weight)`). 1 contrast failure and 300 contrast failures deduct the identical amount. Stable, but prevalence-blind and not "evidence-based."
- Issues carry no explicit WCAG success criterion, no "why it matters" for most rules, no per-issue point contribution, no instance count.
- Render waits are tuned aggressively for speed, the opposite of the new priority.

## 3. Architecture overview

Three units ship in **Phase 1**, each independently testable; a fourth is **Phase 2**:

| Unit | Phase | Responsibility | Depends on |
|------|-------|----------------|------------|
| **Deterministic pipeline** | 1 | render-freeze + full ruleset + fail-don't-degrade + provenance | Playwright, axe-core, custom checks |
| **Scoring engine** | 1 | instance-weighted diminishing-returns score + auditable line items | pure function, no I/O |
| **Evidence layer** | 1 | WCAG-criterion mapping + plain-language map + per-issue enrichment | static tables |
| **Job orchestration** | 2 | enqueue → 300s worker → polling status; idempotency, reaper | Supabase (`scan_jobs`), the Phase-1 pipeline |

### 3.1 Phasing

- **Phase 1 (now, Hobby/60s):** synchronous scan, **fallback removed** (fail honestly instead of degrading), deterministic page-freeze, new scoring model, evidence layer, provenance, calibration, golden determinism test. This is where (near-)all the trust value lives and it fits in 60s.
- **Phase 2 (when on Pro/Fluid Compute):** add the async job table + 300s worker + polling UI for genuine 2–4 min multi-page depth. Phase 1 is structured so this is **additive**, not a rewrite. The full Phase-2 design is retained in §13 for reference but is **not** built now.

## 4. Execution model — Phase 1: synchronous, fail-don't-degrade (60s)

The existing `POST /api/scan` route and `runAndStoreScan` stay **synchronous**. The single behavioural change that fixes determinism:

- **Remove the reduced-ruleset timeout fallback.** Today a slow scan silently switches to `wcag2a + wcag2aa` and emits a *different* (lower-violation) score. Phase 1 **always runs the full ruleset**; if it cannot finish within budget it **fails with `SCAN_TIMEOUT`** rather than emitting a degraded score.
  - Determinism contract: we may return *a score* or *no score (error)* — we never return a **different** score for an unchanged site. "No score" is honest; "different score" is not.
  - `isPartialScan` is retired (no partial path remains).

### 4.1 Phase-1 flow (unchanged surface)

```
POST /api/scan
  ├─ auth + SSRF-validate URL (validateScanUrl)   [unchanged]
  ├─ recency cache fresh (<7d)? → return existing scan   [unchanged]
  └─ else runAndStoreScan → deterministic pipeline (§5) → buildReport → saveScan
       (full ruleset only; on timeout → SCAN_TIMEOUT, no degrade)
```

### 4.2 Internal-budget math (60s Vercel cap)

The 60s is a hard kill, not a budget to ride to the edge — leave ≥10s slack.

```
  ~2s   browser launch
  15s   navigation cap
   5s   network idle + load + scroll-to-trigger + fixed settle (§5)
  18s   axe full pass cap (full ruleset; no fallback pass)
   ~4s  custom checks + screenshot + store + cleanup
  ───   ≈ 44s typical worst case, ≥10s slack under the 60s wall
```

Each phase keeps its own bounded timeout so one hung phase can't consume the whole budget. Single-page scans are the norm in Phase 1; multi-page depth is a Phase-2 (300s) capability.

**Speed up axe deterministically, never by reducing the ruleset.** Before accepting a `SCAN_TIMEOUT`, axe work is reduced *without changing which violations are found*: only collect `resultTypes: ["violations"]` (we already discard passes/incomplete), and keep pruning known-heavy third-party iframe subtrees (already done). This shortens analysis without altering the deterministic result set. Heavy real-world homepages (large e-commerce/news) may still `SCAN_TIMEOUT` — that is acceptable for the authed `/api/scan` path (clear retry message), and Phase 2's 300s budget removes it. For the public funnel (`/api/public-scan`) a timeout is a lost lead, so it gets the same deterministic axe-speedups and a graceful "scan is taking longer than expected — try again" message rather than a degraded score.

> **Phase 2 (deferred):** the async job table + 300s worker + polling design is retained in §13 and built only once the plan allows `maxDuration=300`.

## 5. Deterministic scan pipeline

- **Always the full ruleset** (WCAG 2.0/2.1/2.2 A+AA + best-practice). **Remove the reduced-ruleset timeout fallback entirely** — degrading the ruleset is what made scores vary. On timeout we fail honestly (§4), never degrade.
- **Pin the viewport for the axe run** (not just the screenshot): a fixed `1280×800` viewport is set on the context. Contrast, target-size, and reflow results depend on viewport, so it must be deterministic.
- **Emulate `prefers-reduced-motion: reduce` BEFORE navigation** (via `context.emulateMedia` / new-context option), so initial-render animations never fire and the first paint DOM is stable. Setting it after load is too late.
- **Freeze + stabilise before axe:** (1) inject a stylesheet disabling all animations/transitions; (2) **disable native lazy-load and scroll the full page once** to trigger IntersectionObserver/lazy content deterministically (off-screen lazy content is a top flake source because axe scans the whole DOM); (3) wait networkidle → load → fixed settle. A frozen, fully-mounted DOM is what makes axe's (already deterministic) output reproducible.
- **Second-pass DOM verification — retained, on the frozen DOM.** `verifyNodesExist` runs *after* the freeze, so the DOM it re-queries is the same DOM axe saw; the "keep-all-on-failure" branch only triggers on context destruction, which a frozen page won't hit. `instanceCount` (below) is defined as the count *after* this verification. (This resolves the freeze-vs-second-pass tension: the freeze makes the second-pass stable rather than redundant.)
- **`instanceCount` — precise definition.** For axe rules: the number of verified offending `nodes` **after** shadow/light-DOM merge + target-selector dedup (`normaliseViolations`) and **after** second-pass verification, **before** any display truncation. For custom checks: the true total of matched elements. This is a NEW field `totalInstances` threaded through `RawAxeViolation` → `AccessibilityIssue` (not just on the display nodes, which stay capped for payload size). Custom checks return `{ totalInstances, nodes: cappedDisplayNodes }`. The score is computed on `totalInstances`, never on `nodes.length`.
- **Provenance recorded with every scan** (`engine_meta`): `axeVersion` (the *exact* `axe.version`, so an axe minor bump is attributable), `engineVersion` (our pipeline version), `rulesetHash` (hash of enabled axe tags + `axe.version` + the set of custom-check ids **and their version**), `scoringModelVersion`, and a **`contentHash`** (see below). If a score changes, `contentHash` says whether the *site* changed; the version fields say whether *we* changed. This is what makes the benchmark defensible.
- **`contentHash` — structural/a11y skeleton, NOT visible text.** Hashing visible text would flag nearly every real site as "changed" every run (timestamps, CSRF tokens, "5 minutes ago", cart counts, ad slots, framework-randomised ids like React `useId`/styled-components hashes). Instead hash a normalised skeleton: strip `script`/`style`/`noscript`/comments; walk the DOM emitting the **tag-name sequence + accessibility-relevant attributes only** (`role`, `aria-*`, `alt`, `type`, label associations, presence-of-`href`), with volatile attribute *values* dropped or normalised (ids/classes/nonces removed). Collapse whitespace, lowercase. The golden test asserts this hash is identical across two runs on the same fixture.
- **Honest determinism boundary:** determinism is guaranteed *given the same rendered DOM*. Server-side variance we cannot control (A/B tests, geo, time-based, ad rotation) can still shift the DOM; `contentHash` surfaces this rather than hiding it. We do not claim more than we can deliver.
- **Multi-page (Phase 2):** when the 300s worker lands, sub-pages are scanned **sequentially reusing one browser** (new context per page), not concurrent browsers, to bound memory. Phase 1 is single-page; the current multi-scan path keeps working but is not the focus.

## 6. Scoring engine (instance-weighted, diminishing returns)

```
penalty(rule)  = weight[severity] × (1 + ln(instanceCount))     // instanceCount ≥ 1 ⇒ factor ≥ 1
rawPenalty     = Σ penalty(rule)
score          = round(100 − clamp(rawPenalty, 0, 100))
```

- **Base weights** (tunable constants, documented, unit-tested): critical 12 · serious 7 · moderate 3 · minor 1. **These supersede the current `SEVERITY_WEIGHTS` (15/10/5/2) in `lib/utils/score.ts` — the old constant is replaced, not left alongside.**
- `instanceCount` here = `totalInstances` (post-dedup, post-verification — §5), never the display-capped `nodes.length`. Counting post-merge guarantees we don't double-count axe's shadow+light-DOM duplicates.
- **Line items** (`score_breakdown`): array of `{ ruleId, severity, wcagCriterion, level, instanceCount, pointsContributed }`, sorted by `pointsContributed` desc, plus top-level `rawPenalty` and `appliedPenalty` (clamped). A single high-count critical rule can alone exceed 100 (e.g. 4000 instances → `1+ln(4000)≈9.3`, ×12 ≈ 112 → site clamps to 0); the breakdown makes this explicit so the UI can say "this one rule alone would zero your score" rather than looking like a bug.
- **Honest clamp:** the breakdown exposes both `rawPenalty` and the applied (clamped) total, so a heavily-broken site that clamps to 0 doesn't look like a math error (line items may sum to >100). The UI must explain this, or summed line items >100 read as a bug.
- Pure function, no I/O. `scoringModelVersion` is bumped whenever weights or the curve change, so a score shift caused by *us* is never mistaken for a site change.
- **Calibration task:** before shipping, run the new model over a curated local sample set of representative pages and sanity-check the distribution against the WebAIM Million reference (it is the sanity benchmark, not a runtime dependency). Tune weights once. **Re-derive `scoreToGrade` bands from this distribution** — the legacy "Excellent ≥90" thresholds will mismatch the new (harsher, more realistic) distribution.

## 7. Evidence layer (per-issue enrichment)

New fields on `AccessibilityIssue`:

- **`wcag`**: `{ criterion: "1.4.3", name: "Contrast (Minimum)", level: "AA", url }`.
  - **Static lookup table, NOT digit-splitting.** `lib/scanner/wcag-criteria.ts` maps the **exact axe tag string** (`"wcag143"`, `"wcag1410"`, …) → `{ criterion, name, level, url }`, sourced from axe-core's own rule metadata. Digit-splitting is wrong because `wcag1410` is ambiguous (1.4.10 vs 14.10); only an exact-string table is correct.
  - **Level tags are not criteria.** `wcag2a`/`wcag2aa`/`wcag21aa`/`wcag22aa` set `level` only and carry **no** `criterion`.
  - **Multi-criterion:** a rule often has several `wcagNNN` tags (e.g. `link-name` → 2.4.4 + 4.1.2). List a deterministically-chosen primary (lowest criterion number, with a small curated override map for known cases) + the others, so the displayed criterion never flickers.
  - **No criterion:** `best-practice` rules are labelled `{ level: "best-practice" }` with no fabricated criterion. We never invent a criterion.
  - **Custom checks declare an explicit `criterion`.** Each of the 6 custom checks currently carries only `tags`; add an explicit criterion to each (e.g. `icon-button-no-label` → 4.1.2, `media-autoplay` → 1.4.2, `focus-ring-hidden` → 2.4.7).
- **`whyItMatters` / `whoItAffects`**: the plain-language map in `plain-language.ts` is extended to cover **every rule we can emit**, with a safe non-empty fallback derived from axe's `help`/`description` for anything uncurated.
- **`instanceCount`** + **`pointsContributed`**: tie each finding to the score.
- **Preserved:** existing node evidence (`target`, `html`, `failureSummary`).

## 8. Storage & types

- **Phase-1 migration adds** two nullable `jsonb` columns on `scans`: `score_breakdown`, `engine_meta`. `issues`/`totals` are already `jsonb`, so the richer per-issue fields need no schema change. (The `scan_jobs` table is a Phase-2 migration — §13.)
- **Legacy scans:** rows without `engine_meta`/`score_breakdown` are pre-v2. The UI must (a) render new fields defensively when absent, and (b) **never compare a v2 score against a pre-v2 score as if the site changed** — `scoringModelVersion` gates comparisons. No silent backfill (columns nullable, no defaults that would rewrite large existing `issues` blobs); old scans display as legacy or are re-scanned on next run.
- **`scanRowToRecord` must surface the new columns.** It is currently a flat passthrough that silently drops unknown columns; extend it to read `engine_meta`/`score_breakdown` so the report carries them.
- **Retire `isPartialScan` writes, keep it readable.** Stop writing it (no partial path remains), but leave the field readable for legacy rows; the PDF `partialNote` becomes dead for v2 scans. Touch points: `types/index.ts`, `report-builder.ts`, `public-scan/route.ts`, `pdf/report-content.ts`.
- **Types:** extend `AccessibilityReport` / `AccessibilityIssue` in `types/index.ts`; regenerate the `@makoya/shared` mirror via `npm run sync:shared` (never hand-edit; CI drift gate enforces this).

## 9. Testing & trust

- **Scoring** — determinism (same input → identical output, run twice), diminishing curve, clamp behaviour (line items sum >100 → score === 0), line-items sum to `rawPenalty`, and **instanceCount uses `totalInstances` not the display cap** (fixture with >6 instances of one rule must score on the true count).
- **WCAG mapping** — exact-tag lookup correctness incl. the ambiguity cases: `wcag1410 → 1.4.10` and `wcag2aa → level only, no criterion`; multi-SC primary selection is deterministic; best-practice → no criterion.
- **Plain-language coverage** — every rule resolves to non-empty `whyItMatters`/`whoItAffects` (extend existing `plain-language.test.ts`).
- **Golden determinism (end-to-end)** — a fixed local HTML fixture (loaded via `file://`/data URL, no network) → exact expected score, run twice, **asserting identical score AND identical `contentHash`** (proves the hash is stable on stable input). This is the contract that proves "same site → same score."
- **No-degrade** — SCAN_TIMEOUT never yields a partial/degraded score.
- **Calibration regression** — snapshot the score distribution over the curated sample so future weight changes are visible in CI.
- **No-degrade behaviour** — confirm a timed-out scan raises `SCAN_TIMEOUT` and never emits a partial/degraded score (the retired-fallback contract).
- `npm run ci` (sync:shared + typecheck + tests) must pass; shared-sync drift gate green.
- *(Phase 2)* Job lifecycle — enqueue idempotency (race), worker throw → `job=error`, stale reaper, sync-fallback path.

## 10. Risks & open questions (senior-manager review)

| # | Risk | Severity | Mitigation / status |
|---|------|----------|---------------------|
| R1 | `maxDuration = 300` needs Pro/Fluid Compute; Hobby caps at 60s. | High | **Resolved:** phased — Phase 1 is 60s synchronous (full value); 300s worker is Phase 2 (§3.1, §13). |
| R2 | **Full ruleset may not finish in 60s on very heavy DOMs** → `SCAN_TIMEOUT` instead of a score. | Med | Acceptable: honest failure, never a wrong/different score. Bounded per-phase timeouts (§4.2). 300s (Phase 2) removes this for heavy sites. Surface a clear retry message. |
| R3 | **Server-side content variance** (A/B, geo, ads) shifts the DOM → legitimate score change. | Med | `contentHash` surfaces it; determinism boundary documented honestly (§5). Not hidden. |
| R4 | **Scoring re-calibration** could make scores feel different vs old model. | Med | **Decided:** `scoringModelVersion` + version-and-re-score-on-next-scan; never diff across versions (§8). Calibrate before ship (§6). |
| R5 | **Legacy score comparison** mixing models. | Med | Gate comparisons on `scoringModelVersion` (§8). |
| R6 | **WCAG mapping gaps** for rules with no/multiple SC. | Low | Explicit no-SC / multi-SC handling; never fabricate (§7). |
| R7 | **Calibration data access** — WebAIM Million is a report/sample, not a live API. | Low | Use a curated local sample set of representative pages for the calibration run; the WebAIM distribution is the sanity reference, not a dependency. |
| R8 *(Phase 2)* | Worker trigger drop / stuck jobs / Chromium memory over 300s. | Deferred | Addressed in §13 (after()+cron drain, stale reaper, sequential single-browser). |

## 11. Out of scope (YAGNI)

- Real screen-reader (AT) automation, computer-vision contrast on background images, LLM-judged alt-text quality — all evaluated in the research list (§12) as *later*, not built now.
- A standalone queue/worker service — the 300s route + cron backstop is sufficient at current scale; the job model leaves a clean seam to add one later without changing the API/UI.

---

# 12. Research: tools, libraries, APIs & datasets to strengthen the scanner

Prioritised. Recommendation = **Now** / **Later** / **No**. Cost noted; integration complexity is Low/Med/High.

## 12.1 Additional automated engines (more coverage / cross-validation)

| Tool | What it adds | Pros | Cons | Cost | Integ. | Rec. |
|------|--------------|------|------|------|--------|------|
| **axe-core** (current) | Core WCAG engine | Deterministic, well-maintained, industry standard | Misses ~30–40% of issues that need human judgement | Free (MPL-2.0) | — | **Keep** |
| **IBM Equal Access (`accessibility-checker`)** | Second independent ruleset (IBM's), incl. some rules axe lacks | Free, actively maintained, ACT-aligned | Overlap with axe → must dedup by criterion; heavier | Free | Med | **Later** — adds breadth once axe path is solid |
| **Pa11y + HTML_CodeSniffer** | Alternative engine for cross-check | Free, simple | Older, noisier (HTMLCS), more false positives | Free | Med | **No** (noise outweighs benefit) |
| **Lighthouse a11y category** | — | Recognisable brand | Uses axe-core under the hood → redundant for a11y | Free | Low | **No** (redundant) |
| **Deque axe DevTools Pro / axe API / IGT** | Pro rules + "Intelligent Guided Tests" for issues automation can't decide; legal-grade depth + support | Best-in-class accuracy & credibility; same engine family (low migration risk) | Per-seat / per-scan licensing; commercial terms | **Paid** ($$) | Med | **Later** — strong credibility play once revenue justifies |

## 12.2 Independent third-party APIs (credibility / cross-validation signal)

| Tool | What it adds | Pros | Cons | Cost | Integ. | Rec. |
|------|--------------|------|------|------|--------|------|
| **WAVE API (WebAIM)** | Independent error/alert/contrast/structure counts from a respected name | Trusted brand → benchmark credibility; different engine = real cross-check | Per-credit cost; rate limits; less granular for automation | **Paid** (credits) | Low–Med | **Later** — optional "verified by an independent engine" trust signal |
| **Tenon.io / Siteimprove / Level Access APIs** | Enterprise a11y scanning | Mature | Enterprise pricing/contracts; overkill now | **Paid** ($$$) | High | **No** (not now) |

## 12.3 Supplementary checks (fill specific gaps axe misses)

| Tool | What it adds | Pros | Cons | Cost | Integ. | Rec. |
|------|--------------|------|------|------|--------|------|
| **APCA (`apca-w3`) / colorjs.io** | Modern contrast model (WCAG 3 preview), better for text-on-gradient | More accurate perceptual contrast | WCAG 3 is draft → keep as *informational*, not scored | Free | Low | **Later** (informational only) |
| **html-validate / Nu HTML Checker (vnu)** | Parsing/markup robustness | Free, catches malformed DOM | WCAG 2.2 dropped 4.1.1 (parsing) → low WCAG weight | Free | Low–Med | **Later** (low priority) |
| **Guidepup** | Drives real VoiceOver/NVDA for true AT validation | Highest-fidelity "does it actually work with a screen reader" | Needs real OS + AT in CI; flaky; slow | Free | High | **No now** — revisit for manual spot-checks |
| **LLM-assisted checks (Claude API)** | Judges things axe can't: alt-text *meaningfulness*, link-text context, reading level, ARIA-semantics misuse | Catches axe's "needs review" items; you already use Claude | **Nondeterministic** unless constrained (temp 0 + cache by `contentHash`); cost; must never be in the deterministic score path | **Paid** (API) | Med–High | **Later** — as a *separate, cached, advisory* layer, not in the core score |

## 12.4 Datasets & standards (calibration / validation — high ROI, free)

| Resource | What it adds | Pros | Cons | Cost | Integ. | Rec. |
|----------|--------------|------|------|------|--------|------|
| **WebAIM Million** (annual dataset/report) | Real-world score distribution of top 1M home pages | Calibrate our weights so scores aren't degenerate; benchmark "you're better than X% of sites" | Annual snapshot; home pages only | Free | Low | **Now** — use to calibrate §6 weights |
| **W3C ACT Rules** | Formal accessibility-conformance test definitions | Validate our 6 custom checks against an authoritative spec; reduces false positives | Reading/mapping effort | Free | Low–Med | **Now/Later** — validate custom checks |
| **axe-core rule metadata** | Canonical rule→criterion mapping | Authoritative source for `wcag-criteria.ts` | — | Free | Low | **Now** — back the WCAG mapping table |

## 12.5 Reliability / observability

| Tool | What it adds | Pros | Cons | Cost | Integ. | Rec. |
|------|--------------|------|------|------|--------|------|
| **Sentry** (via existing `observability.ts` seam) | Worker error/perf visibility | Catch dropped triggers, OOMs, stuck jobs early — directly serves "reliability" | Setup + quota | Free tier / paid | Low | **Now-ish** — reliability of the async path depends on seeing failures |
| **PostHog** | Scan funnel / completion analytics | Understand drop-off, scan durations | Setup | Free tier / paid | Low | **Later** |

## 12.6 Summary recommendations

- **Now:** WebAIM Million (calibration), axe-core rule metadata + W3C ACT Rules (back/validate the WCAG mapping & custom checks), Sentry via the existing seam (async reliability).
- **Later:** IBM Equal Access (coverage), WAVE API (independent credibility signal), Deque axe Pro/IGT (when revenue justifies), APCA (informational contrast), LLM-assisted advisory layer (separate from the deterministic score, cached by `contentHash`).
- **No / not now:** Pa11y, Lighthouse-for-a11y (redundant), Guidepup in CI (too flaky/heavy), enterprise APIs (overkill).

---

# 13. Phase 2 (deferred): async job + 300s worker + polling

**Not built now.** Triggered when the Vercel plan provides `maxDuration=300` (Pro/Fluid Compute). Built additively on top of Phase 1 — the scoring engine, evidence layer, and deterministic pipeline are reused unchanged; only the *invocation* changes from synchronous to job-based.

### 13.1 Flow

```
POST /api/scan  (enqueue, fast)
  ├─ auth + SSRF-validate; recency cache → return existing
  ├─ active (queued|running) job for this site? → return it (idempotent)
  ├─ insert scan_jobs row (status=queued); trigger worker (§13.3)
  └─ return { jobId, status:"queued" }

POST /api/scan/worker   maxDuration=300
  ├─ verify internal secret (constant-time); re-validate SSRF
  ├─ claim job (running); run pipeline (§5), update progress
  ├─ store scan + score_breakdown + engine_meta; job → done
  └─ ANY throw → job=error(code); never left running

GET /api/scan/job/[jobId]  (owner RLS) → { status, progress, score?, totals?, plainTop3? }
Dashboard: poll ~2.5s; render on done.
```

### 13.2 `scan_jobs` table (Phase-2 migration)

```
scan_jobs(id, site_id→sites, owner_id, url, status, error_code,
          scan_id→scans, progress jsonb, attempts, created_at, started_at, finished_at)
RLS: owner reads own (owner_id = auth.uid()); writes service-role only.
Idempotency: partial unique index (site_id) where status in ('queued','running').
```

### 13.3 Reliability

- **Trigger:** enqueue awaits worker only until it claims the job + returns 202; worker runs the scan in `after()` within `maxDuration`.
- **Backstop drain:** cron drives any `queued` job older than ~30s (covers dropped triggers).
- **Stale reaper:** `running` > 6 min → `error(timed_out)` on read and via cron.
- **Fallback:** if the job infra is unavailable, enqueue degrades to the Phase-1 synchronous scan — the async path is never a single point of failure.
- **Cost/memory:** recency cache (7d) limits frequency; multi-page is sequential on one browser; page cap small; track in observability (Sentry seam).
