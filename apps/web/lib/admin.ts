import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Plan, RequestStatus } from "@/lib/admin-constants";

/** id -> email for all auth users (paged). */
async function emailMap(): Promise<Map<string, string>> {
  const admin = getAdminSupabase();
  const map = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) if (u.email) map.set(u.id, u.email);
    if (data.users.length < 1000) break;
    page++;
  }
  return map;
}

export interface AdminSiteRow {
  id: string; domain: string; plan: string; createdAt: string;
  ownerEmail: string; lastScanScore: number | null; openRequests: number;
}

export async function listAdminSites(): Promise<AdminSiteRow[]> {
  const admin = getAdminSupabase();
  const [{ data: sites, error }, emails] = await Promise.all([
    admin.from("sites").select("id, owner_id, domain, plan, created_at").order("created_at", { ascending: false }),
    emailMap(),
  ]);
  if (error) console.error("[admin] listAdminSites sites query:", error.message);
  // Per-site scan + open-count run in parallel across all sites (not serial).
  return Promise.all((sites ?? []).map(async (s) => {
    const [{ data: latest }, { count }] = await Promise.all([
      admin.from("scans").select("score").eq("site_id", s.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("consultation_requests").select("id", { count: "exact", head: true }).eq("site_id", s.id).eq("status", "new"),
    ]);
    return {
      id: s.id, domain: s.domain, plan: s.plan, createdAt: s.created_at,
      ownerEmail: emails.get(s.owner_id) ?? "(unknown)",
      lastScanScore: latest?.score ?? null, openRequests: count ?? 0,
    };
  }));
}

export interface AdminRequest {
  id: string; siteId: string; siteDomain: string; type: string; status: string; note: string | null; createdAt: string;
}

export interface AdminSiteDetail {
  id: string; domain: string; plan: string; createdAt: string; ownerEmail: string;
  scans: { id: string; score: number; totals: unknown; createdAt: string }[];
  requests: AdminRequest[];
}

export async function getAdminSiteDetail(siteId: string): Promise<AdminSiteDetail | null> {
  const admin = getAdminSupabase();
  const { data: s, error: sErr } = await admin.from("sites").select("id, owner_id, domain, plan, created_at").eq("id", siteId).maybeSingle();
  if (sErr) console.error("[admin] getAdminSiteDetail site query:", sErr.message);
  if (!s) return null;
  // Resolve just this one owner's email (not the full user list).
  const { data: ownerData } = await admin.auth.admin.getUserById(s.owner_id);
  const { data: scans } = await admin.from("scans").select("id, score, totals, created_at")
    .eq("site_id", siteId).order("created_at", { ascending: false }).limit(20);
  const { data: reqs } = await admin.from("consultation_requests").select("*")
    .eq("site_id", siteId).order("created_at", { ascending: false });
  return {
    id: s.id, domain: s.domain, plan: s.plan, createdAt: s.created_at,
    ownerEmail: ownerData?.user?.email ?? "(unknown)",
    scans: (scans ?? []).map((x) => ({ id: x.id, score: x.score, totals: x.totals, createdAt: x.created_at })),
    requests: (reqs ?? []).map((r) => ({ id: r.id, siteId: r.site_id, siteDomain: s.domain, type: r.type, status: r.status, note: r.note, createdAt: r.created_at })),
  };
}

export async function updateSitePlan(siteId: string, plan: Plan): Promise<void> {
  const { error } = await getAdminSupabase().from("sites").update({ plan }).eq("id", siteId);
  if (error) throw error;
}

export async function listConsultationRequests(): Promise<AdminRequest[]> {
  const admin = getAdminSupabase();
  const [{ data: reqs }, { data: sites }] = await Promise.all([
    admin.from("consultation_requests").select("*").order("created_at", { ascending: false }),
    admin.from("sites").select("id, domain"),
  ]);
  const domainById = new Map((sites ?? []).map((s) => [s.id, s.domain]));
  return (reqs ?? []).map((r) => ({
    id: r.id, siteId: r.site_id, siteDomain: domainById.get(r.site_id) ?? "(deleted site)",
    type: r.type, status: r.status, note: r.note, createdAt: r.created_at,
  }));
}

export async function updateConsultationStatus(id: string, status: RequestStatus): Promise<void> {
  const { error } = await getAdminSupabase().from("consultation_requests").update({ status }).eq("id", id);
  if (error) throw error;
}
