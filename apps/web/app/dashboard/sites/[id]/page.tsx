import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite, getConfig } from "@/lib/sites";
import { ConfigEditor } from "@/components/ConfigEditor";
import { ScanReport } from "@/components/ScanReport";

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const site = user ? await getSite(supabase, id) : null;
  if (!site || site.ownerId !== user!.id) notFound();
  const config = await getConfig(supabase, id);
  if (!config) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">← Back to sites</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Customize widget</h1>
        <p className="mt-1 text-sm text-neutral-500">{site.domain}</p>
      </div>
      <ConfigEditor siteId={site.id} plan={site.plan} initial={config} />
      <ScanReport siteId={site.id} />
    </div>
  );
}
