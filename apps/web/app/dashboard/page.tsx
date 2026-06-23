/**
 * app/dashboard/page.tsx  (RSC)
 *
 * Customizer-first dashboard landing. Resolves the active site from the
 * ?site= search-param (validated against the user's owned sites via RLS),
 * loads its config, and hands off to <Customizer>.
 *
 * No self-serve "add site" form — operators provision sites through the
 * admin CRM; clients receive access from their operator.
 *
 * Empty-state: calm message rather than a dead form.
 */

import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { listSites, getConfig } from "@/lib/sites";
import { Customizer } from "@/components/customizer/Customizer";

interface Props {
  searchParams: Promise<{ site?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sites = user ? await listSites(supabase, user.id) : [];

  // ── Empty state ───────────────────────────────────────────────────────────
  // Calm, reassuring "being provisioned" state. No dead form, no emoji — a
  // tasteful brand glyph, a clear status pill, and a short list that sets the
  // expectation that everything arrives automatically.
  if (sites.length === 0) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-5 border-b border-neutral-100 bg-gradient-to-br from-brand-50 to-white px-8 pb-8 pt-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-sm shadow-brand-600/30">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 6v6l3.5 2" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
                Setting things up
              </span>
              <h1 className="font-display text-xl font-bold tracking-tight text-neutral-900">
                Your widget is being set up
              </h1>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-neutral-500">
                Your operator is provisioning your site. Once it&apos;s ready,
                everything below appears here automatically — there&apos;s nothing
                you need to do.
              </p>
            </div>
          </div>
          <ul className="divide-y divide-neutral-100 text-sm">
            {[
              ["Your customizable accessibility widget", "Tune the launcher, colours, and tools, then publish."],
              ["A plain-language accessibility report", "See what's helping visitors and what to improve."],
              ["On-demand re-scans", "Re-check your site any time with one click."],
            ].map(([title, desc]) => (
              <li key={title} className="flex items-start gap-3 px-8 py-4">
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-400"
                  aria-hidden="true"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 6.5 5 9l4.5-5.5" />
                  </svg>
                </span>
                <span>
                  <span className="font-medium text-neutral-800">{title}</span>
                  <span className="block text-neutral-500">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ── Resolve active site (validate ?site= against owned sites) ─────────────
  const ownedIds = new Set(sites.map((s) => s.id));
  const activeSiteId =
    sp.site && ownedIds.has(sp.site) ? sp.site : sites[0].id;
  const activeSite = sites.find((s) => s.id === activeSiteId)!;

  const config = await getConfig(supabase, activeSiteId);
  if (!config) return notFound();

  return (
    <Customizer
      key={activeSiteId}
      sites={sites}
      activeSiteId={activeSiteId}
      initialConfig={config}
      plan={activeSite.plan}
    />
  );
}
