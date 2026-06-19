import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { listSites } from "@/lib/sites";
import { isAdmin } from "@/lib/auth/roles";
import { env } from "@/lib/env";
import { AddSiteForm } from "@/components/AddSiteForm";
import { SnippetBox } from "@/components/SnippetBox";

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sites = user ? await listSites(supabase, user.id) : [];
  const admin = isAdmin(user?.email, env.ADMIN_EMAILS);

  return (
    <div className="space-y-10">
      {admin && (
        <div className="flex justify-end">
          <Link
            href="/admin"
            className="transition-base inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:border-neutral-300 hover:shadow"
          >
            Admin CRM <span aria-hidden>→</span>
          </Link>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-100 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
            Free accessibility scan · 30 seconds
          </span>
          <h1 className="font-display mt-5 text-3xl font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-[2.6rem]">
            See exactly who your website is <span className="text-gradient">turning away</span>.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-neutral-600">
            One in four visitors hits a wall on a site they can&apos;t use — and you never see them
            leave. Add your site, get a free scan, and win those customers back.
          </p>
          <div className="mt-7 max-w-xl">
            <AddSiteForm />
            <p className="mt-2.5 text-xs text-neutral-400">No code to install for the scan — just your domain.</p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">Your sites</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {sites.length === 0
              ? "Your scanned sites will appear here."
              : "Open a site to see what it's costing you — and fix it."}
          </p>
        </div>

        {sites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-10 text-center">
            <p className="text-sm text-neutral-500">
              No sites yet. Add your first domain above to get your free score.
            </p>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2">
            {sites.map((s) => (
              <li
                key={s.id}
                className="transition-base rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-900">{s.domain}</p>
                    <span className="mt-1 inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium capitalize text-neutral-600">
                      {s.plan} plan
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/sites/${s.id}`}
                    className="transition-base shrink-0 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                  >
                    Open
                  </Link>
                </div>
                <SnippetBox siteId={s.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
