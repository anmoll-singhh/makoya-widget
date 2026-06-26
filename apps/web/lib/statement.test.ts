import { describe, it, expect } from "vitest";
import {
  generateStatementHtml,
  rowToStatement,
  upsertStatement,
  getStatement,
  type StatementInput,
} from "./statement";

// Phrases that, by the compliance guardrail (CLAUDE.md + lane brief), must NEVER
// appear in a generated statement. An overlay that *claims* compliance is a legal
// liability — the statement may only describe a COMMITMENT + a conformance TARGET.
const FORBIDDEN = [
  "compliant",
  "certified",
  "guaranteed",
  "fully accessible",
  "is compliant",
  "meets the ADA",
];

function baseInput(overrides: Partial<StatementInput> = {}): StatementInput {
  return {
    brandName: "Acme Co",
    jurisdictions: ["ada", "eaa"],
    conformanceTarget: "WCAG 2.1 AA",
    contactEmail: "help@acme.test",
    ...overrides,
  };
}

// ── generateStatementHtml: PURE generator ─────────────────────────────────────
describe("generateStatementHtml", () => {
  it("names the brand, the conformance target, and the contact email", () => {
    const html = generateStatementHtml(baseInput());
    expect(html).toContain("Acme Co");
    expect(html).toContain("WCAG 2.1 AA");
    expect(html).toContain("help@acme.test");
  });

  it("describes a commitment + an 'aims to conform' target (not a certification)", () => {
    const html = generateStatementHtml(baseInput()).toLowerCase();
    expect(html).toContain("committed");
    expect(html).toContain("aims to conform");
  });

  it("renders the human-readable name of each selected jurisdiction", () => {
    const html = generateStatementHtml(
      baseInput({ jurisdictions: ["ada", "aoda", "aca", "eaa"] })
    );
    expect(html).toContain("the ADA (US)");
    expect(html).toContain("AODA (Ontario, Canada)");
    expect(html).toContain("the ACA (Canada)");
    expect(html).toContain("the EAA (EU)");
  });

  it("omits jurisdictions not selected", () => {
    const html = generateStatementHtml(baseInput({ jurisdictions: ["ada"] }));
    expect(html).toContain("the ADA (US)");
    expect(html).not.toContain("the EAA (EU)");
    expect(html).not.toContain("AODA (Ontario, Canada)");
  });

  it("works with no jurisdictions selected", () => {
    const html = generateStatementHtml(baseInput({ jurisdictions: [] }));
    expect(html).toContain("Acme Co");
    expect(html).toContain("WCAG 2.1 AA");
  });

  it("includes a 'Last reviewed <Month YYYY>' line", () => {
    const html = generateStatementHtml(baseInput(), new Date("2026-05-26T00:00:00Z"));
    expect(html).toContain("Last reviewed May 2026");
  });

  it("HTML-escapes the brand name to prevent injection", () => {
    const html = generateStatementHtml(
      baseInput({ brandName: '<script>alert(1)</script>' })
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("HTML-escapes the contact email", () => {
    const html = generateStatementHtml(
      baseInput({ contactEmail: 'a"b@x.test' })
    );
    expect(html).not.toContain('a"b@x.test');
    expect(html).toContain("&quot;");
  });

  it("contains NONE of the forbidden compliance/certification phrases", () => {
    const html = generateStatementHtml(
      baseInput({ jurisdictions: ["ada", "aoda", "aca", "eaa"] })
    ).toLowerCase();
    for (const phrase of FORBIDDEN) {
      expect(html).not.toContain(phrase.toLowerCase());
    }
  });
});

// ── rowToStatement: snake_case row → camelCase record ─────────────────────────
describe("rowToStatement", () => {
  it("maps a full snake_case row", () => {
    const rec = rowToStatement({
      site_id: "site-1",
      brand_name: "Acme Co",
      jurisdictions: ["ada", "eaa"],
      conformance_target: "WCAG 2.1 AA",
      contact_email: "help@acme.test",
      html: "<section>…</section>",
      updated_at: "2026-06-26T00:00:00Z",
    });
    expect(rec).toEqual({
      siteId: "site-1",
      brandName: "Acme Co",
      jurisdictions: ["ada", "eaa"],
      conformanceTarget: "WCAG 2.1 AA",
      contactEmail: "help@acme.test",
      html: "<section>…</section>",
      updatedAt: "2026-06-26T00:00:00Z",
    });
  });

  it("tolerates a null jurisdictions column (→ empty array)", () => {
    const rec = rowToStatement({
      site_id: "site-1",
      brand_name: "Acme Co",
      jurisdictions: null,
      conformance_target: "WCAG 2.1 AA",
      contact_email: "help@acme.test",
      html: "<section></section>",
      updated_at: "2026-06-26T00:00:00Z",
    });
    expect(rec.jurisdictions).toEqual([]);
  });
});

// ── A minimal in-memory fake Supabase client (no live DB) ─────────────────────
// Models just enough of the `accessibility_statements` table (PK = site_id).
function makeFakeClient() {
  const rows: any[] = [];

  function from(_table: string) {
    const state: { filters: Record<string, any> } = { filters: {} };
    const matches = (r: any) =>
      Object.entries(state.filters).every(([c, v]) => r[c] === v);

    const builder: any = {
      select() {
        return builder;
      },
      upsert(input: any) {
        const list = Array.isArray(input) ? input : [input];
        for (const row of list) {
          const existing = rows.find((r) => r.site_id === row.site_id);
          if (existing) Object.assign(existing, row);
          else rows.push({ ...row });
        }
        return builder;
      },
      eq(col: string, val: any) {
        state.filters[col] = val;
        return builder;
      },
      maybeSingle() {
        return Promise.resolve({ data: rows.filter(matches)[0] ?? null, error: null });
      },
      single() {
        return Promise.resolve({ data: rows.filter(matches)[0] ?? null, error: null });
      },
    };
    return builder;
  }

  return { from, _rows: rows } as any;
}

const SITE = "11111111-1111-1111-1111-111111111111";

describe("upsertStatement", () => {
  it("generates html and stores the mapped record", async () => {
    const client = makeFakeClient();
    const rec = await upsertStatement(client, SITE, baseInput());
    expect(rec.siteId).toBe(SITE);
    expect(rec.brandName).toBe("Acme Co");
    expect(rec.html).toContain("Acme Co");
    expect(rec.html).toContain("aims to conform");
    // persisted row carries the generated html + snake_case columns
    expect(client._rows.length).toBe(1);
    expect(client._rows[0].contact_email).toBe("help@acme.test");
    expect(client._rows[0].html).toContain("WCAG 2.1 AA");
  });

  it("upserts on site_id (one current statement per site)", async () => {
    const client = makeFakeClient();
    await upsertStatement(client, SITE, baseInput());
    await upsertStatement(client, SITE, baseInput({ brandName: "Renamed" }));
    expect(client._rows.length).toBe(1);
    expect(client._rows[0].brand_name).toBe("Renamed");
  });
});

describe("getStatement", () => {
  it("returns the mapped record when present", async () => {
    const client = makeFakeClient();
    await upsertStatement(client, SITE, baseInput());
    const rec = await getStatement(client, SITE);
    expect(rec?.siteId).toBe(SITE);
    expect(rec?.brandName).toBe("Acme Co");
  });

  it("returns null when no statement exists", async () => {
    const client = makeFakeClient();
    expect(await getStatement(client, SITE)).toBeNull();
  });

  it("throws on an infra error", async () => {
    const client = {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({ data: null, error: { message: "boom" } });
          },
        };
      },
    } as any;
    await expect(getStatement(client, SITE)).rejects.toBeTruthy();
  });
});
