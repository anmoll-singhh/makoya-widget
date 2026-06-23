import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { listConsultationRequests, type AdminRequest } from "@/lib/admin";
import { StatusSelect } from "@/components/admin/StatusSelect";

/**
 * Consultation requests inbox.
 *
 * Triage-first: new (unanswered) requests sort to the top regardless of age so
 * nothing waits unseen; within each status group we keep newest-first. New rows
 * get an attention rail + tinted background so the queue reads at a glance. The
 * status pill is an inline control (StatusSelect) — the operator works the row
 * without leaving the page.
 */

const STATUS_ORDER: Record<string, number> = { new: 0, contacted: 1, won: 2, lost: 3 };

function requestLabel(type: string): string {
  return type === "book_call" ? "Book a call" : "Full report";
}

/** New first; within a status, newest first (list arrives newest-first). */
function triageSort(a: AdminRequest, b: AdminRequest): number {
  return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
}

export default async function AdminRequests() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const requests = (await listConsultationRequests()).sort(triageSort);

  const counts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const open = counts.new ?? 0;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Consultation requests</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {open > 0 ? `${open} new request${open === 1 ? "" : "s"} waiting on you — shown first.` : "All caught up — nothing new."}
          </p>
        </div>
        <Link
          href="/admin"
          className="transition-base rounded text-sm font-medium text-neutral-400 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          ← Customers
        </Link>
      </div>

      {/* Status summary chips */}
      {requests.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {(["new", "contacted", "won", "lost"] as const).map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900/70 px-3 py-1 font-medium capitalize text-neutral-300 ring-1 ring-neutral-800"
            >
              {st}
              <span className="tabular-nums text-neutral-500">{counts[st] ?? 0}</span>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Consultation requests, new ones first.</caption>
          <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">Site</th>
              <th scope="col" className="px-5 py-3 font-medium">Type</th>
              <th scope="col" className="px-5 py-3 font-medium">When</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/70">
            {requests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center">
                  <p className="text-sm font-medium text-neutral-300">No requests yet</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    They appear when a customer asks for the full report or a call.
                  </p>
                </td>
              </tr>
            )}
            {requests.map((r) => {
              const isNew = r.status === "new";
              return (
                <tr key={r.id} className={`transition-base hover:bg-neutral-800/40 ${isNew ? "bg-brand-500/[0.05]" : ""}`}>
                  <th scope="row" className="px-5 py-3 font-normal">
                    <div className="flex items-center gap-3">
                      <span aria-hidden className={`-ml-2 h-6 w-1 shrink-0 rounded-full ${isNew ? "bg-brand-400" : "bg-transparent"}`} />
                      <Link
                        href={`/admin/sites/${r.siteId}`}
                        className="rounded font-semibold text-white underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-400"
                      >
                        {r.siteDomain}
                      </Link>
                    </div>
                  </th>
                  <td className="px-5 py-3 text-neutral-300">{requestLabel(r.type)}</td>
                  <td className="px-5 py-3 text-neutral-500">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <StatusSelect id={r.id} status={r.status} />
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
