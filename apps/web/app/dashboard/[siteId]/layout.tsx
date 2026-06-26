/**
 * app/dashboard/[siteId]/layout.tsx  (RSC)
 *
 * Nested layout for all per-agent routes (/dashboard/[siteId]/*).
 *
 * Responsibilities:
 *  1. Fast 404/redirect guard — calls requireAgent() which:
 *       - Redirects to /login?next=… when there is no active session.
 *       - Returns notFound() when the siteId doesn't exist or isn't owned
 *         by the signed-in user.
 *  2. Render {children} — the actual per-screen page.tsx.
 *
 * The global app/dashboard/layout.tsx (parent) already renders the Shell
 * (sidebar + topbar) around every /dashboard/* route, so this nested layout
 * adds no visual chrome — it is purely a security guard.
 *
 * Why a separate layout instead of doing the check in each page.tsx?
 * Next.js layouts cache their segment render between navigations, so a quick
 * client-side tab switch (Overview → Mike → Install) doesn't re-run this check
 * per page — only the page.tsx refetches data. The guard still fires on every
 * HARD navigation (initial load, refresh, deep link) which is the safety
 * contract we need.
 */
import { type ReactNode } from "react";
import { requireAgent } from "@/lib/agent-context";

export default async function AgentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  // Guard: throws redirect or notFound() — never returns on failure.
  await requireAgent(siteId);

  return <>{children}</>;
}
