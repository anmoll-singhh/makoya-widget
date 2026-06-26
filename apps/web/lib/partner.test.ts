import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  partnerAccountRowToRecord,
  partnerClientRowToRecord,
  whiteLabelRowToRecord,
  commissionRowToRecord,
  commissionFor,
  summarizePartner,
  getPartnerForOrg,
  listPartnerClients,
  getWhiteLabel,
  listCommissions,
  enrollPartner,
  addPartnerClient,
  upsertWhiteLabel,
  recordCommission,
} from "./partner";

// ── A tiny chainable Supabase fake (mirrors lib/org.test.ts) ──────────────────
// Each table maps to a builder that records insert/update/upsert payloads and
// resolves to a preset { data, error }. The builder is thenable so `await query`
// works for list reads; maybeSingle/single resolve single-row reads.
type FakeBuilder = {
  captured: { inserted?: unknown; updated?: unknown; upserted?: unknown };
} & Record<string, unknown>;

function builder(result: { data: unknown; error: unknown }): FakeBuilder {
  const captured: { inserted?: unknown; updated?: unknown; upserted?: unknown } = {};
  const b = {} as FakeBuilder;
  Object.assign(b, {
    captured,
    select: () => b,
    insert: (v: unknown) => {
      captured.inserted = v;
      return b;
    },
    update: (v: unknown) => {
      captured.updated = v;
      return b;
    },
    upsert: (v: unknown) => {
      captured.upserted = v;
      return b;
    },
    eq: () => b,
    order: () => b,
    limit: () => b,
    single: async () => result,
    maybeSingle: async () => result,
    then: (resolve: (r: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  });
  return b;
}

function fakeClient(tables: Record<string, ReturnType<typeof builder>>) {
  return {
    from: (t: string) => {
      const found = tables[t];
      if (!found) throw new Error(`unexpected table ${t}`);
      return found;
    },
  } as unknown as SupabaseClient;
}

// ── Mappers (pure) ────────────────────────────────────────────────────────────

describe("partnerAccountRowToRecord", () => {
  it("maps snake_case to camelCase and coerces commission_rate to a number", () => {
    const r = partnerAccountRowToRecord({
      id: "p1",
      org_id: "o1",
      status: "active",
      commission_rate: "0.2000",
      white_label_enabled: true,
      created_at: "2026-06-26T00:00:00Z",
    });
    expect(r).toEqual({
      id: "p1",
      orgId: "o1",
      status: "active",
      commissionRate: 0.2,
      whiteLabelEnabled: true,
      createdAt: "2026-06-26T00:00:00Z",
    });
  });
});

describe("partnerClientRowToRecord", () => {
  it("maps a client link row", () => {
    const r = partnerClientRowToRecord({
      id: "c1",
      partner_id: "p1",
      client_org_id: "o2",
      created_at: "t",
    });
    expect(r).toEqual({ id: "c1", partnerId: "p1", clientOrgId: "o2", createdAt: "t" });
  });
});

describe("whiteLabelRowToRecord", () => {
  it("maps the branding row", () => {
    const r = whiteLabelRowToRecord({
      partner_id: "p1",
      brand_name: "Agency",
      logo_url: "https://x/logo.png",
      primary_color: "#123456",
      support_email: "help@agency.com",
      hide_makoya_branding: false,
      updated_at: "t",
    });
    expect(r).toEqual({
      partnerId: "p1",
      brandName: "Agency",
      logoUrl: "https://x/logo.png",
      primaryColor: "#123456",
      supportEmail: "help@agency.com",
      hideMakoyaBranding: false,
      updatedAt: "t",
    });
  });
});

describe("commissionRowToRecord", () => {
  it("maps a commission row and coerces amount_cents to a number", () => {
    const r = commissionRowToRecord({
      id: "m1",
      partner_id: "p1",
      period: "2026-06",
      amount_cents: "1500",
      status: "pending",
      created_at: "t",
    });
    expect(r).toEqual({
      id: "m1",
      partnerId: "p1",
      period: "2026-06",
      amountCents: 1500,
      status: "pending",
      createdAt: "t",
    });
  });
});

// ── Pure helpers ──────────────────────────────────────────────────────────────

describe("commissionFor", () => {
  it("computes price * rate floored to whole cents", () => {
    expect(commissionFor(10000, 0.2)).toBe(2000);
    expect(commissionFor(999, 0.2)).toBe(199); // 199.8 → floor
    expect(commissionFor(333, 0.3333)).toBe(110); // 110.98... → floor
  });
  it("clamps rate to 0..1", () => {
    expect(commissionFor(10000, 1.5)).toBe(10000);
    expect(commissionFor(10000, -0.5)).toBe(0);
  });
  it("guards non-finite / negative inputs to 0", () => {
    expect(commissionFor(Number.NaN, 0.2)).toBe(0);
    expect(commissionFor(-100, 0.2)).toBe(0);
    expect(commissionFor(10000, Number.NaN)).toBe(0);
    expect(commissionFor(Number.POSITIVE_INFINITY, 0.2)).toBe(0);
  });
});

describe("summarizePartner", () => {
  it("aggregates client count, agents managed, and monthly revenue", () => {
    const s = summarizePartner([
      { agents: 3, monthlyRevenueCents: 2000 },
      { agents: 1, monthlyRevenueCents: 500 },
      { agents: 5, monthlyRevenueCents: 0 },
    ]);
    expect(s).toEqual({ clientCount: 3, agentsManaged: 9, monthlyRevenueCents: 2500 });
  });
  it("returns zeros for an empty portfolio", () => {
    expect(summarizePartner([])).toEqual({
      clientCount: 0,
      agentsManaged: 0,
      monthlyRevenueCents: 0,
    });
  });
  it("treats non-finite / negative parts as 0", () => {
    const s = summarizePartner([
      { agents: Number.NaN, monthlyRevenueCents: -100 },
      { agents: -3, monthlyRevenueCents: Number.POSITIVE_INFINITY },
      { agents: 2, monthlyRevenueCents: 1000 },
    ]);
    expect(s).toEqual({ clientCount: 3, agentsManaged: 2, monthlyRevenueCents: 1000 });
  });
});

// ── Reads (fake client) ───────────────────────────────────────────────────────

describe("getPartnerForOrg", () => {
  it("returns the partner account for an org", async () => {
    const client = fakeClient({
      partner_accounts: builder({
        data: {
          id: "p1",
          org_id: "o1",
          status: "active",
          commission_rate: "0.2000",
          white_label_enabled: false,
          created_at: "t",
        },
        error: null,
      }),
    });
    const p = await getPartnerForOrg(client, "o1");
    expect(p?.id).toBe("p1");
    expect(p?.commissionRate).toBe(0.2);
  });
  it("returns null when the org is not a partner", async () => {
    const client = fakeClient({ partner_accounts: builder({ data: null, error: null }) });
    expect(await getPartnerForOrg(client, "o1")).toBeNull();
  });
  it("throws on an infra error", async () => {
    const client = fakeClient({
      partner_accounts: builder({ data: null, error: { message: "boom" } }),
    });
    await expect(getPartnerForOrg(client, "o1")).rejects.toBeTruthy();
  });
});

describe("listPartnerClients", () => {
  it("maps every client link row", async () => {
    const client = fakeClient({
      partner_clients: builder({
        data: [
          { id: "c1", partner_id: "p1", client_org_id: "o2", created_at: "t" },
          { id: "c2", partner_id: "p1", client_org_id: "o3", created_at: "t" },
        ],
        error: null,
      }),
    });
    const rows = await listPartnerClients(client, "p1");
    expect(rows).toHaveLength(2);
    expect(rows[1].clientOrgId).toBe("o3");
  });
});

describe("getWhiteLabel", () => {
  it("returns the branding config or null", async () => {
    const client = fakeClient({
      white_label_config: builder({
        data: {
          partner_id: "p1",
          brand_name: "Agency",
          logo_url: "",
          primary_color: "",
          support_email: "",
          hide_makoya_branding: true,
          updated_at: "t",
        },
        error: null,
      }),
    });
    const wl = await getWhiteLabel(client, "p1");
    expect(wl?.brandName).toBe("Agency");

    const none = fakeClient({ white_label_config: builder({ data: null, error: null }) });
    expect(await getWhiteLabel(none, "p1")).toBeNull();
  });
});

describe("listCommissions", () => {
  it("maps every commission row", async () => {
    const client = fakeClient({
      partner_commissions: builder({
        data: [{ id: "m1", partner_id: "p1", period: "2026-06", amount_cents: 1500, status: "pending", created_at: "t" }],
        error: null,
      }),
    });
    const rows = await listCommissions(client, "p1");
    expect(rows).toHaveLength(1);
    expect(rows[0].amountCents).toBe(1500);
  });
});

// ── Writes (service client) ───────────────────────────────────────────────────

describe("enrollPartner", () => {
  it("inserts a partner_accounts row for the org", async () => {
    const tbl = builder({
      data: {
        id: "p1",
        org_id: "o1",
        status: "active",
        commission_rate: "0.2000",
        white_label_enabled: false,
        created_at: "t",
      },
      error: null,
    });
    const p = await enrollPartner(fakeClient({ partner_accounts: tbl }), "o1");
    expect(p.id).toBe("p1");
    expect((tbl.captured.inserted as Record<string, unknown>).org_id).toBe("o1");
  });
});

describe("addPartnerClient", () => {
  it("inserts a partner_clients link row", async () => {
    const tbl = builder({
      data: { id: "c1", partner_id: "p1", client_org_id: "o2", created_at: "t" },
      error: null,
    });
    const c = await addPartnerClient(fakeClient({ partner_clients: tbl }), "p1", "o2");
    expect(c.clientOrgId).toBe("o2");
    const inserted = tbl.captured.inserted as Record<string, unknown>;
    expect(inserted.partner_id).toBe("p1");
    expect(inserted.client_org_id).toBe("o2");
  });
});

describe("upsertWhiteLabel", () => {
  it("upserts only the patched branding fields (mapped to snake_case)", async () => {
    const tbl = builder({
      data: {
        partner_id: "p1",
        brand_name: "Agency",
        logo_url: "",
        primary_color: "#000",
        support_email: "",
        hide_makoya_branding: true,
        updated_at: "t",
      },
      error: null,
    });
    const wl = await upsertWhiteLabel(fakeClient({ white_label_config: tbl }), "p1", {
      brandName: "Agency",
      primaryColor: "#000",
    });
    expect(wl.brandName).toBe("Agency");
    const up = tbl.captured.upserted as Record<string, unknown>;
    expect(up.partner_id).toBe("p1");
    expect(up.brand_name).toBe("Agency");
    expect(up.primary_color).toBe("#000");
    // unpatched fields are not forced into the payload
    expect("logo_url" in up).toBe(false);
    // updated_at is always refreshed
    expect(up.updated_at).toBeTruthy();
  });
});

describe("recordCommission", () => {
  it("upserts a commission for the period", async () => {
    const tbl = builder({
      data: { id: "m1", partner_id: "p1", period: "2026-06", amount_cents: 1500, status: "pending", created_at: "t" },
      error: null,
    });
    const m = await recordCommission(fakeClient({ partner_commissions: tbl }), {
      partnerId: "p1",
      period: "2026-06",
      amountCents: 1500,
    });
    expect(m.amountCents).toBe(1500);
    const up = tbl.captured.upserted as Record<string, unknown>;
    expect(up.partner_id).toBe("p1");
    expect(up.period).toBe("2026-06");
    expect(up.amount_cents).toBe(1500);
  });
});
