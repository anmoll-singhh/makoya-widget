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
 *   - Invoices              → HONEST EMPTY STATE only — never fake "Paid" rows
 *   - PostHog               → plan_buy_now event fired on successful checkout
 *
 * ENTITLEMENT CONTRACT:
 *   trialing = "selected, awaiting payment" (no paid features unlocked)
 *   active   = real paid subscription (webhook-confirmed)
 *   The "current plan" card label shows whichever matches the real status.
 *   A trialing subscription IS shown as the current plan visually — the entitlement
 *   for feature access elsewhere in the product is separately gated on 'active'.
 */

import { useState, useEffect, useCallback } from "react";

/* ── API shapes (client-local; mirrors lib/billing.ts + lib/billing/plans.ts) ──── */
interface Plan {
  slug: string;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  visitLimit: number | null;
  highlighted: boolean;
  badge: string | null;
  ctaLabel: string;
  features: { text: string }[];
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
        if (live) { setData(d); setLoading(false); }
      })
      .catch(() => {
        if (live) { setError(true); setLoading(false); }
      });
    return () => { live = false; };
  }, [base]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <>
        <div className="pagehead">Account <b>Plan &amp; billing</b></div>
        <div role="status" aria-live="polite" style={{ padding: "40px 0", color: "var(--t3)", textAlign: "center" }}>
          Loading billing…
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="pagehead">Account <b>Plan &amp; billing</b></div>
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

  function contactSales() {
    setErr(null);
    setOk("Thanks — our team will reach out about an Enterprise plan.");
  }

  const paidPlans = data.catalog.plans.filter((p) => p.slug !== "free");

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Account{" "}
        <b>Plan &amp; billing</b>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          Manage your subscription, compare plans, and view invoices.
        </div>
      </div>

      {/* Current subscription info — REAL from API; never hard-coded */}
      <div className="note info" style={{ marginBottom: 18 }}>
        <i className="ti ti-calendar" aria-hidden="true" />
        <div>
          <b>
            {currentPlan?.name ?? currentSlug}
          </b>
          {currentPlan?.visitLimit != null && ` (up to ${currentPlan.visitLimit.toLocaleString()} monthly visits)`}
          {data.subscription.renewsAt && (
            <> · Renews <b>{shortDate(data.subscription.renewsAt)}</b></>
          )}
          {" "}· Status:{" "}
          <b style={{ textTransform: "capitalize" }}>{currentStatus}</b>
          {data.usage && !data.usage.unlimited && data.usage.limit != null && (
            <> · {num(data.usage.used)} / {num(data.usage.limit)} opens this month</>
          )}
          {data.usage?.exceeded && (
            <> — <span style={{ color: "var(--warn)" }}>over plan limit</span></>
          )}
        </div>
      </div>

      {/* Payments-pending honest note */}
      <div className="note warn" style={{ marginBottom: 18 }}>
        <i className="ti ti-credit-card-off" aria-hidden="true" />
        <div>
          Payments aren&apos;t connected yet — choosing a plan activates it as a trial.
          You&apos;ll be notified before any billing starts.
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
                    border: p.highlighted
                      ? "2px solid var(--primary)"
                      : undefined,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div className="cpad" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
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
                      {!isCurrent && p.badge && (
                        <span className="pill b-blue">{p.badge}</span>
                      )}
                    </div>
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
                    <div className="tiny muted" style={{ marginBottom: 14 }}>
                      {p.visitLimit == null
                        ? "100k+ monthly visits"
                        : `Up to ${p.visitLimit.toLocaleString()} monthly visits`}
                    </div>
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
                        <button
                          className="btn"
                          type="button"
                          style={{ width: "100%" }}
                          onClick={contactSales}
                        >
                          <i className="ti ti-mail" aria-hidden="true" /> Contact
                        </button>
                      ) : (
                        <button
                          className="btn pri"
                          type="button"
                          style={{ width: "100%" }}
                          onClick={() => buy(p.slug)}
                          disabled={busy !== null}
                          aria-busy={submitting}
                        >
                          <i className="ti ti-arrow-right" aria-hidden="true" />{" "}
                          {submitting ? "Activating…" : "Buy now"}
                        </button>
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
