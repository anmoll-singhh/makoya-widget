# Backend readiness for `makoya_v3.1.html` (the future UI)

> **Purpose.** `docs/makoya_v3.1.html` is the target dashboard look. This doc maps **every screen + feature** in that mockup to the **current backend**, so we can build the backend *ahead* of the frontend. When we eventually build the real UI, integration should be "wire it to an endpoint that already exists."
>
> **Method.** Read-only specialist audit of `supabase/migrations/*`, `infra/schema.sql`, `apps/web/app/api/**`, `apps/web/lib/**`, and `packages/shared`. Status legend: ✅ exists · 🔶 partial · ❌ missing.
>
> **Created:** 2026-06-26. Snapshot of `main`. Re-audit after each backend phase.

---

## TL;DR readiness scoreboard

| # | Screen | Backend status | Headline gap |
|---|---|---|---|
| 1 | Audit / Issues | 🔶 partial | Issues are JSONB-in-scan, not tracked rows (no owner/status/attachments) |
| 2 | Agents (= "sites") | 🔶 partial | No `status`, `category`, `last_audit_at`, install-verified flag |
| 3 | Overview / Dashboard | ❌ mostly missing | No score history, activity feed, or framework-coverage rollups |
| 4 | Add Agent (onboarding) | 🔶 partial | Free scan ✅; self-serve plan-pick + site-create ❌ |
| 5 | Install | 🔶 partial | Token mint ✅; **verify-install / heartbeat ❌** |
| 6 | Customize widget | ✅ mature | Add mobile tab + brand-contrast check |
| 7 | Reports | 🔶 partial | Single-scan PDF ✅; monthly history + remediation log ❌ |
| 8 | Accessibility statement | ❌ missing | Only a URL field today; no generator |
| 9 | Proof of effort | ❌ mostly missing | No install-proof, VPAT/ACR, evidence aggregation |
| 10 | Analytics (widget usage) | ❌ missing | No widget telemetry table or ingest endpoint |
| 11 | Billing | ❌ mostly missing | No Stripe, renewal, quota; plan names mismatch |
| 12 | Agent settings | 🔶 partial | No owner contact fields, advanced widget toggles, notif prefs |
| 13 | Account / team / org | ❌ missing | **Single-user RLS only — no org/team/roles model** |
| 14 | Partners / agency | ❌ missing | No partner/white-label/commission model |

**Already solid (don't rebuild):** Scanner v2 + evidence scoring, public scan funnel, widget config + 15 features, PDF report, licensing/domain gate, RLS multi-tenant. These are LIVE.

---

## Per-screen detail (what exists → what to build)

### 1. Audit / Issues — 🔶
**Have:** `scans` stores issues as JSONB grouped by severity; `AccessibilityIssue` type carries `wcag`, `disabilityGroups`, `instanceCount`, `pointsContributed`.
**Need:**
- `issues` table — one row per issue per site, so issues persist across scans and can be tracked:
  `id, site_id, scan_id, wcag_criterion, framework (wcag|ada|aoda|eaa), title, status (failing|needs_review|passing), checks_passing, checks_total, assignee_id (→ team_member), created_at, resolved_at`
- `issue_attachments` — `id, issue_id, kind (document|policy), label, url`
- Owner/assignee requires the **team model (#13)** to exist first.

### 2. Agents list — 🔶
**Have:** `sites` (id, owner_id, domain, plan, license_status, trial_ends_at, allowed_domains); `listSites()`.
**Need (columns or derived):**
- `status` enum: `active | monitoring | action_needed | not_installed`
- `category` / `vertical` (e.g. "Jewelry · e-commerce") — display label
- `install_verified` + `last_seen_at` (from heartbeat #5)
- `compliance_score` + `last_audit_at` — derive from latest scan, or denormalize for list speed.

### 3. Overview / Dashboard — ❌
Everything on this screen is an aggregate/timeseries we don't store.
**Need:**
- `scan_history` / monthly rollup: `site_id, period (YYYY-MM), score, issues_found, issues_resolved` → powers compliance trend + deltas + monthly reports (#7).
- `activity_log`: `site_id, actor (mike|user|specialist), type, summary, wcag_ref, created_at` → recent-activity feed.
- Framework coverage: compute `% met` per WCAG/ADA/AODA/EAA from issues (#1) — could be a view.
- Streak / pages-monitored / widget-opens come from heartbeat (#5) + analytics (#10).

### 4. Add Agent onboarding — 🔶
**Have:** `/api/public-scan` (anonymous score + top issues, rest teased); admin `createCustomer()`.
**Need:** customer-facing **self-serve** path: plan selection → create `site` + `site_config` → mint token → install. Today site creation is admin-only. Optional `onboarding_state` if we want resumable wizards.

### 5. Install — 🔶
**Have:** `mintSiteToken(siteId)`, loader URL shape, `allowed_domains` gate in `/api/config`.
**Need:**
- **Heartbeat / verify-install** — the keystone for #2, #3, #9. New endpoint `/api/heartbeat` (called by loader) + `widget_heartbeat` table: `site_id, first_seen_at, last_seen_at, page_count, uptime_samples`. "Verify installation" button polls this.
- Platform guides can stay static (docs), or a small `install_guides` lookup if we want them DB-driven.
- "Send to developer" → tiny endpoint that emails the snippet (Resend already wired).

### 6. Customize widget — ✅ (most mature)
**Have:** `site_config` (primary_color, position, launcher_icon, features_enabled[15], hide_branding, launcher_size, default_profile, default_language, panel_title); `/api/sites/[id]/config`; shared config is canonical.
**Need (small):** mobile-specific overrides (new `site_config` fields), and a brand-color **contrast-check** helper (pure compute; can be server util or client).

### 7. Reports — 🔶
**Have:** `renderReportPdf()` + `/api/report-pdf` for a single scan.
**Need:**
- `monthly_reports`: `site_id, period, score, issues_found, issues_resolved, pdf_url` (feeds the table + per-month PDF).
- `remediation_log`: `id, site_id, issue_id, wcag_criterion, action, fixed_by, fixed_at` → also feeds proof-of-effort (#9) and "issues resolved" metrics (#3).

### 8. Accessibility statement — ❌
**Have:** only `site_config.accessibility_statement_url` (a link).
**Need:** generator producing statement HTML from `{brand, jurisdictions[], conformance_target, contact_email}`. Store as `accessibility_statements` (versioned) + a generate/preview endpoint. Pure templating — cheap to build, keep the **compliance-guardrail copy** (commitment, *not* certification).

### 9. Proof of effort — ❌
Aggregation of: audit history (scans ✅), remediation log (#7), statement (#8), install proof (#5 heartbeat → days + uptime), VPAT/ACR doc, manual-audit record.
**Need:** `vpat_documents`, `manual_audits` tables + an **evidence-pack** endpoint that bundles all six into a downloadable PDF/zip. Most of this is "exists once #5/#7/#8 exist."

### 10. Analytics (widget usage) — ❌
**Have:** `observability.ts track()` is *internal* server telemetry only — not widget usage.
**Need:**
- `widget_events` ingest: `/api/widget-events` (called from widget) → `site_id, event (open|feature_activated), feature_key, ts`. Must be rate-limited + fail-open (Upstash already wired).
- Aggregation queries for: opens count, feature-activation breakdown, most-used, opens-over-time. PostHog is wired and could carry some of this, but per-site dashboards likely want our own rollup.

### 11. Billing — ❌ (Stripe is Phase 2, founder-gated)
**Have:** `sites.plan` (`free|pro|managed`); admin plan constants.
**Need:** plan-name reconciliation (UI: Starter/Growth/Scale/Enterprise), `plan_quotas` (visit tiers), `billing_subscriptions` (period, renews_at, stripe ids), Stripe checkout + **signature-verified idempotent webhook** → server-side plan gating + quota enforcement. See STATUS.md (blocked on Stripe account).

### 12. Agent settings — 🔶
**Have:** widget config (above).
**Need:** owner contact (`owner_name/email/phone` — new table or columns), advanced widget config (`custom_trigger_element`, `dom_observer_enabled`, `inherit_fonts_enabled`), `notification_preferences`. Several map cleanly onto `site_config` additions.

### 13. Account / team / org — ❌ (biggest structural gap)
Today: strictly one Supabase user owns rows via RLS (`owner_id = auth.uid()`).
**Need a real tenancy model:**
- `organizations` (the account)
- `team_members` (`org_id, user_id, role: owner|admin|developer`)
- `team_invites`
- per-member **agent scoping** (which sites each member sees)
- `api_keys` for the API tab
- **This is a foundational refactor** — RLS policies across `sites`, `site_config`, `scans`, `issues`, etc. must move from "owner_id" to "org membership". Do this *before* #1 owner-assignment and #14 partners, since both depend on it.

### 14. Partners / agency — ❌
**Need:** `partner_accounts`, partner→client linking, `white_label_config` (brand the widget + reports), `partner_commissions` / revenue. Depends on the org/team model (#13). Last to build.

---

## Cross-cutting notes
- **Terminology:** UI "agents" = code "sites"; UI plan names ≠ code plan names. Cosmetic — resolve with a naming map, not a schema change (unless we rename for clarity).
- **"Mike" / "Felix" / "Tanvir":** UI implies an AI auditor + human remediation specialists. No AI-remediation or human-remediation-workflow backend exists. If real, needs issue-routing + remediation-request tables (overlaps #1, #7).
- **`leads` + `consultation_requests`:** exist and power the public funnel / CRM. Not part of the v3.1 *client* dashboard, but feed the admin side.

---

## Recommended build order (dependency-aware)

1. **Heartbeat / verify-install** (#5) — unlocks site status (#2), streak/uptime (#3, #9). Small, high leverage.
2. **Widget analytics ingest + rollups** (#10) — independent, high product value on the Overview/Analytics screens.
3. **`issues` + `remediation_log` + `activity_log`** (#1, #7, #3) — the tracking backbone; powers most dashboard numbers.
4. **`scan_history` monthly rollup** (#3, #7) — trend + monthly reports.
5. **Org / team / roles tenancy** (#13) — foundational; required before issue-assignment owners and partners. Plan the RLS migration carefully.
6. **Statement generator** (#8) + **evidence pack** (#9) — mostly templating/aggregation once 1–4 exist.
7. **Billing / Stripe** (#11) — Phase 2, founder-gated.
8. **Partners / white-label** (#14) — last; depends on #13.

> Items 1–2 are cheap and unblock the most visible screens. Item 5 (tenancy) is the big one — sequence it before anything that needs "who owns/assigned this."
