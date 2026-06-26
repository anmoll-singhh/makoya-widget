# feat-plan-matrix — Per-plan feature comparison matrix

## What was built

Added a visible feature comparison matrix to each Billing plan card on
`app/dashboard/[siteId]/billing/_BillingClient.tsx`.

Each card now shows which capabilities it includes (green check) and which
are available only on higher tiers (muted dash) — so buyers can compare plans
without leaving the screen.

## Source of truth

`apps/web/lib/billing/plans.ts` — `PLAN_CATALOG` is the single source.  
`PlanFeature.included: boolean` (new field) drives the check/dash rendering.  
The billing API (`/api/sites/[id]/billing`) returns `catalog: PLAN_CATALOG`
verbatim, so `included` flows through automatically.

## Feature matrix per tier (from docs/PRICING-STRATEGY-V3.1.md)

### Starter ($390/yr, 5k visits/mo, 1 site, 1 seat)
| Feature | Included |
|---|---|
| Widget — 15 tools, 9 profiles, 4 languages | ✓ |
| Weekly scans + Mike's monthly audit | ✓ |
| Monitoring & score-drop alerts | ✓ |
| Statement generator | ✓ |
| 1 site, 1 seat, email support | ✓ |
| Proof-of-effort pack | — |
| Remove branding, multiple sites & seats | — |
| VPAT / ACR | — |

### Growth ($1,490/yr, 30k visits/mo, 3 sites, 3 seats) — Most popular
| Feature | Included |
|---|---|
| Everything in Starter, for 3 sites | ✓ |
| Proof-of-effort pack | ✓ |
| Remediation log (WCAG-mapped) | ✓ |
| VPAT / ACR (1 per year) | ✓ |
| Remove branding, 3 seats + roles | ✓ |
| Daily scans, read-only API | ✓ |
| Full API & 24-month analytics | — |
| White-label & SSO / SAML | — |

### Scale ($3,900/yr, 100k visits/mo, 10 sites, 10 seats)
| Feature | Included |
|---|---|
| Everything in Growth, for 10 sites | ✓ |
| Unlimited VPAT / ACR | ✓ |
| 10 seats + roles, full API | ✓ |
| 24-month analytics, partner-eligible | ✓ |
| White-label (add-on) | ✓ |
| Priority + chat support | ✓ |
| SSO / SAML + dedicated CSM & SLA | — |

### Enterprise (Custom, unlimited sites/seats)
| Feature | Included |
|---|---|
| Unlimited sites and seats | ✓ |
| SSO / SAML | ✓ |
| Custom audit cadence + reviewed VPATs | ✓ |
| White-label included | ✓ |
| Dedicated CSM + SLA | ✓ |

## How it renders

`PlanFeatureList` sub-component in `_BillingClient.tsx`:
- Splits features into `included` and `notIncluded` arrays.
- Renders included items first with `ti ti-check` (color `--green-ink`).
- Renders a thin `--border` divider rule between the two groups.
- Renders not-included items with `ti ti-minus` (color `--t3`, muted).
- Text: `--t1` (dark) for included, `--t3` for not-included.
- Font: 13px / weight 500 — above the 12.5px/500 readability floor.
- The feature list sits between the visit-limit line and the CTA button.
- `marginTop: auto` on the CTA container keeps the button flush to the card bottom.

## Test update

`apps/web/lib/billing/plans.test.ts` — relaxed feature count upper bound from 6
to 10 (to allow upgrade-trigger "not included" rows) and added a type assertion
that `typeof f.included === "boolean"` on every feature.

## Files changed

- `apps/web/lib/billing/plans.ts` — `PlanFeature.included` field + expanded
  features arrays for Starter (8), Growth (8), Scale (7), Enterprise (5).
- `apps/web/lib/billing/plans.test.ts` — updated count bounds + included check.
- `apps/web/app/dashboard/[siteId]/billing/_BillingClient.tsx` — local `Plan`
  type updated; `PlanFeatureList` component added; feature list rendered in cards.
