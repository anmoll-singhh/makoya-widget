import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getAdminSiteDetail } from "@/lib/admin";
import { PlanSelect } from "@/components/admin/PlanSelect";

function scoreClass(score: number) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 60) return "text-amber-300";
  return "text-red-300";
}
const STATUS_CLASS: Record<string, string> = {
  new: "bg-brand-500/20 text-brand-200 ring-brand-500/30",
  contacted: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
  won: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
  lost: "bg-neutral-700/40 text-neutral-400 ring-neutral-600/30",
};

export default async function AdminSiteDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const { id } = await params;
  const site = await getAdminSiteDetail(id);
  if (!site) notFound();

  return (
    <div className="space-y-7">
      <Link href="/admin" className="transition-base inline-flex items-center gap-1 text-sm font-medium text-neutral-400 hover:text-white">
        <span aria-hidden>←</span> All customers
      </Link>

      {/* Customer header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-lg font-bold text-white">
            {(site.domain[0] ?? "?").toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-white">{site.domain}</h1>
            <p className="text-sm text-neutral-400">
              {site.ownerEmail} · joined {new Date(site.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-neutral-400">Plan</span>
          <PlanSelect siteId={site.id} plan={site.plan} />
        </div>
      </div>

      {/* Scan history */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Scan history</h2>
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 divide-y divide-neutral-800/70">
          {site.scans.length === 0 && <p className="px-5 py-4 text-sm text-neutral-500">No scans yet.</p>}
          {site.scans.map((sc) => (
            <div key={sc.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className={`font-display text-lg font-bold ${scoreClass(sc.score)}`}>
                {sc.score}
                <span className="text-xs font-normal text-neutral-500">/100</span>
              </span>
              <span className="text-neutral-500">{new Date(sc.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Requests */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Consultation requests</h2>
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 divide-y divide-neutral-800/70">
          {site.requests.length === 0 && <p className="px-5 py-4 text-sm text-neutral-500">No requests.</p>}
          {site.requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <span className="font-medium text-white">{r.type === "book_call" ? "Book a call" : "Full report"}</span>
                <span className="ml-2 text-xs text-neutral-500">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${STATUS_CLASS[r.status] ?? STATUS_CLASS.lost}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
