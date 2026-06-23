import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { listAdminSites, type AdminSiteRow } from "@/lib/admin";

/**
 * Operator home — the customers table.
 *
 * The whole point of this view is triage: surface who needs attention first.
 * So we re-sort the rows worst-accessibility-score-first (UI-only; the data
 * layer returns them newest-first). Rows with open requests or low scores get
 * a left attention rail and an explicit reason chip, so the operator can scan
 * the column and act without reading every cell.
 */

/** Score chip palette + qualitative label. Never color-only — pairs a word. */
function scoreMeta(score: number | null): { cls: string; label: string } {
  if (score === null) return { cls: "bg-neutral-800 text-neutral-400 ring-1 ring-neutral-700", label: "No scan" };
  if (score >= 80) return { cls: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30", label: "Good" };
  if (score >= 60) return { cls: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30", label: "Fair" };
  return { cls: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30", label: "Poor" };
}

const PLAN_CLASS: Record<string, string> = {
  managed: "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30",
  pro: "bg-brand-600/15 text-brand-200 ring-1 ring-brand-500/30",
  free: "bg-neutral-800 text-neutral-400 ring-1 ring-neutral-700",
};

/**
 * Worst-first: lowest score on top, nulls last (unknown ≠ urgent), then most
 * open requests as a tiebreak so the busiest accounts float up.
 */
function worstFirst(a: AdminSiteRow, b: AdminSiteRow): number {
  const as = a.lastScanScore ?? Number.POSITIVE_INFINITY;
  const bs = b.lastScanScore ?? Number.POSITIVE_INFINITY;
  if (as !== bs) return as - bs;
  return b.openRequests - a.openRequests;
}

/** A row "needs attention" if it has open requests or a poor (<60) score. */
function needsAttention(s: AdminSiteRow): boolean {
  return s.openRequests > 0 || (s.lastScanScore !== null && s.lastScanScore < 60);
}

export default async function AdminHome() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const sites = (await listAdminSites()).sort(worstFirst);

  const openTotal = sites.reduce((n, s) => n + s.openRequests, 0);
  const scored = sites.filter((s) => s.lastScanScore !== null);
  const avg = scored.length ? Math.round(scored.reduce((n, s) => n + (s.lastScanScore ?? 0), 0) / scored.length) : null;
  const attention = sites.filter(needsAttention).length;

  const stats: { label: string; value: string | number; tone?: "amber" | "red"; hint?: string }[] = [
    { label: "Customers", value: sites.length, hint: "Total sites" },
    { label: "Needs attention", value: attention, tone: attention > 0 ? "red" : undefined, hint: "Open request or poor score" },
    { label: "Open requests", value: openTotal, tone: openTotal > 0 ? "amber" : undefined, hint: "New, unanswered" },
    { label: "Avg. score", value: avg ?? "—", hint: scored.length ? `${scored.length} scanned` : "No scans yet" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Sorted worst-score-first — the top of this list is who needs you.
          </p>
        </div>
        <Link
          href="/admin/requests"
          className="transition-base inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 outline-none hover:bg-brand-500 focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          Requests inbox
          {openTotal > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 text-xs font-bold tabular-nums">{openTotal}</span>
          )}
        </Link>
      </div>

      {/* Stats */}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl border bg-neutral-900/60 p-5 ${
              s.tone === "red"
                ? "border-red-500/30"
                : s.tone === "amber"
                  ? "border-amber-500/30"
                  : "border-neutral-800"
            }`}
          >
            <dd
              className={`font-display text-3xl font-extrabold tabular-nums ${
                s.tone === "red" ? "text-red-300" : s.tone === "amber" ? "text-amber-300" : "text-white"
              }`}
            >
              {s.value}
            </dd>
            <dt className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{s.label}</dt>
            {s.hint && <p className="mt-0.5 text-[11px] text-neutral-600">{s.hint}</p>}
          </div>
        ))}
      </dl>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Customers, sorted worst accessibility score first.</caption>
          <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">Customer</th>
              <th scope="col" className="px-5 py-3 font-medium">Plan</th>
              <th scope="col" className="px-5 py-3 font-medium">Last score</th>
              <th scope="col" className="px-5 py-3 font-medium">Issues</th>
              <th scope="col" className="px-5 py-3 font-medium">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/70">
            {sites.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="text-sm font-medium text-neutral-300">No customers yet</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    They&apos;ll appear here as people add sites.
                  </p>
                </td>
              </tr>
            )}
            {sites.map((s) => {
              const meta = scoreMeta(s.lastScanScore);
              const flag = needsAttention(s);
              return (
                <tr
                  key={s.id}
                  className={`group transition-base hover:bg-neutral-800/40 ${
                    flag ? "bg-red-500/[0.04]" : ""
                  }`}
                >
                  <th scope="row" className="px-5 py-3 font-normal">
                    <Link
                      href={`/admin/sites/${s.id}`}
                      className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                      <span
                        aria-hidden
                        className={`-ml-2 h-9 w-1 shrink-0 rounded-full ${flag ? "bg-red-400" : "bg-transparent"}`}
                      />
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-sm font-bold text-white">
                        {(s.domain[0] ?? "?").toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-white underline-offset-2 group-hover:underline">
                          {s.domain}
                        </span>
                        <span className="block truncate text-xs text-neutral-400">{s.ownerEmail}</span>
                      </span>
                    </Link>
                  </th>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PLAN_CLASS[s.plan] ?? PLAN_CLASS.free}`}>
                      {s.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${meta.cls}`}>
                      <span>{s.lastScanScore ?? "—"}</span>
                      <span className="font-medium opacity-80">{meta.label}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-neutral-300">
                    {s.issueCount ?? <span className="text-neutral-600">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {s.openRequests > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-300">
                        <span aria-hidden>●</span>
                        {s.openRequests}
                        <span className="sr-only">open requests</span>
                      </span>
                    ) : (
                      <span className="text-neutral-600" aria-label="no open requests">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
