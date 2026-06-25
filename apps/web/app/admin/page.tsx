import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { listAdminSites } from "@/lib/admin";

function scoreClass(score: number | null) {
  if (score === null) return "bg-[var(--surface-2)] text-[var(--ink-600)]";
  if (score >= 80) return "bg-[var(--color-sev-passed)]/15 text-[var(--color-sev-passed)] ring-1 ring-[var(--color-sev-passed)]/30";
  if (score >= 60) return "bg-[var(--color-sev-moderate)]/15 text-[var(--color-sev-moderate)] ring-1 ring-[var(--color-sev-moderate)]/30";
  return "bg-[var(--color-sev-critical)]/15 text-[var(--color-sev-critical)] ring-1 ring-[var(--color-sev-critical)]/30";
}

export default async function AdminHome() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const sites = await listAdminSites();

  const openTotal = sites.reduce((n, s) => n + s.openRequests, 0);
  const scored = sites.filter((s) => s.lastScanScore !== null);
  const avg = scored.length ? Math.round(scored.reduce((n, s) => n + (s.lastScanScore ?? 0), 0) / scored.length) : null;

  const stats = [
    { label: "Customers", value: sites.length },
    { label: "Open requests", value: openTotal, accent: openTotal > 0 },
    { label: "Avg. score", value: avg ?? "—" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-[var(--ink-600)]">Everyone running Makoya — and who needs you.</p>
        </div>
        <Link
          href="/admin/requests"
          className="transition-colors inline-flex items-center gap-2 rounded-xl bg-signal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-signal-500"
        >
          Requests inbox
          {openTotal > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 text-xs font-bold">{openTotal}</span>
          )}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className={`font-sans text-3xl font-extrabold ${s.accent ? "text-[var(--color-sev-moderate)]" : "text-[var(--ink-900)]"}`}>
              {s.value}
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--ink-600)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--ink-600)]">
            <tr>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Last score</th>
              <th className="px-5 py-3 font-medium">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sites.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-[var(--ink-600)]">
                  No customers yet — they&apos;ll appear here as people add sites.
                </td>
              </tr>
            )}
            {sites.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-[var(--surface-2)]">
                <td className="px-5 py-3">
                  <Link href={`/admin/sites/${s.id}`} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-signal-600 text-sm font-bold text-white">
                      {(s.domain[0] ?? "?").toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[var(--ink-900)] underline-offset-2 group-hover:underline">
                        {s.domain}
                      </span>
                      <span className="block truncate text-xs text-[var(--ink-600)]">{s.ownerEmail}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium capitalize text-[var(--ink-900)]">
                    {s.plan}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreClass(s.lastScanScore)}`}>
                    {s.lastScanScore ?? "—"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {s.openRequests > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-[var(--color-sev-moderate)]/20 px-2 py-0.5 text-xs font-bold text-[var(--color-sev-moderate)]">
                      {s.openRequests}
                    </span>
                  ) : (
                    <span className="text-[var(--ink-600)]">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
