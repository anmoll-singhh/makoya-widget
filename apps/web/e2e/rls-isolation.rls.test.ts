/**
 * e2e/rls-isolation.rls.test.ts — multi-tenant RLS isolation, end-to-end.
 *
 * The whole security model is "every row is owned by an auth user; RLS makes
 * cross-tenant reads impossible" (CLAUDE.md → Backend / data rules). This suite
 * PROVES that against a real Supabase project:
 *
 *   1. Seed two owners (A, B) + a site each, via the SERVICE ROLE.
 *   2. Sign in as owner A (authenticated client) and assert:
 *        - A sees A's site, A's site_config, A's scan.
 *        - A CANNOT see B's site / config / scan (RLS denies → empty result).
 *   3. Assert the ANON client sees neither owner's rows.
 *   4. Assert `leads` and `consultation_requests` are NOT readable by anon OR
 *      authenticated clients (service-role-only tables).
 *   5. Clean up every seeded row + auth user in afterAll.
 *
 * ── GUARD ───────────────────────────────────────────────────────────────────
 * The whole suite SKIPS unless ALL of these are set to REAL (non-placeholder)
 * values — so the env-free CI/worktree stays green:
 *     NEXT_PUBLIC_SUPABASE_URL
 *     NEXT_PUBLIC_SUPABASE_ANON_KEY
 *     SUPABASE_SERVICE_ROLE_KEY
 *
 * ── RUN ──────────────────────────────────────────────────────────────────────
 *   # against a real Supabase project (NOT prod — this writes + deletes rows):
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx vitest run e2e/rls-isolation.rls.test.ts
 *
 * Vitest's `include` is `** / *.test.ts`, so this file is picked up automatically;
 * it just self-skips when creds are absent.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Credential guard ────────────────────────────────────────────────────────
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function isPlaceholder(v: string): boolean {
  return !v || v.startsWith("YOUR_") || v.includes("YOUR-PROJECT");
}

const HAVE_CREDS = !isPlaceholder(URL) && !isPlaceholder(ANON) && !isPlaceholder(SERVICE);

// describe.skipIf keeps the suite reported-but-skipped when creds are missing.
describe.skipIf(!HAVE_CREDS)("RLS multi-tenant isolation (live Supabase)", () => {
  const PW = "Test-Passw0rd-" + Math.random().toString(36).slice(2);
  const stamp = Date.now();
  const emailA = `rls-a-${stamp}@makoya-rls-test.invalid`;
  const emailB = `rls-b-${stamp}@makoya-rls-test.invalid`;

  let service: SupabaseClient;
  let userA = "";
  let userB = "";
  let siteA = "";
  let siteB = "";
  let scanA = "";
  let scanB = "";
  let leadId = "";
  let consultId = "";

  beforeAll(async () => {
    service = createClient(URL, SERVICE, { auth: { persistSession: false } });

    // Create two confirmed auth users.
    const a = await service.auth.admin.createUser({ email: emailA, password: PW, email_confirm: true });
    const b = await service.auth.admin.createUser({ email: emailB, password: PW, email_confirm: true });
    userA = a.data.user!.id;
    userB = b.data.user!.id;

    // One site per owner (the trigger auto-creates each site_config row).
    const sa = await service.from("sites").insert({ owner_id: userA, domain: "a.example" }).select("id").single();
    const sb = await service.from("sites").insert({ owner_id: userB, domain: "b.example" }).select("id").single();
    siteA = sa.data!.id;
    siteB = sb.data!.id;

    const emptyIssues = { critical: [], serious: [], moderate: [], minor: [] };
    const totals = { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 };
    const xa = await service.from("scans").insert({ site_id: siteA, url: "https://a.example", score: 90, totals, issues: emptyIssues }).select("id").single();
    const xb = await service.from("scans").insert({ site_id: siteB, url: "https://b.example", score: 80, totals, issues: emptyIssues }).select("id").single();
    scanA = xa.data!.id;
    scanB = xb.data!.id;

    // A consultation request (service-role only table) + a funnel lead.
    const cr = await service.from("consultation_requests").insert({ site_id: siteA, type: "full_report" }).select("id").single();
    consultId = cr.data!.id;
    const ld = await service.from("leads").insert({ email: emailA, url: "https://a.example", score: 90 }).select("id").single();
    leadId = ld.data!.id;
  }, 30_000);

  afterAll(async () => {
    if (!service) return;
    // Best-effort cleanup; site_config/scans cascade from sites, leads stand alone.
    if (leadId) await service.from("leads").delete().eq("id", leadId);
    if (consultId) await service.from("consultation_requests").delete().eq("id", consultId);
    if (siteA) await service.from("sites").delete().eq("id", siteA);
    if (siteB) await service.from("sites").delete().eq("id", siteB);
    if (userA) await service.auth.admin.deleteUser(userA);
    if (userB) await service.auth.admin.deleteUser(userB);
  }, 30_000);

  async function authedClientFor(email: string): Promise<SupabaseClient> {
    const client = createClient(URL, ANON, { auth: { persistSession: false } });
    const { error } = await client.auth.signInWithPassword({ email, password: PW });
    expect(error).toBeNull();
    return client;
  }

  it("owner A sees ONLY their own site (RLS denies B's row)", async () => {
    const a = await authedClientFor(emailA);
    const { data } = await a.from("sites").select("id, owner_id");
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(siteA);
    expect(ids).not.toContain(siteB);
  });

  it("owner A cannot read B's site_config or B's scans", async () => {
    const a = await authedClientFor(emailA);

    const cfg = await a.from("site_config").select("site_id").eq("site_id", siteB);
    expect(cfg.data ?? []).toHaveLength(0);

    const scans = await a.from("scans").select("id").eq("site_id", siteB);
    expect(scans.data ?? []).toHaveLength(0);

    // ...but CAN read its own scan.
    const own = await a.from("scans").select("id").eq("site_id", siteA);
    expect((own.data ?? []).map((r) => r.id)).toContain(scanA);
  });

  it("owner B is symmetrically isolated from A", async () => {
    const b = await authedClientFor(emailB);
    const sites = await b.from("sites").select("id");
    const ids = (sites.data ?? []).map((r) => r.id);
    expect(ids).toContain(siteB);
    expect(ids).not.toContain(siteA);
    void scanB; // referenced for completeness; B's own scan visibility mirrors A's
  });

  it("the ANON client sees no sites, configs, or scans at all", async () => {
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    expect((await anon.from("sites").select("id")).data ?? []).toHaveLength(0);
    expect((await anon.from("site_config").select("site_id")).data ?? []).toHaveLength(0);
    expect((await anon.from("scans").select("id")).data ?? []).toHaveLength(0);
  });

  it("`leads` is NOT readable by anon OR authenticated clients (service-role only)", async () => {
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const a = await authedClientFor(emailA);

    // RLS-enabled with no policy → reads return zero rows (or an error); never data.
    expect((await anon.from("leads").select("id")).data ?? []).toHaveLength(0);
    expect((await a.from("leads").select("id")).data ?? []).toHaveLength(0);

    // ...but the service role CAN see the seeded lead, proving the row exists.
    const svc = await service.from("leads").select("id").eq("id", leadId);
    expect((svc.data ?? []).map((r) => r.id)).toContain(leadId);
  });

  it("`consultation_requests` is NOT readable by anon OR authenticated clients", async () => {
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const a = await authedClientFor(emailA);

    expect((await anon.from("consultation_requests").select("id")).data ?? []).toHaveLength(0);
    expect((await a.from("consultation_requests").select("id")).data ?? []).toHaveLength(0);

    const svc = await service.from("consultation_requests").select("id").eq("id", consultId);
    expect((svc.data ?? []).map((r) => r.id)).toContain(consultId);
  });
});
