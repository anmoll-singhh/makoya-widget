/**
 * app/admin/sites/[id]/page.tsx — Admin customer detail
 *
 * v7 restyle: replaces Tailwind-class cards and lists with v7 .card/.cpad,
 * .tcard/.trow, .pill classes from the shared dashboard CSS token layer.
 * All data-fetching, auth gating, PlanSelect, and request/scan display
 * are unchanged — this is a visual-only restyle.
 *
 * Functionality preserved byte-for-byte:
 *   - getAdminUser() gates access
 *   - getAdminSiteDetail(id) fetches site + scan history + requests
 *   - PlanSelect drives PATCH /api/admin/sites/[id] plan changes
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getAdminSiteDetail } from "@/lib/admin";
import { PlanSelect } from "@/components/admin/PlanSelect";
import { PageTransition, RevealItem } from "@/components/motion/PageTransition";
import { MotionTable, MotionRow } from "@/components/admin/MotionTable";

/** Map a scan score to a v7 pill tone. */
function scoreTone(score: number): string {
  if (score >= 80) return "green";
  if (score >= 60) return "med";
  return "high";
}

/** Map a request status to a v7 pill tone. */
function statusTone(status: string): string {
  switch (status) {
    case "won":
      return "green";
    case "contacted":
      return "low";
    case "new":
      return "high";
    default:
      return "gray"; // lost
  }
}

export default async function AdminSiteDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const { id } = await params;
  const site = await getAdminSiteDetail(id);
  if (!site) notFound();

  return (
    <PageTransition stagger={0.08} className="admin-detail-stack">
      {/* ── Back link ────────────────────────────────────────────────── */}
      <RevealItem>
        <Link href="/admin" className="btn">
          <i className="ti ti-arrow-left" aria-hidden="true" />
          All customers
        </Link>
      </RevealItem>

      {/* ── Customer header card ──────────────────────────────────────── */}
      <RevealItem>
        <div className="card cpad between admin-detail-head">
          {/* Domain avatar + identity */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span className="admin-dom-av" style={{ width: "46px", height: "46px", fontSize: "18px", borderRadius: "13px" }} aria-hidden="true">
              {(site.domain[0] ?? "?").toUpperCase()}
            </span>
            <div>
              <h1
                style={{
                  fontFamily: "'Satoshi', system-ui, sans-serif",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--deep)",
                  letterSpacing: "-.02em",
                }}
              >
                {site.domain}
              </h1>
              <p style={{ fontSize: "13px", color: "var(--t2)", marginTop: "2px" }}>
                {site.ownerEmail} · joined {new Date(site.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Plan select — PlanSelect client component, functionality unchanged */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "var(--t2)", fontWeight: 600 }}>Plan</span>
            <PlanSelect siteId={site.id} plan={site.plan} />
          </div>
        </div>
      </RevealItem>

      {/* ── Scan history ──────────────────────────────────────────────── */}
      <RevealItem as="section">
        <p className="admin-section-label">Scan history</p>
        <MotionTable className="tcard admin-tbl-scans admin-card-tbl" role="table" aria-label="Scan history">
          <div className="thead" role="row">
            <div role="columnheader">Score</div>
            <div role="columnheader" style={{ textAlign: "right" }}>Logged</div>
          </div>
          {site.scans.length === 0 && (
            <MotionRow className="trow" style={{ gridTemplateColumns: "1fr" }} role="row">
              <div role="cell" style={{ color: "var(--t2)", fontSize: "13px" }}>No scans yet.</div>
            </MotionRow>
          )}
          {site.scans.map((sc) => (
            <MotionRow key={sc.id} className="trow" role="row">
              {/* Score pill (the mobile card title row) */}
              <div role="cell" data-primary>
                <span className={`pill ${scoreTone(sc.score)}`}>
                  {sc.score}
                  <span style={{ opacity: 0.7, fontWeight: 500 }}>/100</span>
                </span>
              </div>
              {/* Timestamp */}
              <div
                role="cell"
                data-label="Logged"
                style={{
                  color: "var(--t3)",
                  fontSize: "12.5px",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {new Date(sc.createdAt).toLocaleString()}
              </div>
            </MotionRow>
          ))}
        </MotionTable>
      </RevealItem>

      {/* ── Consultation requests ─────────────────────────────────────── */}
      <RevealItem as="section">
        <p className="admin-section-label">Consultation requests</p>
        <MotionTable className="tcard admin-tbl-detreq admin-card-tbl" role="table" aria-label="Consultation requests for this customer">
          <div className="thead" role="row">
            <div role="columnheader">Type</div>
            <div role="columnheader">When</div>
            <div role="columnheader">Status</div>
          </div>
          {site.requests.length === 0 && (
            <MotionRow className="trow" style={{ gridTemplateColumns: "1fr" }} role="row">
              <div role="cell" style={{ color: "var(--t2)", fontSize: "13px" }}>No requests.</div>
            </MotionRow>
          )}
          {site.requests.map((r) => (
            <MotionRow key={r.id} className="trow" role="row">
              {/* Type (the mobile card title row) */}
              <div role="cell" data-primary style={{ fontWeight: 700, color: "var(--deep)", fontSize: "13.5px" }}>
                {r.type === "book_call" ? "Book a call" : "Full report"}
              </div>
              {/* Date */}
              <div
                role="cell"
                data-label="When"
                style={{
                  color: "var(--t3)",
                  fontSize: "12px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {new Date(r.createdAt).toLocaleDateString()}
              </div>
              {/* Status pill */}
              <div role="cell" data-label="Status">
                <span className={`pill ${statusTone(r.status)}`} style={{ textTransform: "capitalize" }}>
                  {r.status}
                </span>
              </div>
            </MotionRow>
          ))}
        </MotionTable>
      </RevealItem>
    </PageTransition>
  );
}
