import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { listConsultationRequests } from "@/lib/admin";
import { StatusSelect } from "@/components/admin/StatusSelect";

export default async function AdminRequests() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const requests = await listConsultationRequests();
  const open = requests.filter((r) => r.status === "new").length;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Consultation requests</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {open > 0 ? `${open} new request${open === 1 ? "" : "s"} waiting on you.` : "All caught up."}
          </p>
        </div>
        <Link href="/admin" className="transition-base text-sm font-medium text-neutral-400 hover:text-white">
          ← Customers
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Site</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/70">
            {requests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-neutral-500">
                  No requests yet — they appear when a customer asks for the full report or a call.
                </td>
              </tr>
            )}
            {requests.map((r) => (
              <tr key={r.id} className="transition-base hover:bg-neutral-800/40">
                <td className="px-5 py-3">
                  <Link href={`/admin/sites/${r.siteId}`} className="font-semibold text-white underline-offset-2 hover:underline">
                    {r.siteDomain}
                  </Link>
                </td>
                <td className="px-5 py-3 text-neutral-300">{r.type === "book_call" ? "Book a call" : "Full report"}</td>
                <td className="px-5 py-3 text-neutral-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-5 py-3">
                  <StatusSelect id={r.id} status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
