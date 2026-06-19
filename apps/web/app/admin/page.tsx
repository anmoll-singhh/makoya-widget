import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { listAdminSites } from "@/lib/admin";

export default async function AdminHome() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const sites = await listAdminSites();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Link href="/admin/requests" className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-900">Requests inbox →</Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr><th className="px-4 py-2">Site</th><th className="px-4 py-2">Owner</th><th className="px-4 py-2">Plan</th><th className="px-4 py-2">Last score</th><th className="px-4 py-2">Open requests</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {sites.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-neutral-500">No customers yet.</td></tr>}
            {sites.map((s) => (
              <tr key={s.id} className="hover:bg-neutral-900">
                <td className="px-4 py-2"><Link href={`/admin/sites/${s.id}`} className="font-medium underline-offset-2 hover:underline">{s.domain}</Link></td>
                <td className="px-4 py-2 text-neutral-300">{s.ownerEmail}</td>
                <td className="px-4 py-2">{s.plan}</td>
                <td className="px-4 py-2 font-mono">{s.lastScanScore ?? "—"}</td>
                <td className="px-4 py-2">{s.openRequests > 0 ? <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300">{s.openRequests}</span> : <span className="text-neutral-600">0</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
