import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { listConsultationRequests } from "@/lib/admin";
import { StatusSelect } from "@/components/admin/StatusSelect";

export default async function AdminRequests() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const requests = await listConsultationRequests();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Consultation requests</h1>
        <Link href="/admin" className="text-sm text-neutral-400 hover:text-neutral-100">← Customers</Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr><th className="px-4 py-2">Site</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">When</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {requests.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-neutral-500">No requests yet.</td></tr>}
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-neutral-900">
                <td className="px-4 py-2"><Link href={`/admin/sites/${r.siteId}`} className="underline-offset-2 hover:underline">{r.siteDomain}</Link></td>
                <td className="px-4 py-2">{r.type === "book_call" ? "Book a call" : "Full report"}</td>
                <td className="px-4 py-2 text-neutral-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2"><StatusSelect id={r.id} status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
