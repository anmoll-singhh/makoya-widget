import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getAdminSiteDetail } from "@/lib/admin";
import { PlanSelect } from "@/components/admin/PlanSelect";

export default async function AdminSiteDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const { id } = await params;
  const site = await getAdminSiteDetail(id);
  if (!site) notFound();
  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-neutral-400 hover:text-neutral-100">← All customers</Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{site.domain}</h1>
          <p className="text-sm text-neutral-400">{site.ownerEmail} · joined {new Date(site.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2 text-sm"><span className="text-neutral-400">Plan</span><PlanSelect siteId={site.id} plan={site.plan} /></div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-400">Scan history</h2>
        <div className="rounded-xl border border-neutral-800 divide-y divide-neutral-800">
          {site.scans.length === 0 && <p className="px-4 py-3 text-neutral-500">No scans yet.</p>}
          {site.scans.map((sc) => (
            <div key={sc.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="font-mono">{sc.score}/100</span>
              <span className="text-neutral-500">{new Date(sc.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-400">Consultation requests</h2>
        <div className="rounded-xl border border-neutral-800 divide-y divide-neutral-800">
          {site.requests.length === 0 && <p className="px-4 py-3 text-neutral-500">No requests.</p>}
          {site.requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>{r.type === "book_call" ? "Book a call" : "Full report"}</span>
              <span className="text-neutral-400">{r.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
