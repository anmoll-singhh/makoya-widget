/**
 * app/dashboard/sites/[id]/page.tsx
 *
 * Legacy route — the per-site detail view has been superseded by the
 * customizer-first landing (/dashboard?site=<id>).  This redirect keeps
 * old bookmarks and back-links working.
 */

import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SiteDetailPage({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard?site=${id}`);
}
