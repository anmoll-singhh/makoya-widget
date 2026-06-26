# Makoya — Pricing Strategy & Plan Catalog (v3.1)

> Produced by a pricing/packaging strategist agent (block 23). Implementation-ready spec the v3.1 pricing screen renders and the billing scaffold encodes. **Compliance guardrail:** cards sell tools / monitoring / audits / proof-of-effort — never "compliance" or "guaranteed accessible."

## Strategic frame
Makoya sells **proof of effort + ongoing monitoring**, not compliance. The widget is the cheap always-on floor; Mike's automated audits + the evidence trail are the recurring value; human remediation + expert audits are the high-margin services layer. So: the **widget gets you in cheap**, the **proof-of-effort pack is the upgrade trigger** (what buyers need when a demand letter lands), and **multi-site/agency is the expansion engine**. Quota dimension = **monthly visits**.

## Plan catalog (Free → Starter → Growth★ → Scale → Enterprise)

| Tier | Monthly | Yearly | Save | Visits/mo | Sites | Seats | Who |
|---|---|---|---|---|---|---|---|
| **Free** | $0 | $0 | — | 1,000 | 1 | 1 | Try the widget + see your score (funnel). |
| **Starter** | $45 | $390 | ~28% | 5,000 | 1 | 1 | Solo / small sites: widget + monthly auto-audit. |
| **Growth** ★ | $169 | $1,490 | ~26% | 30,000 | 3 | 3 | SMB/e-com needing the full proof-of-effort pack. **Most popular.** |
| **Scale** | $440 | $3,900 | ~26% | 100,000 | 10 | 10 | High-traffic / multi-property + team + priority. |
| **Enterprise** | Custom | Custom | — | 100k+ | ∞ | ∞ | Regulated/procurement: VPAT, SSO, SLA, white-glove. |

Marketing line: "**save up to 30%**" on yearly (per-plan toggle shows exact yearly number). Yearly ≈ 8× monthly. Free renders as a text link under the 4-card grid, not a card. **Growth is the highlighted "Most popular"** (Scale is the decoy that makes Growth read as correct).

## Feature matrix (gating = upgrade triggers)
Entry tiers stay genuinely useful; the paywall is the **proof/evidence layer**, not basic tooling.
- **Free:** widget + score only, 1 scan/mo, view top-3 issues. No Mike, no statement, no pack.
- **Starter:** widget + customization, weekly scans, **Mike monthly audit**, monitoring + score-drop alerts, **statement generator**. (No remediation log, no proof pack, no branding removal.)
- **Growth ★:** + 3 sites, **proof-of-effort pack**, **remediation log**, **VPAT/ACR (1/yr)**, remove branding, 3 seats + roles, daily scans, 90-day analytics, read-only API.
- **Scale:** + 10 sites, unlimited VPAT, 10 seats, full API, 24-mo analytics, **partner-program eligible**, white-label (add-on), priority+chat.
- **Enterprise:** unlimited sites/seats, SSO/SAML, custom audit cadence + reviewed VPATs, white-label included, dedicated CSM + SLA.

Primary monetization wall = **Starter → Growth** (proof pack + remediation log + branding removal + seats).

## Card copy (guardrail-safe)
Billing toggle (default **Yearly**): `[ Yearly · save up to 30% ] [ Monthly ]`. Yearly shows `/yr` + "≈ $X/mo billed yearly"; Monthly shows `/mo`. "Most popular" badge on Growth.
- **Starter** — $390/yr · up to 5,000 visits/mo · bullets: widget (15 tools/9 profiles/4 langs) · weekly scans + Mike's monthly audit · monitoring & drop alerts · statement generator · 1 site, email support · CTA **Choose Starter**
- **Growth ★** — $1,490/yr · up to 30,000 visits/mo · bullets: everything in Starter for **3 sites** · **proof-of-effort pack** · remediation log (WCAG-mapped) · **VPAT/ACR (1/yr)** · remove branding, 3 seats + roles · daily scans, priority support · CTA **Choose Growth**
- **Scale** — $3,900/yr · up to 100,000 visits/mo · bullets: everything in Growth for **10 sites** · unlimited VPAT · 10 seats + roles · full API, 24-mo retention · partner-eligible, white-label add-on · priority + chat · CTA **Choose Scale**
- **Enterprise** — Custom · 100k+ visits, unlimited sites · bullets: unlimited sites/seats · SSO/SAML · custom cadence + reviewed VPATs · white-label included · dedicated CSM + SLA · CTA **Contact sales**

**Footnote (keep mockup wording):** Plans cover the widget, monitoring, and Mike's automated audits — tools to find, track, and document accessibility work. They do not by themselves make a site legally compliant. **Human remediation** and **expert manual audits** are separate services — **request a quote**.

## Add-on services (high-margin, quote/fixed — NOT tiers)
| Service | Model | Anchor |
|---|---|---|
| **Human remediation** | per-quote, scoped from open issues; member rate | from ~$1,500/engagement or ~$120/issue-hr |
| **Expert manual audit** | fixed by scope, annual cadence | ~$2,500 single-template / $5,000+ full-site |
| **VPAT/ACR** | self-gen included (Growth 1/yr, Scale+ ∞); expert-reviewed = add-on | ~$1,500 reviewed |

## Backend encoding spec
**Slugs (final, decoupled from display names):** `free | starter | growth | scale | enterprise`.
**Migration map from current `sites.plan` (`free|pro|managed`):** `free→free`, `pro→growth`, `managed→scale`; add `starter`,`enterprise`. Additive first (add values + backfill), retire `pro`/`managed` in a later cleanup once code is updated.

`plan_quotas` table (enforcement + Stripe wiring):
```
slug PK, visit_limit int (null=∞), site_limit int (null=∞), seat_limit int (null=∞),
vpat_per_year int (null=∞), stripe_price_id_monthly text, stripe_price_id_yearly text, updated_at
seed: free(1000,1,1,0) starter(5000,1,1,0) growth(30000,3,3,1) scale(100000,10,10,null) enterprise(null,null,null,null)
```
Typed `PlanCatalog`/`Plan`/`PlanFeature`/`AddOn` constant is the single source the cards map over (fields: slug, name, tagline, monthlyPrice, yearlyPrice, currency, yearlySavingPct, visitLimit, siteLimit, seats, highlighted, badge, ctaLabel, features[]). `defaultPeriod='yearly'`, `yearlySavingHeadline=30`. Quota enforcement is **server-side only**; visit counts come from `widget_heartbeats`/`widget_event_daily`; over-quota → soft warn + upgrade prompt, **never** a hard widget kill (widget rule #1: always render).

## Rationale
Enterprise (Custom) anchors the ceiling; Scale is the decoy that makes Growth the obvious SMB choice — and Growth is where the proof pack/VPAT/branding/seats first appear, i.e. exactly the bundle a buyer facing a demand letter or B2B procurement needs. Generous ~26–30% annual discount pulls cash forward and cuts churn on an "ongoing proof" product. Expansion comes from three vectors that don't require re-pricing the core: more sites/seats, the always-separate remediation/audit services, and partner/white-label at Scale+. SMB entry stays honest because Free is real and Starter genuinely delivers widget + Mike + statement — the wall is the evidence layer, not the tooling.
