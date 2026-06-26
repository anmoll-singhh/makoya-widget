/**
 * app/admin/requests/page.tsx — Consultation requests inbox
 *
 * v7 restyle: replaces Tailwind-class table with v7 .tcard/.thead/.trow
 * div-grid structure using the shared dashboard CSS token layer.
 * All data-fetching, auth gating, status handling, and StatusSelect are unchanged.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { listConsultationRequests } from "@/lib/admin";
import { StatusSelect } from "@/components/admin/StatusSelect";

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

export default async function AdminRequests() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const requests = await listConsultationRequests();
  const open = requests.filter((r) => r.status === "new").length;

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="between" style={{ marginBottom: "22px" }}>
        <div>
          <div className="pagehead" style={{ marginBottom: 0 }}>
            Admin CRM
            <b>Consultation requests</b>
          </div>
          <p style={{ fontSize: "13px", color: "var(--t2)", marginTop: "4px" }}>
            {open > 0
              ? `${open} new request${open === 1 ? "" : "s"} waiting on you.`
              : "All caught up."}
          </p>
        </div>
        <Link href="/admin" className="btn">
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Customers
        </Link>
      </div>

      {/* ── Requests table ───────────────────────────────────────────── */}
      <div className="tcard admin-tbl-requests" role="table" aria-label="Consultation requests">
        {/* Header */}
        <div className="thead" role="row">
          <div role="columnheader">Site</div>
          <div role="columnheader">Type</div>
          <div role="columnheader">When</div>
          <div role="columnheader">Status</div>
        </div>

        {/* Empty state */}
        {requests.length === 0 && (
          <div
            className="trow"
            style={{ gridTemplateColumns: "1fr", justifyItems: "center", color: "var(--t2)" }}
            role="row"
          >
            <div role="cell">
              No requests yet — they appear when a customer asks for the full report or a call.
            </div>
          </div>
        )}

        {/* Rows */}
        {requests.map((r) => (
          <div className="trow" key={r.id} role="row">
            {/* Site */}
            <div role="cell">
              <Link
                href={`/admin/sites/${r.siteId}`}
                style={{ fontWeight: 700, color: "var(--primary-hover)", textDecoration: "none" }}
              >
                {r.siteDomain}
              </Link>
            </div>

            {/* Type */}
            <div role="cell" style={{ color: "var(--t2)" }}>
              {r.type === "book_call" ? "Book a call" : "Full report"}
            </div>

            {/* When */}
            <div role="cell" style={{ color: "var(--t3)", fontSize: "12.5px", fontVariantNumeric: "tabular-nums" }}>
              {new Date(r.createdAt).toLocaleString()}
            </div>

            {/* Status: StatusSelect client component — functionality unchanged */}
            <div role="cell">
              <StatusSelect id={r.id} status={r.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
