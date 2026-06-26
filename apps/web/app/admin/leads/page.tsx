/**
 * /admin/leads — operator view of funnel leads from the public scanner.
 *
 * v7 restyle: replaces shadcn Table components with v7 .tcard/.thead/.trow
 * div-grid table structure using the shared dashboard CSS token layer.
 * All data-fetching, auth gating, sorting, and helper logic are unchanged.
 *
 * Where these come from:
 *   Public /scan → visitor enters email → POST /api/scan-ingest → createLead()
 *   writes a row to the `leads` table (RLS-no-policy, service-role only). This
 *   page reads them back with the service-role client and shows the operator who
 *   to chase, worst-scoring sites first.
 *
 * Why service-role here is safe:
 *   `leads` has NO RLS policy, so the anon/auth client can never read it. The
 *   page is gated by `getAdminUser()` (operator email allowlist) BEFORE we ever
 *   construct the admin client — same pattern as every other /admin page. A
 *   non-operator is redirected to /dashboard and never reaches the data fetch.
 *
 * Sort: worst first. We rank by lowest score, then by highest issue count, so
 * the leads most likely to convert (and most in need of help) float to the top.
 *
 * Honest copy only — no "compliant"/"guaranteed" language anywhere.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { listLeads, type Lead, type LeadTotals } from "@/lib/leads";

// Always render fresh — leads change as the funnel runs.
export const dynamic = "force-dynamic";

/** Sum of all severity counts for a lead (prefer the stored `total`). */
function issueTotal(t: LeadTotals): number {
  if (typeof t.total === "number") return t.total;
  return (t.critical ?? 0) + (t.serious ?? 0) + (t.moderate ?? 0) + (t.minor ?? 0);
}

/** Show just the domain, not the full URL — easier to scan a column of these. */
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Map a nullable score to a v7 pill tone. */
function scoreTone(score: number | null): string {
  if (score === null) return "gray";
  if (score >= 80) return "green";
  if (score >= 60) return "med";
  return "high";
}

/** Map lead status to a v7 pill tone. */
function statusTone(status: Lead["status"]): string {
  switch (status) {
    case "won":
      return "green";
    case "qualified":
    case "contacted":
      return "low";
    case "lost":
      return "gray";
    default:
      return "med"; // "new" — needs attention
  }
}

/**
 * Worst-first comparator: lowest score on top (nulls last), then most issues.
 * A null score means we don't know how bad it is, so it sorts below scored rows.
 */
function worstFirst(a: Lead, b: Lead): number {
  const as = a.score ?? Number.POSITIVE_INFINITY;
  const bs = b.score ?? Number.POSITIVE_INFINITY;
  if (as !== bs) return as - bs;
  return issueTotal(b.totals) - issueTotal(a.totals);
}

export default async function AdminLeads() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");

  const leads = (await listLeads(getAdminSupabase())).sort(worstFirst);
  const newCount = leads.filter((l) => l.status === "new").length;

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="between" style={{ marginBottom: "22px" }}>
        <div>
          <div className="pagehead" style={{ marginBottom: 0 }}>
            Admin CRM
            <b>Leads</b>
          </div>
          <p style={{ fontSize: "13px", color: "var(--t2)", marginTop: "4px" }}>
            {leads.length === 0
              ? "Scanner leads will appear here as people request their report."
              : `${leads.length} lead${leads.length === 1 ? "" : "s"} from the scanner` +
                (newCount > 0 ? ` · ${newCount} new` : "") +
                " — worst-scoring sites first."}
          </p>
        </div>
        <Link href="/admin" className="btn">
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Customers
        </Link>
      </div>

      {/* ── Leads table ───────────────────────────────────────────────── */}
      <div className="tcard admin-tbl-leads" role="table" aria-label="Leads">
        {/* Header */}
        <div className="thead" role="row">
          <div role="columnheader">Email</div>
          <div role="columnheader">Site</div>
          <div role="columnheader">Score</div>
          <div role="columnheader">Issues</div>
          <div role="columnheader">Status</div>
          <div role="columnheader">When</div>
        </div>

        {/* Empty state */}
        {leads.length === 0 && (
          <div
            className="trow"
            style={{ gridTemplateColumns: "1fr", justifyItems: "center", color: "var(--t2)" }}
            role="row"
          >
            <div role="cell">
              No leads yet — they appear when someone runs the public scanner and asks for the report.
            </div>
          </div>
        )}

        {/* Rows */}
        {leads.map((lead) => (
          <div className="trow" key={lead.id} role="row">
            {/* Email */}
            <div role="cell" style={{ fontWeight: 600, color: "var(--deep)" }}>
              {lead.email}
            </div>

            {/* Site domain */}
            <div role="cell">
              <a
                href={lead.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                style={{ color: "var(--primary-hover)", fontWeight: 600, textDecoration: "none" }}
              >
                {domainOf(lead.url)}
              </a>
            </div>

            {/* Score */}
            <div role="cell">
              <span className={`pill ${scoreTone(lead.score)}`}>
                {lead.score ?? "—"}
              </span>
            </div>

            {/* Issue count */}
            <div role="cell" style={{ fontWeight: 700, color: "var(--deep)", fontVariantNumeric: "tabular-nums" }}>
              {issueTotal(lead.totals)}
            </div>

            {/* Status */}
            <div role="cell">
              <span className={`pill ${statusTone(lead.status)}`} style={{ textTransform: "capitalize" }}>
                {lead.status}
              </span>
            </div>

            {/* Date */}
            <div role="cell" style={{ color: "var(--t3)", fontSize: "12.5px" }}>
              {new Date(lead.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
