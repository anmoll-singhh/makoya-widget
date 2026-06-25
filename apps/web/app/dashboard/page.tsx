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
import { mintSiteToken } from "@/lib/licensing/token";
import { Customizer } from "@/components/customizer/Customizer";
import { SnippetBox } from "@/components/SnippetBox";

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
  if (sites.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-md space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
            <span className="text-2xl" aria-hidden="true">⏳</span>
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--ink-900)]">
            Your widget is being set up
          </h1>
          <p className="text-sm leading-relaxed text-[var(--ink-600)]">
            Your operator will hand over access shortly. Once your site is
            provisioned it will appear here automatically — no action needed.
          </p>
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

  // Mint the install token SERVER-SIDE (the signing secret never crosses to the
  // client) and hand it to SnippetBox as a plain prop, so merchants can copy the
  // contract snippet + bare Site ID / Token into their platform's install form.
  const token = mintSiteToken(activeSiteId);

  return (
    <>
      <section className="mx-auto mb-6 max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="font-display text-base font-bold text-[var(--ink-900)]">Install your widget</h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--ink-600)]">
          Paste this snippet into your site (before <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-[12px]">&lt;/head&gt;</code>),
          or enter the Site ID + Token into the Makoya plugin for your platform.
        </p>
        <SnippetBox siteId={activeSiteId} token={token} />
      </section>

      <Customizer
        key={activeSiteId}
        sites={sites}
        activeSiteId={activeSiteId}
        initialConfig={config}
        plan={activeSite.plan}
      />
    </>
  );
}
