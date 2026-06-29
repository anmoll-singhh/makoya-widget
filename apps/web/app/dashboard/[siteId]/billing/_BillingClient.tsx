"use client";
/**
 * app/dashboard/[siteId]/billing/_BillingClient.tsx — v7 Plan & billing (CLIENT).
 *
 * Wired to:
 *   GET  /api/sites/[siteId]/billing         → { subscription, quota, usage, catalog }
 *   POST /api/sites/[siteId]/billing/checkout → { ok, subscription, paymentPending }
 *
 * HARD RULES (plan § C9 + global constraints):
 *   - "Renews Jun 30, 2026" → data.subscription.renewsAt (real; shown only if non-null)
 *   - "$1,490/yr Growth"    → data.subscription.planSlug + real catalog price
 *   - Current plan badge    → data.subscription.planSlug === p.slug (from API)
 *   - Plan prices           → data.catalog.plans[].yearlyPrice / monthlyPrice (real)
 *   - Visit limit text      → data.catalog.plans[].visitLimit (real)
 *   - Feature matrix        → data.catalog.plans[].features (real; included boolean per row)
 *   - Invoices              → HONEST EMPTY STATE only — never fake "Paid" rows
 *   - PostHog               → plan_buy_now event fired on successful checkout
 *
 * ENTITLEMENT CONTRACT:
 *   trialing = "selected, awaiting payment" (no paid features unlocked)
 *   active   = real paid subscription (webhook-confirmed)
 *   The "current plan" card label shows whichever matches the real status.
 *   A trialing subscription IS shown as the current plan visually — the entitlement
 *   for feature access elsewhere in the product is separately gated on 'active'.
 *
 * FEATURE MATRIX:
 *   Each plan card renders the per-plan feature list from PLAN_CATALOG.features[].
 *   `included: true`  → green check + full-weight text (you have this).
 *   `included: false` → muted dash + lighter text (upgrade to unlock).
 *   Source of truth is lib/billing/plans.ts — NEVER hard-code the matrix here.
 */

import { useState, useEffect, useCallback } from "react";
import { LoadingButton } from "../../_components";

/* ── API shapes (client-local; mirrors lib/billing.ts + lib/billing/plans.ts) ──── */
interface Plan {
  slug: string;
  name: string;
  tagline: string;
  /** WHO the plan is for (rendered as "Best for …"). */
  bestFor: string;
  /** WHY to pick it — short reasons rendered as bullets. */
  whyBuy: string[];
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  visitLimit: number | null;
  highlighted: boolean;
  badge: string | null;
  ctaLabel: string;
  /**
   * Feature comparison matrix from PLAN_CATALOG. `included: true` = green check;
   * `included: false` = muted dash (upgrade trigger). Rendered in catalog order.
   */
  features: { text: string; included: boolean }[];
}
interface BillingData {
  subscription: {
    planSlug: string;
    period: string;
    status: string;
    renewsAt: string | null;
  };
  quota: { slug: string; visitLimit: number | null } | null;
  usage: {
    used: number;
    limit: number | null;
    exceeded: boolean;
    unlimited: boolean;
  } | null;
  catalog: {
    plans: Plan[];
    defaultPeriod: string;
    yearlySavingHeadline: number;
    footnote: string;
  };
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function num(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString() : "—";
}
function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Fire PostHog event when available — fail-silent. */
function firePlanBuyNow(slug: string, period: string) {
  try {
    // PostHog is loaded client-side if NEXT_PUBLIC_POSTHOG_KEY is set
    const w = window as unknown as Record<string, unknown>;
    const ph = w["posthog"] as
      | { capture?: (event: string, props?: Record<string, unknown>) => void }
      | undefined;
    ph?.capture?.("plan_buy_now", { planSlug: slug, period });
  } catch {
    // Fail silently — telemetry never breaks the UI
  }
}

/* ── Feature list sub-component ─────────────────────────────────────────────── */
/**
 * Renders the per-plan feature comparison matrix.
 * Included items: green check icon + dark readable text.
 * Not-included items: muted dash icon + lighter text (signals the upgrade gap).
 *
 * Readability guardrail: font-size ≥ 12.5px, weight ≥ 500. No tiny light-gray text.
 */
function PlanFeatureList({ features }: { features: Plan["features"] }) {
  // Split into included/not-included so included items always come first
  const included = features.filter((f) => f.included);
  const notIncluded = features.filter((f) => !f.included);

  return (
    <ul
      aria-label="Plan features"
      style={{
        listStyle: "none",
        margin: "12px 0 16px",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      {included.map((feat, i) => (
        <li
          key={`inc-${i}`}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <i
            className="ti ti-check"
            aria-hidden="true"
            style={{
              fontSize: 15,
              flexShrink: 0,
              marginTop: 1,
              color: "var(--green-ink)",
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--t1)",
              lineHeight: 1.4,
            }}
          >
            {feat.text}
          </span>
        </li>
      ))}
      {notIncluded.length > 0 && (
        <>
          {/* Visual separator between included and upgrade-trigger rows */}
          <li
            aria-hidden="true"
            style={{
              height: 1,
              background: "var(--border)",
              margin: "4px 0",
              listStyle: "none",
            }}
          />
          {notIncluded.map((feat, i) => (
            <li
              key={`exc-${i}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <i
                className="ti ti-minus"
                aria-hidden="true"
                style={{
                  fontSize: 15,
                  flexShrink: 0,
                  marginTop: 1,
                  color: "var(--t3)",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--t3)",
                  lineHeight: 1.4,
                }}
              >
                {feat.text}
              </span>
            </li>
          ))}
        </>
      )}
    </ul>
  );
}

/* ── Props ─────────────────────────────────────────────────────────────────────── */
interface Props {
  siteId: string;
}

/* ── Main ─────────────────────────────────────────────────────────────────────── */
export function BillingClient({ siteId }: Props) {
  const base = `/api/sites/${siteId}`;
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<"yearly" | "monthly">("yearly");
  // `busy` holds the slug whose checkout POST is in flight
  const [busy, setBusy] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    let live = true;
    setLoading(true);
    setError(false);
    fetch(`${base}/billing`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<BillingData>) : Promise.reject(r.status)))
      .then((d) => {
        if (live) {
          setData(d);
          setLoading(false);
          // M-5: initialise period toggle from the real subscription period (fall back
          // to catalog default then "yearly" so the toggle is never stale on reload).
          const sub = d?.subscription?.period;
          if (sub === "monthly" || sub === "yearly") {
            setPeriod(sub);
          } else {
            const def = d?.catalog?.defaultPeriod;
            setPeriod(def === "monthly" ? "monthly" : "yearly");
          }
        }
      })
      .catch(() => {
        if (live) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <>
        <div className="pagehead">
          Account <b>Plan &amp; billing</b>
        </div>
        <div
          role="status"
          aria-live="polite"
          style={{ padding: "40px 0", color: "var(--t3)", textAlign: "center" }}
        >
          Loading billing…
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="pagehead">
          Account <b>Plan &amp; billing</b>
        </div>
        <div className="note warn" role="alert" style={{ marginTop: 24 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>Couldn&apos;t load billing information — please try again shortly.</div>
        </div>
      </>
    );
  }

  const currentSlug = data.subscription.planSlug;
  const currentStatus = data.subscription.status;
  const currentPlan = data.catalog.plans.find((p) => p.slug === currentSlug);
  // Current plan = slug matches AND status is active or trialing
  const isActiveCurrent = (slug: string) =>
    slug === currentSlug && (currentStatus === "active" || currentStatus === "trialing");

  async function buy(slug: string) {
    setErr(null);
    setOk(null);
    setBusy(slug);
    try {
      const res = await fetch(`${base}/billing/checkout`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug: slug, period }),
      });
      if (!res.ok) {
        setErr("Couldn't switch your plan right now — please try again shortly.");
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        paymentPending?: boolean;
      } | null;
      if (!body?.ok) {
        setErr("Couldn't switch your plan right now — please try again shortly.");
        return;
      }
      firePlanBuyNow(slug, period);
      const plan = data?.catalog.plans.find((p) => p.slug === slug);
      setOk(
        `You're on the ${plan?.name ?? slug} plan (trial). ` +
          `No charge yet — you'll be notified before any billing starts once payments are connected.`
      );
      // Reload billing data so the current plan badge updates
      load();
    } catch {
      setErr("Network error — please try again shortly.");
    } finally {
      setBusy(null);
    }
  }

  const paidPlans = data.catalog.plans.filter((p) => p.slug !== "free");

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Account <b>Plan &amp; billing</b>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          Manage your subscription, compare plans, and view invoices.
        </div>
      </div>

      {/* Current subscription info — REAL from API; never hard-coded */}
      <div className="note info" style={{ marginBottom: 18 }}>
        <i className="ti ti-calendar" aria-hidden="true" />
        <div>
          <b>{currentPlan?.name ?? currentSlug}</b>
          {currentPlan?.visitLimit != null &&
            ` (up to ${currentPlan.visitLimit.toLocaleString()} monthly visits)`}
          {data.subscription.renewsAt && (
            <>
              {" "}
              · Renews <b>{shortDate(data.subscription.renewsAt)}</b>
            </>
          )}{" "}
          · Status: <b style={{ textTransform: "capitalize" }}>{currentStatus}</b>
          {data.usage && !data.usage.unlimited && data.usage.limit != null && (
            <>
              {" "}
              · {num(data.usage.used)} / {num(data.usage.limit)} opens this month
            </>
          )}
          {data.usage?.exceeded && (
            <>
              {" "}
              — <span style={{ color: "var(--warn)" }}>over plan limit</span>
            </>
          )}
        </div>
      </div>

      {/* Payments-pending honest note */}
      <div className="note warn" style={{ marginBottom: 18 }}>
        <i className="ti ti-credit-card-off" aria-hidden="true" />
        <div>
          Payments aren&apos;t connected yet — choosing a plan activates it as a trial. You&apos;ll
          be notified before any billing starts.
        </div>
      </div>

      {/* Success / error banners */}
      {ok && (
        <div className="note good" role="status" style={{ marginBottom: 16 }}>
          <i className="ti ti-check" aria-hidden="true" />
          <div>{ok}</div>
        </div>
      )}
      {err && (
        <div className="note warn" role="alert" style={{ marginBottom: 16 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>{err}</div>
        </div>
      )}

      {/* Plan cards */}
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="ch">
          <h3>Plans</h3>
          <div className="seg">
            <button
              type="button"
              className={period === "yearly" ? "on" : ""}
              onClick={() => setPeriod("yearly")}
            >
              Yearly · save {data.catalog.yearlySavingHeadline}%
            </button>
            <button
              type="button"
              className={period === "monthly" ? "on" : ""}
              onClick={() => setPeriod("monthly")}
            >
              Monthly
            </button>
          </div>
        </div>
        <div className="cpad">
          <div className="grid4">
            {paidPlans.map((p) => {
              const price = period === "yearly" ? p.yearlyPrice : p.monthlyPrice;
              const isCurrent = isActiveCurrent(p.slug);
              const isEnterprise = p.slug === "enterprise";
              const submitting = busy === p.slug;

              return (
                <div
                  className="card"
                  key={p.slug}
                  style={{
                    margin: 0,
                    border: p.highlighted ? "2px solid var(--primary)" : undefined,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    className="cpad"
                    style={{ display: "flex", flexDirection: "column", flex: 1 }}
                  >
                    {/* Plan name + badge/status pill */}
                    <div className="between" style={{ marginBottom: 4 }}>
                      <div
                        className="tiny muted"
                        style={{
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                        }}
                      >
                        {p.name}
                      </div>
                      {isCurrent && (
                        <span className="pill green">
                          <i className="ti ti-check" aria-hidden="true" />{" "}
                          {currentStatus === "trialing" ? "Trial" : "Current plan"}
                        </span>
                      )}
                      {!isCurrent && p.badge && <span className="pill b-blue">{p.badge}</span>}
                    </div>

                    {/* Price */}
                    <div
                      style={{
                        fontFamily: "Satoshi",
                        color: "var(--deep)",
                        fontSize: 26,
                        fontWeight: 700,
                        margin: "6px 0 2px",
                      }}
                    >
                      {price == null ? (
                        "Custom"
                      ) : (
                        <>
                          ${price.toLocaleString()}
                          <span className="tiny muted" style={{ fontWeight: 500 }}>
                            {period === "yearly" ? "/yr" : "/mo"}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Visit limit */}
                    <div className="tiny muted" style={{ marginBottom: 4 }}>
                      {p.visitLimit == null
                        ? "100k+ monthly visits"
                        : `Up to ${p.visitLimit.toLocaleString()} monthly visits`}
                    </div>

                    {/* Best for — WHO should buy this plan (self-selection helper) */}
                    {p.bestFor && (
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "var(--t1)",
                          lineHeight: 1.45,
                          margin: "8px 0 0",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "var(--deep)" }}>Best for: </span>
                        {p.bestFor}
                      </div>
                    )}

                    {/* Why this plan — concrete reasons, rendered as bullets */}
                    {p.whyBuy.length > 0 && (
                      <ul
                        aria-label={`Why choose ${p.name}`}
                        style={{
                          listStyle: "none",
                          margin: "8px 0 0",
                          padding: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                        }}
                      >
                        {p.whyBuy.map((reason, i) => (
                          <li
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 7,
                              fontSize: 12.5,
                              color: "var(--t2)",
                              lineHeight: 1.4,
                            }}
                          >
                            <i
                              className="ti ti-sparkles"
                              aria-hidden="true"
                              style={{
                                fontSize: 13,
                                marginTop: 1,
                                color: "var(--primary-hover)",
                                flexShrink: 0,
                              }}
                            />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/*
                     * Feature comparison matrix.
                     * Source of truth: lib/billing/plans.ts PLAN_CATALOG.
                     * Green check = included in this tier.
                     * Muted dash  = not in this tier (upgrade trigger).
                     * Never hard-code plan features in this component.
                     */}
                    {p.features.length > 0 && <PlanFeatureList features={p.features} />}

                    {/* CTA — pushed to bottom of the card */}
                    <div style={{ marginTop: "auto" }}>
                      {isCurrent ? (
                        <button
                          className="btn"
                          type="button"
                          disabled
                          aria-disabled="true"
                          style={{ width: "100%" }}
                        >
                          {currentStatus === "trialing" ? "Trial active" : "Current"}
                        </button>
                      ) : isEnterprise ? (
                        // M-3: real mailto — no fake "thanks" confirmation
                        <a
                          className="btn"
                          href="mailto:sales@makoya.app?subject=Enterprise%20plan"
                          style={{
                            width: "100%",
                            textDecoration: "none",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <i className="ti ti-mail" aria-hidden="true" /> Contact sales
                        </a>
                      ) : (
                        <LoadingButton
                          className="btn pri"
                          type="button"
                          style={{ width: "100%" }}
                          onClick={() => buy(p.slug)}
                          loading={submitting}
                          disabled={busy !== null}
                          icon={<i className="ti ti-arrow-right" aria-hidden="true" />}
                        >
                          Buy now
                        </LoadingButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Invoices — HONEST EMPTY STATE. No fake rows ever rendered. */}
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="ch">
          <h3>Invoices</h3>
        </div>
        <div className="cpad">
          <div className="note info">
            <i className="ti ti-receipt" aria-hidden="true" />
            <div>
              Invoices appear here once billing is connected. No charges have been made yet.
            </div>
          </div>
        </div>
      </section>

      {/* Footnote from catalog */}
      {data.catalog.footnote && (
        <div className="note good">
          <i className="ti ti-info-circle" aria-hidden="true" />
          <div>{data.catalog.footnote}</div>
        </div>
      )}
    </>
  );
}
