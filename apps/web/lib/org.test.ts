import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  orgRowToRecord,
  teamMemberRowToRecord,
  inviteRowToRecord,
  apiKeyRowToRecord,
  getMembershipForUser,
  getOrgForUser,
  listTeam,
  createInvite,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  emailsEqualCI,
  acceptInvite,
} from "./org";
import { hashApiKey } from "./api-keys";

// ── A tiny chainable Supabase fake ────────────────────────────────────────────
// Each table maps to a builder that records insert/update payloads and resolves
// to a preset { data, error }. The builder is thenable so `await query` works for
// list reads, and exposes maybeSingle/single for single-row reads.
type FakeBuilder = { captured: { inserted?: unknown; updated?: unknown } } & Record<string, unknown>;

function builder(result: { data: unknown; error: unknown }): FakeBuilder {
  const captured: { inserted?: unknown; updated?: unknown } = {};
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
      captured.inserted = v;
      return b;
    },
    eq: () => b,
    is: () => b,
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

describe("orgRowToRecord", () => {
  it("maps snake_case to camelCase", () => {
    const r = orgRowToRecord({
      id: "o1",
      name: "Acme",
      created_by: "u1",
      created_at: "2026-06-26T00:00:00Z",
    });
    expect(r).toEqual({ id: "o1", name: "Acme", createdBy: "u1", createdAt: "2026-06-26T00:00:00Z" });
  });
});

describe("teamMemberRowToRecord", () => {
  it("maps a row and tolerates a null user_id (unaccepted invite)", () => {
    const r = teamMemberRowToRecord({
      id: "m1",
      org_id: "o1",
      user_id: null,
      email: "a@b.com",
      role: "admin",
      created_at: "2026-06-26T00:00:00Z",
    });
    expect(r.userId).toBeNull();
    expect(r.role).toBe("admin");
    expect(r.orgId).toBe("o1");
  });
});

describe("inviteRowToRecord", () => {
  it("NEVER exposes token_hash", () => {
    const r = inviteRowToRecord({
      id: "i1",
      org_id: "o1",
      email: "a@b.com",
      role: "developer",
      token_hash: "SECRET_HASH",
      invited_by: "u1",
      accepted_at: null,
      created_at: "2026-06-26T00:00:00Z",
    });
    expect(JSON.stringify(r)).not.toContain("SECRET_HASH");
    expect("tokenHash" in r).toBe(false);
    expect("token_hash" in r).toBe(false);
    expect(r.acceptedAt).toBeNull();
    expect(r.role).toBe("developer");
  });
});

describe("apiKeyRowToRecord", () => {
  it("exposes display fields but NEVER key_hash", () => {
    const r = apiKeyRowToRecord({
      id: "k1",
      org_id: "o1",
      name: "CI key",
      key_hash: "SECRET_KEY_HASH",
      prefix: "mky_abcd",
      created_by: "u1",
      last_used_at: null,
      revoked_at: null,
      created_at: "2026-06-26T00:00:00Z",
    });
    expect(JSON.stringify(r)).not.toContain("SECRET_KEY_HASH");
    expect("keyHash" in r).toBe(false);
    expect("key_hash" in r).toBe(false);
    expect(r.prefix).toBe("mky_abcd");
    expect(r.name).toBe("CI key");
    expect(r.lastUsedAt).toBeNull();
    expect(r.revokedAt).toBeNull();
  });
});

// ── Data layer (fake client) ──────────────────────────────────────────────────

describe("getMembershipForUser", () => {
  it("returns orgId + role for the user's row", async () => {
    const client = fakeClient({
      team_members: builder({ data: { org_id: "o1", role: "owner" }, error: null }),
    });
    const m = await getMembershipForUser(client, "u1");
    expect(m).toEqual({ orgId: "o1", role: "owner" });
  });
  it("returns null when the user has no membership", async () => {
    const client = fakeClient({ team_members: builder({ data: null, error: null }) });
    expect(await getMembershipForUser(client, "u1")).toBeNull();
  });
  it("throws on an infra error", async () => {
    const client = fakeClient({ team_members: builder({ data: null, error: { message: "boom" } }) });
    await expect(getMembershipForUser(client, "u1")).rejects.toBeTruthy();
  });
});

describe("getOrgForUser", () => {
  it("resolves the membership then loads the org", async () => {
    const client = fakeClient({
      team_members: builder({ data: { org_id: "o1", role: "admin" }, error: null }),
      organizations: builder({
        data: { id: "o1", name: "Acme", created_by: "u9", created_at: "2026-06-26T00:00:00Z" },
        error: null,
      }),
    });
    const org = await getOrgForUser(client, "u1");
    expect(org?.id).toBe("o1");
    expect(org?.name).toBe("Acme");
  });
  it("returns null when the user has no membership", async () => {
    const client = fakeClient({ team_members: builder({ data: null, error: null }) });
    expect(await getOrgForUser(client, "u1")).toBeNull();
  });
});

describe("listTeam", () => {
  it("maps every roster row", async () => {
    const client = fakeClient({
      team_members: builder({
        data: [
          { id: "m1", org_id: "o1", user_id: "u1", email: "a@b.com", role: "owner", created_at: "t" },
          { id: "m2", org_id: "o1", user_id: null, email: "c@d.com", role: "developer", created_at: "t" },
        ],
        error: null,
      }),
    });
    const team = await listTeam(client, "o1");
    expect(team).toHaveLength(2);
    expect(team[1].role).toBe("developer");
  });
});

describe("createInvite", () => {
  it("stores only a hash and returns the raw token once", async () => {
    const tbl = builder({
      data: {
        id: "i1",
        org_id: "o1",
        email: "a@b.com",
        role: "admin",
        token_hash: "ignored",
        invited_by: "u1",
        accepted_at: null,
        created_at: "t",
      },
      error: null,
    });
    const client = fakeClient({ team_invites: tbl });
    const { invite, rawToken } = await createInvite(client, {
      orgId: "o1",
      email: "a@b.com",
      role: "admin",
      invitedBy: "u1",
    });
    expect(rawToken).toBeTruthy();
    // The persisted row carried the HASH of the raw token, never the raw token.
    const inserted = tbl.captured.inserted as Record<string, unknown>;
    expect(inserted.token_hash).toBe(hashApiKey(rawToken));
    expect(JSON.stringify(inserted)).not.toContain(rawToken);
    // The returned record never leaks the hash.
    expect("tokenHash" in invite).toBe(false);
  });
});

describe("createApiKey", () => {
  it("stores hash+prefix and returns the raw key once", async () => {
    const tbl = builder({
      data: {
        id: "k1",
        org_id: "o1",
        name: "CI",
        key_hash: "ignored",
        prefix: "mky_abcd",
        created_by: "u1",
        last_used_at: null,
        revoked_at: null,
        created_at: "t",
      },
      error: null,
    });
    const client = fakeClient({ api_keys: tbl });
    const { record, rawKey } = await createApiKey(client, { orgId: "o1", name: "CI", createdBy: "u1" });
    expect(rawKey.startsWith("mky_")).toBe(true);
    const inserted = tbl.captured.inserted as Record<string, unknown>;
    expect(inserted.key_hash).toBe(hashApiKey(rawKey));
    expect(inserted.prefix).toBe(rawKey.slice(0, 8));
    expect(JSON.stringify(inserted)).not.toContain(rawKey);
    expect("keyHash" in record).toBe(false);
  });
});

describe("listApiKeys", () => {
  it("maps rows without leaking key_hash", async () => {
    const client = fakeClient({
      api_keys: builder({
        data: [
          {
            id: "k1",
            org_id: "o1",
            name: "CI",
            key_hash: "SECRET",
            prefix: "mky_abcd",
            created_by: "u1",
            last_used_at: null,
            revoked_at: null,
            created_at: "t",
          },
        ],
        error: null,
      }),
    });
    const keys = await listApiKeys(client, "o1");
    expect(keys).toHaveLength(1);
    expect(JSON.stringify(keys)).not.toContain("SECRET");
  });
});

describe("revokeApiKey", () => {
  it("sets revoked_at and throws on error", async () => {
    const ok = builder({ data: null, error: null });
    await expect(revokeApiKey(fakeClient({ api_keys: ok }), "k1")).resolves.toBeUndefined();
    expect((ok.captured.updated as Record<string, unknown>).revoked_at).toBeTruthy();

    const bad = fakeClient({ api_keys: builder({ data: null, error: { message: "x" } }) });
    await expect(revokeApiKey(bad, "k1")).rejects.toBeTruthy();
  });
});

// ── Pure helper ───────────────────────────────────────────────────────────────

describe("emailsEqualCI", () => {
  it("matches case-insensitively and trims surrounding whitespace", () => {
    expect(emailsEqualCI("A@B.com", "a@b.com")).toBe(true);
    expect(emailsEqualCI("  Foo@Bar.io ", "foo@bar.io")).toBe(true);
  });
  it("rejects different addresses and empty inputs", () => {
    expect(emailsEqualCI("a@b.com", "x@y.com")).toBe(false);
    expect(emailsEqualCI("", "a@b.com")).toBe(false);
    expect(emailsEqualCI("a@b.com", "")).toBe(false);
  });
});

// ── acceptInvite (fake service client) ────────────────────────────────────────

const INVITE_ROW = {
  id: "i1",
  org_id: "o1",
  email: "Invitee@Example.com",
  role: "developer",
  token_hash: "ignored",
  invited_by: "u9",
  accepted_at: null,
  created_at: "t",
};

describe("acceptInvite", () => {
  it("binds the member and marks the invite accepted on the happy path", async () => {
    const invites = builder({ data: INVITE_ROW, error: null });
    const members = builder({ data: { id: "m1" }, error: null });
    const client = fakeClient({ team_invites: invites, team_members: members });

    const res = await acceptInvite(client, "raw-token", {
      id: "user-1",
      email: "invitee@example.com", // case-insensitive match
    });

    expect(res).toEqual({ ok: true, orgId: "o1" });
    // Member upsert carried the resolved user + invite's org/email/role.
    const upserted = members.captured.inserted as Record<string, unknown>;
    expect(upserted.org_id).toBe("o1");
    expect(upserted.user_id).toBe("user-1");
    expect(upserted.role).toBe("developer");
    // Invite was stamped accepted.
    expect((invites.captured.updated as Record<string, unknown>).accepted_at).toBeTruthy();
  });

  it("returns {ok:false, invalid} when no matching/un-accepted invite exists", async () => {
    // The query filters on token_hash + accepted_at is null; a missing row (bad
    // token OR already-accepted, filtered out by the DB) surfaces as data:null.
    const client = fakeClient({ team_invites: builder({ data: null, error: null }) });
    const res = await acceptInvite(client, "bad-token", { id: "u", email: "a@b.com" });
    expect(res).toEqual({ ok: false, reason: "invalid" });
  });

  it("treats an already-accepted invite (filtered out) as invalid", async () => {
    // accepted_at-is-null filter means an accepted invite returns no row.
    const client = fakeClient({ team_invites: builder({ data: null, error: null }) });
    const res = await acceptInvite(client, "used-token", { id: "u", email: "invitee@example.com" });
    expect(res).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects with email_mismatch when the invite was issued for a different address", async () => {
    // team_members intentionally omitted: it must NOT be touched on mismatch
    // (fakeClient throws on an unexpected table if the code tried to write).
    const client = fakeClient({ team_invites: builder({ data: INVITE_ROW, error: null }) });
    const res = await acceptInvite(client, "raw-token", { id: "u", email: "someone-else@evil.com" });
    expect(res).toEqual({ ok: false, reason: "email_mismatch" });
  });

  it("throws on an infra error (never swallows a Supabase failure)", async () => {
    const client = fakeClient({ team_invites: builder({ data: null, error: { message: "boom" } }) });
    await expect(
      acceptInvite(client, "raw-token", { id: "u", email: "a@b.com" })
    ).rejects.toBeTruthy();
  });
});
