/**
 * /admin/leads — operator view of funnel leads from the public scanner.
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

/** Score chip palette — maps to Redline severity tokens. */
function scoreClass(score: number | null) {
  if (score === null)
    return "bg-[var(--surface-2)] text-[var(--ink-600)]";
  if (score >= 80)
    return "bg-[color-mix(in_srgb,var(--color-sev-passed)_15%,transparent)] text-[var(--color-sev-passed)] ring-1 ring-[color-mix(in_srgb,var(--color-sev-passed)_30%,transparent)]";
  if (score >= 60)
    return "bg-[color-mix(in_srgb,var(--color-sev-moderate)_15%,transparent)] text-[var(--color-sev-moderate)] ring-1 ring-[color-mix(in_srgb,var(--color-sev-moderate)_30%,transparent)]";
  return "bg-[color-mix(in_srgb,var(--color-sev-critical)_15%,transparent)] text-[var(--color-sev-critical)] ring-1 ring-[color-mix(in_srgb,var(--color-sev-critical)_30%,transparent)]";
}

function statusClass(status: Lead["status"]) {
  switch (status) {
    case "won":
      return "bg-[color-mix(in_srgb,var(--color-sev-passed)_15%,transparent)] text-[var(--color-sev-passed)]";
    case "qualified":
    case "contacted":
      return "bg-signal-600/20 text-signal-700";
    case "lost":
      return "bg-[var(--surface-2)] text-[var(--ink-600)]";
    default:
      return "bg-[color-mix(in_srgb,var(--color-sev-moderate)_20%,transparent)] text-[var(--color-sev-moderate)]"; // "new"
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
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-[var(--ink-600)]">
            {leads.length === 0
              ? "Scanner leads will appear here as people request their report."
              : `${leads.length} lead${leads.length === 1 ? "" : "s"} from the scanner` +
                (newCount > 0 ? ` · ${newCount} new` : "") +
                " — worst-scoring sites first."}
          </p>
        </div>
        <Link href="/admin" className="transition-colors text-sm font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)]">
          ← Customers
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)] hover:bg-transparent">
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--ink-600)]">Email</TableHead>
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--ink-600)]">Site</TableHead>
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--ink-600)]">Score</TableHead>
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--ink-600)]">Issues</TableHead>
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--ink-600)]">Status</TableHead>
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--ink-600)]">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow className="border-[var(--border)] hover:bg-transparent">
                <TableCell colSpan={6} className="px-5 py-10 text-center text-[var(--ink-600)]">
                  No leads yet — they appear when someone runs the public scanner and asks for the report.
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead) => (
              <TableRow key={lead.id} className="border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]">
                <TableCell className="px-5 py-3 font-medium text-[var(--ink-900)]">{lead.email}</TableCell>
                <TableCell className="px-5 py-3 text-[var(--ink-600)]">
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="underline-offset-2 hover:underline"
                  >
                    {domainOf(lead.url)}
                  </a>
                </TableCell>
                <TableCell className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreClass(lead.score)}`}>
                    {lead.score ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="px-5 py-3 font-semibold text-[var(--ink-900)]">
                  {issueTotal(lead.totals)}
                </TableCell>
                <TableCell className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(lead.status)}`}>
                    {lead.status}
                  </span>
                </TableCell>
                <TableCell className="px-5 py-3 text-[var(--ink-600)]">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
