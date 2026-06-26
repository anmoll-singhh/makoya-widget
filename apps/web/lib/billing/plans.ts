/**
 * lib/billing/plans.ts — the TYPED v3.1 plan catalog.
 *
 * This constant is the SINGLE source the pricing cards (and any plan-aware UI)
 * map over. Every number here is transcribed EXACTLY from
 * docs/PRICING-STRATEGY-V3.1.md — names, taglines, prices, limits, the one
 * highlighted tier (Growth), CTA labels, the 4–6 feature bullets per tier, and
 * the three high-margin add-ons. `lib/billing/plans.test.ts` guards its
 * integrity so a drift from the doc breaks CI.
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

/** One feature bullet rendered on a plan card. */
export interface PlanFeature {
  text: string;
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

const f = (text: string): PlanFeature => ({ text });

export const PLAN_CATALOG: PlanCatalog = {
  defaultPeriod: "yearly",
  yearlySavingHeadline: 30,
  currency: "USD",
  plans: [
    {
      slug: "free",
      name: "Free",
      tagline: "Try the widget and see your accessibility score.",
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
        f("Monitoring and score-drop alerts"),
        f("Statement generator"),
        f("1 site, email support"),
      ],
    },
    {
      slug: "growth",
      name: "Growth",
      tagline: "SMB and e-commerce needing the full proof-of-effort pack.",
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
        f("VPAT/ACR (1 per year)"),
        f("Remove branding, 3 seats + roles"),
        f("Daily scans, priority support"),
      ],
    },
    {
      slug: "scale",
      name: "Scale",
      tagline: "High-traffic and multi-property teams that need priority support.",
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
        f("Unlimited VPAT"),
        f("10 seats + roles"),
        f("Full API, 24-month retention"),
        f("Partner-eligible, white-label add-on"),
        f("Priority + chat support"),
      ],
    },
    {
      slug: "enterprise",
      name: "Enterprise",
      tagline: "Regulated and procurement: VPAT, SSO, SLA, white-glove.",
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
