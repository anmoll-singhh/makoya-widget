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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── Back link ────────────────────────────────────────────────── */}
      <div>
        <Link href="/admin" className="btn">
          <i className="ti ti-arrow-left" aria-hidden="true" />
          All customers
        </Link>
      </div>

      {/* ── Customer header card ──────────────────────────────────────── */}
      <div className="card cpad between">
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

      {/* ── Scan history ──────────────────────────────────────────────── */}
      <section>
        <p className="admin-section-label">Scan history</p>
        <div className="tcard">
          {site.scans.length === 0 && (
            <div className="trow" style={{ gridTemplateColumns: "1fr" }}>
              <p style={{ color: "var(--t2)", fontSize: "13px" }}>No scans yet.</p>
            </div>
          )}
          {site.scans.map((sc) => (
            <div
              key={sc.id}
              className="trow"
              style={{
                gridTemplateColumns: "auto 1fr",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* Score pill */}
              <span className={`pill ${scoreTone(sc.score)}`}>
                {sc.score}
                <span style={{ opacity: 0.7, fontWeight: 500 }}>/100</span>
              </span>
              {/* Timestamp */}
              <span
                style={{
                  color: "var(--t3)",
                  fontSize: "12.5px",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {new Date(sc.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Consultation requests ─────────────────────────────────────── */}
      <section>
        <p className="admin-section-label">Consultation requests</p>
        <div className="tcard">
          {site.requests.length === 0 && (
            <div className="trow" style={{ gridTemplateColumns: "1fr" }}>
              <p style={{ color: "var(--t2)", fontSize: "13px" }}>No requests.</p>
            </div>
          )}
          {site.requests.map((r) => (
            <div
              key={r.id}
              className="trow"
              style={{
                gridTemplateColumns: "1fr auto auto",
                alignItems: "center",
              }}
            >
              {/* Type */}
              <span style={{ fontWeight: 700, color: "var(--deep)", fontSize: "13.5px" }}>
                {r.type === "book_call" ? "Book a call" : "Full report"}
              </span>
              {/* Date */}
              <span
                style={{
                  color: "var(--t3)",
                  fontSize: "12px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
              {/* Status pill */}
              <span className={`pill ${statusTone(r.status)}`} style={{ textTransform: "capitalize" }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
