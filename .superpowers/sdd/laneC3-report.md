# Lane C3 (Batch 3) Implementation Report — v7 Dashboard Final Screens

**Date:** 2026-06-26  
**Branch:** `feat/v7-dashboard`  
**Status:** ✅ All 5 tasks complete, CI green (71 test files, 593 tests passed)

---

## C8 — Analytics (`[siteId]/analytics/`)

**Files:**
- `apps/web/app/dashboard/[siteId]/analytics/page.tsx` (RSC)
- `apps/web/app/dashboard/[siteId]/analytics/_AnalyticsClient.tsx` (client)

**API wired:** `GET /api/sites/[siteId]/analytics?days=30`

**Real data replacing mock literals:**
- `3,418` widget opens → `data.opens`
- `1,902` feature activations → `data.featureActivations`
- `"Bigger text"` most-used label → `FEATURE_META[data.mostUsed.featureKey].label`
- `512 activations` → `data.mostUsed.count`
- Fake fixed-height bars → `data.opensOverTime[].count / maxOpen * 100`%
- Hard-coded feature cards → `data.usageByFeature[]` mapped through `FEATURE_META`

**Honesty:** Honest "no data yet" empty states when `opens === 0`. Bar chart shows real scale. Feature grid only populated from API data.

**Commit:** `cb1e959`

---

## C9 — Billing (`[siteId]/billing/`)

**Files:**
- `apps/web/app/dashboard/[siteId]/billing/page.tsx` (RSC)
- `apps/web/app/dashboard/[siteId]/billing/_BillingClient.tsx` (client)

**APIs wired:**
- `GET /api/sites/[siteId]/billing` → subscription, quota, usage, catalog
- `POST /api/sites/[siteId]/billing/checkout` → set trialing, no charge

**Real data replacing mock literals:**
- `"Renews Jun 30, 2026"` → `data.subscription.renewsAt` (shown only if non-null)
- `"$1,490 / yr"` and `"Growth"` → real plan name + price from `data.catalog.plans`
- `"Current plan"` pill → gated on `data.subscription.planSlug === p.slug`
- Visit limits → `data.catalog.plans[].visitLimit`
- `data.catalog.yearlySavingHeadline` for "Yearly · save N%"

**Invoice honesty:** HONEST EMPTY STATE only (`"Invoices appear here once billing is connected"`). The three fake "Paid" rows (`Jun 30 2025/2024/2023`) are **never rendered**.

**Entitlement contract:** Trialing is visually shown as current plan (selected-awaiting-payment) but the code comments explicitly document that paid feature gates must use `status === 'active'`. PostHog `plan_buy_now` fired on success (fail-silent).

**Commit:** `eb0ec26`

---

## C10 — Settings (`[siteId]/settings/`)

**Files:**
- `apps/web/app/dashboard/[siteId]/settings/page.tsx` (RSC)
- `apps/web/app/dashboard/[siteId]/settings/_SettingsClient.tsx` (client)

**APIs wired:**
- `GET/PATCH /api/sites/[siteId]/settings` → owner name/email/phone + notif prefs
- `GET/PATCH /api/sites/[siteId]/config` → advanced widget fields

**Real data replacing mock literals:**
- `"Vikram Kandoriya"` → `settings.ownerName`
- `"creativesgpt@wavesmvmnt.com"` → `settings.ownerEmail`
- `"+1 (415) 555-0142"` → `settings.ownerPhone`
- `"#a11y-btn"` trigger → `config.customTriggerSelector`
- Toggle states → `config.domObserverEnabled`, `config.inheritFonts`

**A11y:** Three tabs with real `role="tab"` / `aria-selected` / `aria-controls`. Toggles are `<button role="switch" aria-checked>` — keyboard-operable. Loading `role="status"` / errors `role="alert"`. Info note verbatim from mockup.

**Commit:** `0c9054b`

---

## C11 — Account (`account/`)

**Files:**
- `apps/web/app/dashboard/account/page.tsx` (RSC, replaced old file)
- `apps/web/app/dashboard/account/_AccountClient.tsx` (client, new)

**APIs wired:**
- `GET/POST /api/org` → org name + caller role; POST saves org name (owner/admin)
- `GET/POST /api/team` → roster + pending invites; POST creates invite with one-time token
- `GET/POST/DELETE /api/org/api-keys` → list / create (one-time secret) / revoke
- `/api/team/accept` route exists; invite link constructs URL pointing to `/accept-invite?token=…`

**Real data replacing mock literals:**
- `"Waves MVMNT"` org name → `orgData.org.name`
- `"Vikram K."` / `"Dev (freelance)"` team rows → real `data.team[]` from API
- `"WM"` / `"VK"` / `"D"` avatars → derived `initials(m.email)`
- Role pills → real `m.role` from API

**Honesty:** Invite token shown once via `CopyField` with clear "shown only once" note. API key secret shown once with same treatment. Role-gating enforced via `canManageTeam(role)`. Old account page (Tailwind-based, AccountForm component) replaced by v7-styled RSC + client.

**Commit:** `a8af2d1`

---

## C12 — Partners (`partners/`)

**Files:**
- `apps/web/app/dashboard/partners/page.tsx` (RSC)
- `apps/web/app/dashboard/partners/_PartnersClient.tsx` (client)

**APIs wired:**
- `GET /api/partner` → real partner state; `null` → pitch, non-null → dashboard
- `POST /api/partner/enroll` → role-gated, idempotent enrollment
- `GET/PATCH /api/partner/white-label` → cosmetic branding

**Real data replacing mock literals:**
- `"14"` client accounts → `data.summary?.clientCount ?? data.clients?.length`
- `"39"` agents managed → `data.summary?.agentsManaged ?? 0`
- `"$6.2k"` revenue → **NEVER rendered**; always `$0` with honest note (`"Available once billing/Stripe is live"`)
- White-label form → real `PATCH /api/partner/white-label` (server validates URL/color/email)

**Honesty:** Revenue is `(monthlyRevenueCents / 100).toLocaleString()` from API. Until Stripe is live this will be `$0` with the honest note. White-label only shows the form when `partner.whiteLabelEnabled` — otherwise shows a "contact us" note. Partner pitch view shows the benefits grid + real enroll button.

**Commit:** `edd67fd`

---

## CI Result

```
✓ shared mirror already in sync
✓ typecheck: @makoya/web (0 errors), @makoya/widget (0 errors)
✓ tests: 71 test files, 593 passed, 6 skipped (RLS integration — intentional)
✓ widget tests: 59 passed, 0 failed
```

**One fix required during build:** TypeScript error in `_BillingClient.tsx` — `window as Record<string, unknown>` needed `window as unknown as Record<string, unknown>` for safe double-cast. Fixed before final CI run.

---

## Concerns / Notes

1. **Notifications PATCH:** The settings API accepts `notificationPrefs` in the body — this is supported by `lib/site-settings.ts` and the Zod schema. If the server rejects it (missing Zod field), the client shows a generic error. No breaking change.

2. **Account page replacement:** The old `account/page.tsx` used `AccountForm` and `SignOutButton` components from `/components/`. These are no longer rendered on this page. The components still exist and are used elsewhere; no deletion needed.

3. **Config PATCH route:** The `_SettingsClient` advanced tab sends a partial PATCH to `/api/sites/[siteId]/config`. The config route accepts partial updates. The `mobileEnabled` field is read but not exposed in the Advanced tab form (it's in the Customize screen) — this is correct per the mockup layout.

4. **White-label URL validation:** The server-side PATCH for white-label validates logo URL must be `https://` — the client shows a 400 error with the verbatim hint from v3 Dashboard.tsx. No SSRF surface from client.

5. **Stripe / billing entitlement:** As documented in STATUS.md, `trialing` must NOT grant paid features. The billing screen correctly labels it as "Trial active" and the spec comment + STATUS note both enforce this.
