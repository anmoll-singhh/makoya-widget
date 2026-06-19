import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite, getConfig } from "@/lib/sites";
import { ConfigEditor } from "@/components/ConfigEditor";
import { ScanReport } from "@/components/ScanReport";

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const site = user ? await getSite(supabase, id) : null;
  if (!site || site.ownerId !== user!.id) notFound();
  const config = await getConfig(supabase, id);
  if (!config) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="transition-base inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <span aria-hidden>←</span> All sites
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900">{site.domain}</h1>
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium capitalize text-neutral-600">
            {site.plan} plan
          </span>
        </div>
      </div>

      {/* Report first — it's what they came to see (and where they convert) */}
      <ScanReport siteId={site.id} />

      <div>
        <h2 className="font-display text-lg font-bold tracking-tight text-neutral-900">Customize your widget</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Make it look like yours. Changes go live on your site within minutes.
        </p>
        <div className="mt-4">
          <ConfigEditor siteId={site.id} plan={site.plan} initial={config} />
        </div>
      </div>
    </div>
  );
}
