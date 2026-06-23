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

/** Score chip palette + qualitative label — mirrors the customers table. */
function scoreMeta(score: number | null): { cls: string; label: string } {
  if (score === null) return { cls: "bg-neutral-800 text-neutral-400 ring-1 ring-neutral-700", label: "No score" };
  if (score >= 80) return { cls: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30", label: "Good" };
  if (score >= 60) return { cls: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30", label: "Fair" };
  return { cls: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30", label: "Poor" };
}

function statusClass(status: Lead["status"]) {
  switch (status) {
    case "won":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
    case "qualified":
    case "contacted":
      return "bg-brand-600/20 text-brand-200 ring-1 ring-brand-500/30";
    case "lost":
      return "bg-neutral-800 text-neutral-400 ring-1 ring-neutral-700";
    default:
      return "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"; // "new"
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
  const scored = leads.filter((l) => l.score !== null);
  const avg = scored.length ? Math.round(scored.reduce((n, l) => n + (l.score ?? 0), 0) / scored.length) : null;

  const stats: { label: string; value: string | number; tone?: boolean; hint: string }[] = [
    { label: "Leads", value: leads.length, hint: "From the scanner" },
    { label: "New", value: newCount, tone: newCount > 0, hint: "Not yet contacted" },
    { label: "Avg. score", value: avg ?? "—", hint: scored.length ? `${scored.length} scored` : "No scores" },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {leads.length === 0
              ? "Scanner leads will appear here as people request their report."
              : "From the public scanner — worst-scoring sites first, the ones most in need."}
          </p>
        </div>
        <Link
          href="/admin"
          className="transition-base rounded text-sm font-medium text-neutral-400 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          ← Customers
        </Link>
      </div>

      {/* Stats */}
      {leads.length > 0 && (
        <dl className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border bg-neutral-900/60 p-5 ${s.tone ? "border-amber-500/30" : "border-neutral-800"}`}
            >
              <dd className={`font-display text-3xl font-extrabold tabular-nums ${s.tone ? "text-amber-300" : "text-white"}`}>
                {s.value}
              </dd>
              <dt className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{s.label}</dt>
              <p className="mt-0.5 text-[11px] text-neutral-600">{s.hint}</p>
            </div>
          ))}
        </dl>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <Table>
          <caption className="sr-only">Scanner leads, worst accessibility score first.</caption>
          <TableHeader>
            <TableRow className="border-neutral-800 hover:bg-transparent">
              <TableHead scope="col" className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Email</TableHead>
              <TableHead scope="col" className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Site</TableHead>
              <TableHead scope="col" className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Score</TableHead>
              <TableHead scope="col" className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Issues</TableHead>
              <TableHead scope="col" className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Source</TableHead>
              <TableHead scope="col" className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">Status</TableHead>
              <TableHead scope="col" className="px-5 py-3 text-xs uppercase tracking-wide text-neutral-500">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableCell colSpan={7} className="px-5 py-12 text-center">
                  <p className="text-sm font-medium text-neutral-300">No leads yet</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    They appear when someone runs the public scanner and asks for the report.
                  </p>
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead) => {
              const meta = scoreMeta(lead.score);
              const poor = lead.score !== null && lead.score < 60;
              const t = lead.totals;
              return (
                <TableRow key={lead.id} className={`border-neutral-800/70 transition-colors hover:bg-neutral-800/40 ${poor ? "bg-red-500/[0.04]" : ""}`}>
                  <TableCell scope="row" className="px-5 py-3 font-medium text-white">
                    <div className="flex items-center gap-3">
                      <span aria-hidden className={`-ml-2 h-6 w-1 shrink-0 rounded-full ${poor ? "bg-red-400" : "bg-transparent"}`} />
                      {lead.email}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-neutral-300">
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="rounded underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                      {domainOf(lead.url)}
                    </a>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${meta.cls}`}>
                      <span>{lead.score ?? "—"}</span>
                      <span className="font-medium opacity-80">{meta.label}</span>
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3">
                    <span className="font-semibold tabular-nums text-neutral-200">{issueTotal(t)}</span>
                    {(t.critical ?? 0) + (t.serious ?? 0) > 0 && (
                      <span className="ml-2 text-xs text-red-400 tabular-nums">
                        {(t.critical ?? 0) + (t.serious ?? 0)} high
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-neutral-400 capitalize">{lead.source}</TableCell>
                  <TableCell className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(lead.status)}`}>
                      {lead.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-neutral-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
