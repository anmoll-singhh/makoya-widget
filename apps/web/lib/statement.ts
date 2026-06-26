/**
 * lib/statement.ts — accessibility STATEMENT generator (the v3.1 Statement
 * screen) data layer.
 *
 * An accessibility statement is the public page a merchant links from their
 * footer. It is NOT a certificate. Per the compliance guardrail (CLAUDE.md), the
 * generated copy may only describe a *commitment* and a conformance *target* — it
 * must NEVER assert that the site "is compliant", is "certified", "guaranteed",
 * "fully accessible", or "meets the ADA". `generateStatementHtml` is the single
 * place that copy is produced and it is exhaustively unit-tested to keep those
 * forbidden phrases out of the output.
 *
 * Storage shape: one CURRENT statement per site (PK = site_id). Owners
 * create/update their own row through the authed `/api/sites/[id]/statement`
 * route; RLS scopes every write/read to the owner's own sites.
 *
 * Error discipline mirrors lib/sites.ts / lib/heartbeat.ts:
 *  - a Supabase `error` is an INFRA failure → THROW (the authed route surfaces a
 *    generic 500 via the observability seam).
 *  - simply no row → return `null` (mirrors `getSite` / `getHeartbeat`).
 *
 * Columns are snake_case in Postgres; `rowToStatement` converts to camelCase.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** The legal frameworks an owner can reference (display-only labels). */
export type Jurisdiction = "ada" | "aoda" | "aca" | "eaa";

/** The owner-supplied inputs that drive statement generation. */
export interface StatementInput {
  brandName: string;
  jurisdictions: Jurisdiction[];
  conformanceTarget: string;
  contactEmail: string;
}

/** camelCase view of an `accessibility_statements` row (input + generated html). */
export interface StatementRecord extends StatementInput {
  siteId: string;
  html: string;
  updatedAt: string;
}

/**
 * Human-readable names for each framework code. These are deliberately phrased as
 * references ("the ADA (US)"), NOT compliance claims. Kept as a const map so the
 * generator and any future UI label can't disagree.
 */
const JURISDICTION_NAMES: Record<Jurisdiction, string> = {
  ada: "the ADA (US)",
  aoda: "AODA (Ontario, Canada)",
  aca: "the ACA (Canada)",
  eaa: "the EAA (EU)",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * PURE: escape the five HTML-significant characters so owner-supplied text
 * (brand name, contact email) can never inject markup into the generated block.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * PURE: produce a clean, semantic accessibility-statement HTML block.
 *
 * COMPLIANCE GUARDRAIL — the output describes a *commitment* + a conformance
 * *target* only. It must never claim the site "is compliant", is "certified",
 * "guaranteed", "fully accessible", or "meets the ADA". The unit tests assert
 * those phrases are absent; do not reintroduce them.
 *
 * `now` is injectable for deterministic tests (mirrors deriveInstallStatus's
 * `nowMs`); it defaults to the wall clock and drives the "Last reviewed" line.
 */
export function generateStatementHtml(input: StatementInput, now: Date = new Date()): string {
  const brand = escapeHtml(input.brandName);
  const target = escapeHtml(input.conformanceTarget);
  const email = escapeHtml(input.contactEmail);
  const reviewed = `${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`;

  // De-dupe + keep only known codes, then map to display names.
  const names = Array.from(new Set(input.jurisdictions))
    .filter((j): j is Jurisdiction => j in JURISDICTION_NAMES)
    .map((j) => JURISDICTION_NAMES[j]);

  const lines: string[] = [];
  lines.push("<section class=\"accessibility-statement\" aria-labelledby=\"a11y-statement-heading\">");
  lines.push("  <h2 id=\"a11y-statement-heading\">Accessibility Statement</h2>");
  lines.push(
    `  <p>${brand} is committed to digital accessibility and to continually improving the experience for all users, including people with disabilities.</p>`
  );
  lines.push(
    `  <p>Our website aims to conform to ${target}, an internationally recognised standard for digital accessibility. Accessibility is an ongoing effort and we work to align with this target as we develop and maintain our site.</p>`
  );

  if (names.length > 0) {
    lines.push(
      "  <p>In pursuing this commitment we also take into account the goals of the following frameworks:</p>"
    );
    lines.push("  <ul>");
    for (const name of names) {
      lines.push(`    <li>${name}</li>`);
    }
    lines.push("  </ul>");
  }

  lines.push(
    `  <p>We welcome your feedback. If you experience any difficulty accessing part of our website, please contact us at <a href="mailto:${email}">${email}</a> and we will do our best to assist you and address the issue.</p>`
  );
  lines.push(`  <p class="accessibility-statement__reviewed">Last reviewed ${reviewed}.</p>`);
  lines.push("</section>");

  return lines.join("\n");
}

/** snake_case `accessibility_statements` row → camelCase `StatementRecord`. */
export function rowToStatement(row: any): StatementRecord {
  return {
    siteId: row.site_id,
    brandName: row.brand_name,
    jurisdictions: Array.isArray(row.jurisdictions) ? (row.jurisdictions as Jurisdiction[]) : [],
    conformanceTarget: row.conformance_target,
    contactEmail: row.contact_email,
    html: row.html,
    updatedAt: row.updated_at,
  };
}

/**
 * Generates the statement HTML from `input` and upserts it on `site_id` (one
 * current statement per site). Uses the cookie-bound OWNER client — RLS enforces
 * that the caller owns the site. Returns the mapped record (incl. the generated
 * html). Throws on infra error.
 */
export async function upsertStatement(
  client: SupabaseClient,
  siteId: string,
  input: StatementInput
): Promise<StatementRecord> {
  const html = generateStatementHtml(input);
  const nowIso = new Date().toISOString();
  const row = {
    site_id: siteId,
    brand_name: input.brandName,
    jurisdictions: input.jurisdictions,
    conformance_target: input.conformanceTarget,
    contact_email: input.contactEmail,
    html,
    updated_at: nowIso, // upsert-on-update won't fire the column default
  };

  const { error } = await client
    .from("accessibility_statements")
    .upsert(row as never, { onConflict: "site_id" });
  if (error) throw error;

  return rowToStatement(row);
}

/**
 * Reads the current statement for one site. Mirrors `getSite`'s error discipline:
 * infra `error` → throw; no row → null. RLS scopes the read to the owner.
 */
export async function getStatement(
  client: SupabaseClient,
  siteId: string
): Promise<StatementRecord | null> {
  const { data, error } = await client
    .from("accessibility_statements")
    .select("*")
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw error; // infra failure — caller decides
  return data ? rowToStatement(data) : null;
}
