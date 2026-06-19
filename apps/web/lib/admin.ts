import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Plan, RequestStatus } from "@/lib/admin-constants";
import { createSite } from "@/lib/sites";
import { issueCountFromTotals } from "@/lib/issue-count-utils";

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

// Re-export for testing; defined in issue-count-utils to avoid server-only import issues.
export { issueCountFromTotals };

function generateTempPassword(): string {
  // 16 url-safe chars; not security-critical (operator hands it over, user can reset).
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "Mk-" + Buffer.from(bytes).toString("base64url");
}

/**
 * Operator-led onboarding: ensure a Supabase auth user exists for `email`
 * (idempotent), then create a site owned by them. Returns a handover payload
 * the operator can give the client. No email vendor required.
 */
export async function createCustomer(args: { email: string; domain: string; plan?: Plan }): Promise<{
  email: string; tempPassword: string; siteId: string; created: boolean;
}> {
  const admin = getAdminSupabase();
  const email = args.email.trim().toLowerCase();
  const tempPassword = generateTempPassword();

  // Try to create; if the user already exists, find their id instead.
  let userId: string | null = null;
  let created = false;
  const { data: createdData, error: createErr } = await admin.auth.admin.createUser({
    email, password: tempPassword, email_confirm: true,
  });
  if (createdData?.user) { userId = createdData.user.id; created = true; }
  else if (createErr) {
    // Already registered → look the user up by paging the user list.
    for (let page = 1; !userId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      const hit = data.users.find((u) => u.email?.toLowerCase() === email);
      if (hit) userId = hit.id;
      if (data.users.length < 1000) break;
    }
    if (!userId) throw createErr;
  }
  if (!userId) throw new Error("could not resolve user id for customer");

  const site = await createSite(admin, userId, args.domain.trim());
  if (args.plan && args.plan !== "free") await updateSitePlan(site.id, args.plan);
  return { email, tempPassword: created ? tempPassword : "(existing user — unchanged)", siteId: site.id, created };
}

export interface AdminSiteRow {
  id: string; domain: string; plan: string; createdAt: string;
  ownerEmail: string; lastScanScore: number | null; openRequests: number;
  latestScore: number | null; issueCount: number | null;
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
      admin.from("scans").select("score, totals").eq("site_id", s.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("consultation_requests").select("id", { count: "exact", head: true }).eq("site_id", s.id).eq("status", "new"),
    ]);
    return {
      id: s.id, domain: s.domain, plan: s.plan, createdAt: s.created_at,
      ownerEmail: emails.get(s.owner_id) ?? "(unknown)",
      lastScanScore: latest?.score ?? null,
      latestScore: latest?.score ?? null,
      issueCount: issueCountFromTotals(latest?.totals ?? null),
      openRequests: count ?? 0,
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
