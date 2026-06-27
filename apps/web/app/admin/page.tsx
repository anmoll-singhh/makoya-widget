/**
 * app/admin/page.tsx — Admin CRM home: customer list
 *
 * v7 restyle: uses v7 CSS classes (.mcard, .tcard, .thead, .trow, .pill, .btn.pri)
 * from the shared dashboard token layer. All data-fetching, auth gating,
 * worst-score-first sorting, plan-change, and navigation are unchanged.
 *
 * Functionality preserved byte-for-byte:
 *   - getAdminUser() gates access (redirects non-admins to /dashboard)
 *   - listAdminSites() fetches the customer table (worst score first from DB)
 *   - openTotal, avg, stats derivations are identical
 *   - AddCustomerForm creates users + sites via POST /api/admin/customers
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { listAdminSites } from "@/lib/admin";
import { AddCustomerForm } from "@/components/admin/AddCustomerForm";
import { PageTransition, RevealItem } from "@/components/motion/PageTransition";
import { MotionTable, MotionRow } from "@/components/admin/MotionTable";

/** Map a nullable score to a v7 pill tone class. */
function scoreTone(score: number | null): string {
  if (score === null) return "gray";
  if (score >= 80) return "green";
  if (score >= 60) return "med";
  return "high";
}

export default async function AdminHome() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const sites = await listAdminSites();

  const openTotal = sites.reduce((n, s) => n + s.openRequests, 0);
  const scored = sites.filter((s) => s.lastScanScore !== null);
  const avg = scored.length
    ? Math.round(scored.reduce((n, s) => n + (s.lastScanScore ?? 0), 0) / scored.length)
    : null;

  const stats = [
    { label: "Customers", value: sites.length, icon: "ti ti-building-store" },
    { label: "Open requests", value: openTotal, icon: "ti ti-message-dots", accent: openTotal > 0 },
    { label: "Avg. score", value: avg ?? "—", icon: "ti ti-gauge" },
  ];

  return (
    // Whole-screen entrance + staggered cascade of the major blocks.
    // PageTransition/RevealItem self-disable under prefers-reduced-motion.
    <PageTransition stagger={0.08}>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <RevealItem>
        <div className="between" style={{ marginBottom: "22px" }}>
          <div className="pagehead" style={{ marginBottom: 0 }}>
            Admin CRM
            <b>Customers</b>
          </div>
          <Link href="/admin/requests" className="btn pri">
            <i className="ti ti-message-dots" aria-hidden="true" />
            Requests inbox
            {openTotal > 0 && (
              <span
                className="pill high"
                style={{ marginLeft: "2px", padding: "2px 7px", fontSize: "11px" }}
                aria-label={`${openTotal} open`}
              >
                {openTotal}
              </span>
            )}
          </Link>
        </div>
      </RevealItem>

      {/* ── Onboard a new customer ───────────────────────────────────── */}
      <RevealItem>
        <AddCustomerForm />
      </RevealItem>

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <RevealItem>
        <div className="admin-stats" style={{ marginTop: "24px" }}>
          {stats.map((s) => (
            <div key={s.label} className="mcard">
              <div className="l">
                <i className={s.icon} aria-hidden="true" />
                {s.label}
              </div>
              <div
                className="big"
                style={s.accent ? { color: "var(--warn)" } : undefined}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </RevealItem>

      {/* ── Customer table ───────────────────────────────────────────────
          MotionTable IS the role="table" element + a stagger parent; each
          MotionRow IS a role="row" stagger child. Below 768px admin.css
          (.admin-card-tbl) collapses the grid into stacked cards using each
          cell's data-label; the .thead stays sr-only for column association. */}
      <MotionTable
        className="tcard admin-tbl-customers admin-card-tbl"
        role="table"
        aria-label="Customer list"
        style={{ marginTop: "24px" }}
      >
        {/* Header */}
        <div className="thead" role="row">
          <div role="columnheader">Customer</div>
          <div role="columnheader">Plan</div>
          <div role="columnheader">Last score</div>
          <div role="columnheader">Open</div>
        </div>

        {/* Empty state */}
        {sites.length === 0 && (
          <MotionRow
            className="trow"
            style={{ gridTemplateColumns: "1fr", justifyItems: "center", color: "var(--t2)" }}
            role="row"
          >
            <div role="cell">No customers yet — they&apos;ll appear here as people add sites.</div>
          </MotionRow>
        )}

        {/* Rows */}
        {sites.map((s) => (
          <MotionRow className="trow" key={s.id} role="row">
            {/* Customer: avatar + domain + email (the mobile card title row) */}
            <div role="cell" data-primary>
              <Link
                href={`/admin/sites/${s.id}`}
                style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}
              >
                <span className="admin-dom-av" aria-hidden="true">
                  {(s.domain[0] ?? "?").toUpperCase()}
                </span>
                <span>
                  <span
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "var(--deep)",
                      fontSize: "13.5px",
                    }}
                  >
                    {s.domain}
                  </span>
                  <span
                    style={{ display: "block", fontSize: "12px", color: "var(--t2)", marginTop: "1px" }}
                  >
                    {s.ownerEmail}
                  </span>
                </span>
              </Link>
            </div>

            {/* Plan */}
            <div role="cell" data-label="Plan">
              <span className="pill gray" style={{ textTransform: "capitalize" }}>
                {s.plan}
              </span>
            </div>

            {/* Last score */}
            <div role="cell" data-label="Last score">
              <span className={`pill ${scoreTone(s.lastScanScore)}`}>
                {s.lastScanScore ?? "—"}
              </span>
            </div>

            {/* Open requests */}
            <div role="cell" data-label="Open">
              {s.openRequests > 0 ? (
                <span className="pill high">{s.openRequests}</span>
              ) : (
                <span style={{ color: "var(--t3)", fontSize: "13px" }}>0</span>
              )}
            </div>
          </MotionRow>
        ))}
      </MotionTable>
    </PageTransition>
  );
}
