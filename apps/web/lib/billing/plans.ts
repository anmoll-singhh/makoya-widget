/**
 * lib/billing/plans.ts — the TYPED v3.1 plan catalog.
 *
 * This constant is the SINGLE source the pricing cards (and any plan-aware UI)
 * map over. Every number here is transcribed EXACTLY from
 * docs/PRICING-STRATEGY-V3.1.md — names, taglines, prices, limits, the one
 * highlighted tier (Growth), CTA labels, the feature comparison matrix per tier,
 * and the three high-margin add-ons. `lib/billing/plans.test.ts` guards its
 * integrity so a drift from the doc breaks CI.
 *
 * Each plan's `features` array is the CANONICAL feature comparison matrix.
 * `included: true` items appear with a green check on the card; `included: false`
 * items appear muted with a dash to signal the upgrade trigger — without hiding
 * what the buyer is missing. The billing client renders directly from this array;
 * NEVER hard-code the matrix in the component.
 *
 * Slugs are the v3.1 catalog set (`free|starter|growth|scale|enterprise`),
 * deliberately DECOUPLED from the legacy `sites.plan` values (`free|pro|managed`)
 * the live admin still uses. The legacy→catalog adapter lives in `lib/billing.ts`
 * (`legacyToCatalogSlug`); the full slug cutover is a later step.
 *
 * Prices are whole US dollars (the cards render "$X/yr"); the cents the DB stores
 * live in `plan_quotas` / `lib/billing.ts`. Enterprise prices are `null` = custom.
 *
 * Compliance guardrail: cards sell tools / monitoring / audits / proof-of-effort
 * — never "compliance" or "guaranteed accessible." The footnote spells out that
 * plans do NOT by themselves make a site legally compliant.
 */

/** The final v3.1 catalog slugs (decoupled from legacy sites.plan). */
export type PlanSlug = "free" | "starter" | "growth" | "scale" | "enterprise";

/** Billing cadence. Yearly is the default (≈8× monthly, ~26–30% saving). */
export type BillingPeriod = "monthly" | "yearly";

/**
 * One row in the per-plan feature comparison matrix.
 * `included: true`  → green check, full-opacity text  (this tier has it).
 * `included: false` → muted dash, reduced-opacity text (upgrade to get it).
 *
 * The billing card renders ALL rows so a buyer can see both what they get
 * and what they would gain by upgrading — without hunting across columns.
 */
export interface PlanFeature {
  text: string;
  included: boolean;
}

/** A high-margin service sold per-quote / fixed — NOT a subscription tier. */
export interface AddOn {
  slug: string;
  name: string;
  /** How it is priced/scoped (e.g. "per-quote, scoped from open issues"). */
  model: string;
  /** Public price anchor (e.g. "from ~$1,500/engagement"). */
  anchor: string;
}

/** A subscription tier the cards render. */
export interface Plan {
  slug: PlanSlug;
  name: string;
  tagline: string;
  /** WHO this plan is for — a one-line audience descriptor shown on the card so a
   *  buyer can self-select ("Best for …"). */
  bestFor: string;
  /** WHY to pick this plan — 2–3 short, concrete reasons rendered as bullets
   *  under the price. Plain-language, never a compliance/guarantee claim. */
  whyBuy: string[];
  /** Whole USD. 0 for Free; null for Enterprise (custom/contact-sales). */
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  currency: string;
  /** Approx % saved on yearly vs 12×monthly. null where N/A (free/enterprise). */
  yearlySavingPct: number | null;
  /** null = unlimited. */
  visitLimit: number | null;
  siteLimit: number | null;
  seats: number | null;
  /** Exactly one plan (Growth) is highlighted as "Most popular". */
  highlighted: boolean;
  badge: string | null;
  ctaLabel: string;
  features: PlanFeature[];
}

/** The whole catalog the pricing screen consumes. */
export interface PlanCatalog {
  plans: Plan[];
  addOns: AddOn[];
  defaultPeriod: BillingPeriod;
  /** The marketing "save up to N%" headline number. */
  yearlySavingHeadline: number;
  currency: string;
  footnote: string;
}

/** Shorthand: feature IS included in this tier. */
const f = (text: string): PlanFeature => ({ text, included: true });
/** Shorthand: feature is NOT in this tier (shown muted — upgrade trigger). */
const x = (text: string): PlanFeature => ({ text, included: false });

export const PLAN_CATALOG: PlanCatalog = {
  defaultPeriod: "yearly",
  yearlySavingHeadline: 30,
  currency: "USD",
  plans: [
    {
      slug: "free",
      name: "Free",
      tagline: "Try the widget and see your accessibility score.",
      bestFor: "Curious owners trying Makoya on one small site before paying.",
      whyBuy: [
        "Drop the widget on one site at no cost",
        "See your accessibility score and top 3 issues",
        "No card required — upgrade only when you're ready",
      ],
      monthlyPrice: 0,
      yearlyPrice: 0,
      currency: "USD",
      yearlySavingPct: null,
      visitLimit: 1000,
      siteLimit: 1,
      seats: 1,
      highlighted: false,
      badge: null,
      ctaLabel: "Start free",
      features: [
        // Free is a try-before-you-buy funnel entry. No "not included" rows here —
        // upgrade-trigger gaps are surfaced on the paid plan cards instead.
        f("Widget + your accessibility score"),
        f("1 scan per month"),
        f("View your top 3 issues"),
        f("1 site, 1 seat"),
      ],
    },
    {
      slug: "starter",
      name: "Starter",
      tagline: "Solo and small sites: the widget plus a monthly auto-audit.",
      bestFor: "Freelancers, blogs and single small-business sites that want ongoing monitoring.",
      whyBuy: [
        "Full widget — 15 tools, 9 profiles, 4 languages",
        "Weekly scans + Mike's monthly audit, with score-drop alerts",
        "Publish an accessibility statement to show you're acting",
      ],
      monthlyPrice: 45,
      yearlyPrice: 390,
      currency: "USD",
      yearlySavingPct: 28,
      visitLimit: 5000,
      siteLimit: 1,
      seats: 1,
      highlighted: false,
      badge: null,
      ctaLabel: "Choose Starter",
      features: [
        f("Widget — 15 tools, 9 profiles, 4 languages"),
        f("Weekly scans + Mike's monthly audit"),
        f("Monitoring & score-drop alerts"),
        f("Statement generator"),
        f("1 site, 1 seat, email support"),
        // Upgrade triggers — surfaced so buyers know what Growth adds:
        x("Proof-of-effort pack"),
        x("Remove branding, multiple sites & seats"),
        x("VPAT / ACR"),
      ],
    },
    {
      slug: "growth",
      name: "Growth",
      tagline: "SMB and e-commerce needing the full proof-of-effort pack.",
      bestFor: "Growing businesses and online stores that need documented proof of their accessibility work.",
      whyBuy: [
        "Everything in Starter across up to 3 sites",
        "Proof-of-effort pack + WCAG-mapped remediation log",
        "Self-generated VPAT/ACR (1/yr) and your own branding",
      ],
      monthlyPrice: 169,
      yearlyPrice: 1490,
      currency: "USD",
      yearlySavingPct: 26,
      visitLimit: 30000,
      siteLimit: 3,
      seats: 3,
      highlighted: true,
      badge: "Most popular",
      ctaLabel: "Choose Growth",
      features: [
        f("Everything in Starter, for 3 sites"),
        f("Proof-of-effort pack"),
        f("Remediation log (WCAG-mapped)"),
        f("VPAT / ACR (1 per year)"),
        f("Remove branding, 3 seats + roles"),
        f("Daily scans, read-only API"),
        // Upgrade triggers — surfaced so buyers see what Scale adds:
        x("Full API & 24-month analytics"),
        x("White-label & SSO / SAML"),
      ],
    },
    {
      slug: "scale",
      name: "Scale",
      tagline: "High-traffic and multi-property teams that need priority support.",
      bestFor: "Agencies and multi-property teams managing many high-traffic sites.",
      whyBuy: [
        "Everything in Growth across up to 10 sites, 10 seats + roles",
        "Unlimited VPAT/ACR, full API and 24-month analytics",
        "Priority + chat support, partner-eligible, white-label add-on",
      ],
      monthlyPrice: 440,
      yearlyPrice: 3900,
      currency: "USD",
      yearlySavingPct: 26,
      visitLimit: 100000,
      siteLimit: 10,
      seats: 10,
      highlighted: false,
      badge: null,
      ctaLabel: "Choose Scale",
      features: [
        f("Everything in Growth, for 10 sites"),
        f("Unlimited VPAT / ACR"),
        f("10 seats + roles, full API"),
        f("24-month analytics, partner-eligible"),
        f("White-label (add-on)"),
        f("Priority + chat support"),
        // Upgrade trigger — surfaced so buyers see what Enterprise adds:
        x("SSO / SAML + dedicated CSM & SLA"),
      ],
    },
    {
      slug: "enterprise",
      name: "Enterprise",
      tagline: "Regulated and procurement: VPAT, SSO, SLA, white-glove.",
      bestFor: "Regulated organisations and procurement teams needing SSO, SLAs and reviewed VPATs.",
      whyBuy: [
        "Unlimited sites and seats with SSO / SAML",
        "Custom audit cadence + expert-reviewed VPATs",
        "Dedicated CSM, SLA and white-label included",
      ],
      monthlyPrice: null,
      yearlyPrice: null,
      currency: "USD",
      yearlySavingPct: null,
      visitLimit: null,
      siteLimit: null,
      seats: null,
      highlighted: false,
      badge: null,
      ctaLabel: "Contact sales",
      features: [
        f("Unlimited sites and seats"),
        f("SSO / SAML"),
        f("Custom audit cadence + reviewed VPATs"),
        f("White-label included"),
        f("Dedicated CSM + SLA"),
      ],
    },
  ],
  addOns: [
    {
      slug: "human-remediation",
      name: "Human remediation",
      model: "Per-quote, scoped from your open issues; member rate.",
      anchor: "from ~$1,500/engagement or ~$120/issue-hr",
    },
    {
      slug: "expert-manual-audit",
      name: "Expert manual audit",
      model: "Fixed by scope, annual cadence.",
      anchor: "~$2,500 single-template / $5,000+ full-site",
    },
    {
      slug: "vpat-acr",
      name: "VPAT/ACR",
      model: "Self-generated included (Growth 1/yr, Scale+ unlimited); expert-reviewed is an add-on.",
      anchor: "~$1,500 reviewed",
    },
  ],
  footnote:
    "Plans cover the widget, monitoring, and Mike's automated audits — tools to find, track, and document accessibility work. They do not by themselves make a site legally compliant. Human remediation and expert manual audits are separate services — request a quote.",
};
