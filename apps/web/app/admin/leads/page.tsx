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

/** Score chip palette — mirrors the admin customers table. */
function scoreClass(score: number | null) {
  if (score === null) return "bg-neutral-800 text-neutral-500";
  if (score >= 80) return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  if (score >= 60) return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
  return "bg-red-500/15 text-red-300 ring-1 ring-red-500/30";
}

function statusClass(status: Lead["status"]) {
  switch (status) {
    case "won":
      return "bg-emerald-500/15 text-emerald-300";
    case "qualified":
    case "contacted":
      return "bg-brand-600/20 text-brand-200";
    case "lost":
      return "bg-neutral-800 text-neutral-500";
    default:
      return "bg-amber-500/20 text-amber-300"; // "new"
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
          <h1 className="font-display text-2xl font-bold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {leads.length === 0
              ? "Scanner leads will appear here as people request their report."
              : `${leads.length} lead${leads.length === 1 ? "" : "s"} from the scanner` +
                (newCount > 0 ? ` · ${newCount} new` : "") +
                " — worst-scoring sites first."}
          </p>
        </div>
        <Link href="/admin" className="transition-base text-sm font-medium text-neutral-400 hover:text-white">
          ← Customers
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-800 hover:bg-transparent">
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Email</TableHead>
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Site</TableHead>
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Score</TableHead>
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Issues</TableHead>
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Status</TableHead>
              <TableHead className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableCell colSpan={6} className="px-5 py-10 text-center text-neutral-500">
                  No leads yet — they appear when someone runs the public scanner and asks for the report.
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead) => (
              <TableRow key={lead.id} className="border-neutral-800/70 transition-colors hover:bg-neutral-800/40">
                <TableCell className="px-5 py-3 font-medium text-white">{lead.email}</TableCell>
                <TableCell className="px-5 py-3 text-neutral-300">
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
                <TableCell className="px-5 py-3 font-semibold text-neutral-200">
                  {issueTotal(lead.totals)}
                </TableCell>
                <TableCell className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(lead.status)}`}>
                    {lead.status}
                  </span>
                </TableCell>
                <TableCell className="px-5 py-3 text-neutral-500">
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
