import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getAdminSiteDetail } from "@/lib/admin";
import { issueCountFromTotals } from "@/lib/issue-count-utils";
import { PlanSelect } from "@/components/admin/PlanSelect";

/**
 * Per-customer detail — the operator's account page.
 *
 * Goal: at a glance know how this account is doing and what's outstanding, then
 * act. The header carries the current score; a stat strip summarizes; scan
 * history shows the trend (with per-scan deltas); requests are split so new
 * ones sit on top, each one actionable inline.
 */

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-300";
  if (score >= 60) return "text-amber-300";
  return "text-red-300";
}
function scoreChip(score: number | null): { cls: string; label: string } {
  if (score === null) return { cls: "bg-neutral-800 text-neutral-400 ring-1 ring-neutral-700", label: "No scan" };
  if (score >= 80) return { cls: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30", label: "Good" };
  if (score >= 60) return { cls: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30", label: "Fair" };
  return { cls: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30", label: "Poor" };
}

const STATUS_CLASS: Record<string, string> = {
  new: "bg-brand-500/20 text-brand-200 ring-brand-500/30",
  contacted: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
  won: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
  lost: "bg-neutral-700/40 text-neutral-400 ring-neutral-600/30",
};

function requestLabel(type: string): string {
  return type === "book_call" ? "Book a call" : "Full report";
}

export default async function AdminSiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const { id } = await params;
  const site = await getAdminSiteDetail(id);
  if (!site) notFound();

  const latest = site.scans[0] ?? null;
  const chip = scoreChip(latest?.score ?? null);
  const latestIssues = latest ? issueCountFromTotals(latest.totals) : null;
  const openRequests = site.requests.filter((r) => r.status === "new");
  const otherRequests = site.requests.filter((r) => r.status !== "new");
  const orderedRequests = [...openRequests, ...otherRequests];

  return (
    <div className="space-y-7">
      <Link
        href="/admin"
        className="transition-base inline-flex items-center gap-1 rounded text-sm font-medium text-neutral-400 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <span aria-hidden>←</span> All customers
      </Link>

      {/* Customer header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-lg font-bold text-white">
            {(site.domain[0] ?? "?").toUpperCase()}
          </span>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-xl font-bold tracking-tight text-white">{site.domain}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${chip.cls}`}>
                {latest?.score ?? "—"}
                <span className="font-medium opacity-80">{chip.label}</span>
              </span>
            </div>
            <p className="mt-0.5 text-sm text-neutral-400">
              {site.ownerEmail} · joined {new Date(site.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-neutral-400">Plan</span>
          <PlanSelect siteId={site.id} plan={site.plan} />
        </div>
      </div>

      {/* Quick stats */}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Current score", value: latest ? `${latest.score}` : "—", hint: chip.label },
          { label: "Open issues", value: latestIssues ?? "—", hint: "Latest scan" },
          { label: "Scans", value: site.scans.length, hint: "Last 20 shown" },
          {
            label: "Open requests",
            value: openRequests.length,
            hint: openRequests.length > 0 ? "Needs reply" : "None waiting",
            tone: openRequests.length > 0,
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl border bg-neutral-900/60 p-4 ${s.tone ? "border-amber-500/30" : "border-neutral-800"}`}
          >
            <dd className={`font-display text-2xl font-extrabold tabular-nums ${s.tone ? "text-amber-300" : "text-white"}`}>
              {s.value}
            </dd>
            <dt className="mt-0.5 text-xs font-medium uppercase tracking-wide text-neutral-500">{s.label}</dt>
            <p className="mt-0.5 text-[11px] text-neutral-600">{s.hint}</p>
          </div>
        ))}
      </dl>

      {/* Scan history */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Scan history{site.scans.length > 0 ? ` · ${site.scans.length}` : ""}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 divide-y divide-neutral-800/70">
          {site.scans.length === 0 && (
            <p className="px-5 py-6 text-sm text-neutral-500">No scans yet for this site.</p>
          )}
          {site.scans.map((sc, i) => {
            // Older scan sits at i+1 (list is newest-first); delta = newer − older.
            const prev = site.scans[i + 1];
            const delta = prev ? sc.score - prev.score : null;
            const issues = issueCountFromTotals(sc.totals);
            return (
              <div key={sc.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div className="flex items-baseline gap-3">
                  <span className={`font-display text-lg font-bold tabular-nums ${scoreColor(sc.score)}`}>
                    {sc.score}
                    <span className="text-xs font-normal text-neutral-500">/100</span>
                  </span>
                  {delta !== null && delta !== 0 && (
                    <span
                      className={`text-xs font-semibold tabular-nums ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}
                      title="Change vs. previous scan"
                    >
                      <span aria-hidden>{delta > 0 ? "▲" : "▼"}</span> {delta > 0 ? "+" : ""}
                      {delta}
                    </span>
                  )}
                  {issues !== null && (
                    <span className="text-xs text-neutral-500 tabular-nums">{issues} issues</span>
                  )}
                </div>
                <span className="text-neutral-500">{new Date(sc.createdAt).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Requests */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Consultation requests
          {openRequests.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300 tabular-nums">
              {openRequests.length} new
            </span>
          )}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 divide-y divide-neutral-800/70">
          {orderedRequests.length === 0 && (
            <p className="px-5 py-6 text-sm text-neutral-500">No requests from this customer.</p>
          )}
          {orderedRequests.map((r) => (
            <div
              key={r.id}
              className={`flex items-start justify-between gap-4 px-5 py-3 text-sm ${r.status === "new" ? "bg-brand-500/[0.05]" : ""}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{requestLabel(r.type)}</span>
                  <span className="text-xs text-neutral-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.note && <p className="mt-1 text-xs text-neutral-400">{r.note}</p>}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${STATUS_CLASS[r.status] ?? STATUS_CLASS.lost}`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
