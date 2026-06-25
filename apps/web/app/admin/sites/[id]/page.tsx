import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getAdminSiteDetail } from "@/lib/admin";
import { PlanSelect } from "@/components/admin/PlanSelect";

function scoreClass(score: number) {
  if (score >= 80) return "text-[var(--color-sev-passed)]";
  if (score >= 60) return "text-[var(--color-sev-moderate)]";
  return "text-[var(--color-sev-critical)]";
}
const STATUS_CLASS: Record<string, string> = {
  new: "bg-signal-500/20 text-signal-600 ring-signal-500/30",
  contacted: "bg-[var(--color-sev-moderate)]/20 text-[var(--color-sev-moderate)] ring-[var(--color-sev-moderate)]/30",
  won: "bg-[var(--color-sev-passed)]/20 text-[var(--color-sev-passed)] ring-[var(--color-sev-passed)]/30",
  lost: "bg-[var(--surface-2)] text-[var(--ink-600)] ring-[var(--border)]/30",
};

export default async function AdminSiteDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const { id } = await params;
  const site = await getAdminSiteDetail(id);
  if (!site) notFound();

  return (
    <div className="space-y-7">
      <Link href="/admin" className="transition-colors inline-flex items-center gap-1 text-sm font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)]">
        <span aria-hidden>←</span> All customers
      </Link>

      {/* Customer header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-signal-600 text-lg font-bold text-white">
            {(site.domain[0] ?? "?").toUpperCase()}
          </span>
          <div>
            <h1 className="font-sans text-xl font-bold tracking-tight text-[var(--ink-900)]">{site.domain}</h1>
            <p className="text-sm text-[var(--ink-600)]">
              {site.ownerEmail} · joined {new Date(site.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-[var(--ink-600)]">Plan</span>
          <PlanSelect siteId={site.id} plan={site.plan} />
        </div>
      </div>

      {/* Scan history */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-600)]">Scan history</h2>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          {site.scans.length === 0 && <p className="px-5 py-4 text-sm text-[var(--ink-600)]">No scans yet.</p>}
          {site.scans.map((sc) => (
            <div key={sc.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className={`font-sans text-lg font-bold ${scoreClass(sc.score)}`}>
                {sc.score}
                <span className="text-xs font-normal text-[var(--ink-600)]">/100</span>
              </span>
              <span className="text-[var(--ink-600)]">{new Date(sc.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Requests */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-600)]">Consultation requests</h2>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
          {site.requests.length === 0 && <p className="px-5 py-4 text-sm text-[var(--ink-600)]">No requests.</p>}
          {site.requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <span className="font-medium text-[var(--ink-900)]">{r.type === "book_call" ? "Book a call" : "Full report"}</span>
                <span className="ml-2 text-xs text-[var(--ink-600)]">{new Date(r.createdAt).toLocaleDateString()}</span>
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
