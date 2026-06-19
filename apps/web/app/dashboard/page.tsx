import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { listSites } from "@/lib/sites";
import { isAdmin } from "@/lib/auth/roles";
import { env } from "@/lib/env";
import { AddSiteForm } from "@/components/AddSiteForm";
import { SnippetBox } from "@/components/SnippetBox";

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const sites = user ? await listSites(supabase, user.id) : [];
  const admin = isAdmin(user?.email, env.ADMIN_EMAILS);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your sites</h1>
          <p className="mt-1 text-sm text-neutral-500">Add a site, customize its widget, and copy the install snippet.</p>
        </div>
        {admin && <Link href="/admin" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">Admin CRM →</Link>}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-700">Add a new site</h2>
        <div className="mt-3"><AddSiteForm /></div>
      </div>

      {sites.length === 0 ? (
        <p className="text-sm text-neutral-500">No sites yet — add your first one above.</p>
      ) : (
        <ul className="space-y-4">
          {sites.map((s) => (
            <li key={s.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{s.domain}</p>
                  <p className="text-xs text-neutral-500">Plan: {s.plan}</p>
                </div>
                <Link href={`/dashboard/sites/${s.id}`} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50">Customize</Link>
              </div>
              <SnippetBox siteId={s.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
