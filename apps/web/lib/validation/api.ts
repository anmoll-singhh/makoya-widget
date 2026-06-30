/**
 * lib/validation/api.ts
 *
 * Zod request-body schemas for the app's API boundaries.
 *
 * Why this exists:
 * ─────────────────
 * The public funnel routes (`/api/public-scan`, `/api/scan-ingest`,
 * `/api/report-pdf`) and the authed `/api/consultation` route each previously
 * grew their own ad-hoc, hand-rolled validation (type guards, regexes, manual
 * clamping). That drifted between routes and made it easy to forget a check.
 *
 * Centralising the request shapes as Zod schemas means:
 *   • one declarative source of truth per route boundary,
 *   • malformed input is rejected EARLY, before any DB / browser / PDF work,
 *   • parsing is total — a single `safeParse` either yields a typed value or a
 *     structured error we can map to a SAFE, GENERIC response.
 *
 * Security contract (these routes are public + unauthenticated, except
 * consultation): we NEVER surface Zod's field-level messages to the caller.
 * `parseBody` returns only a boolean-ish discriminated result; the route turns a
 * failure into its own generic copy. This keeps internal field names and shape
 * details (an information-leak / fingerprinting vector) off the wire.
 *
 * Honesty: these schemas validate SHAPE only. They never inject or assert any
 * WCAG/ADA "compliance" or "guarantee" claims — that copy lives nowhere here.
 *
 * Note: SSRF policy for scan targets stays in `lib/scan-utils/public-url.ts`
 * (`isPublicHttpUrl` + resolved-IP classifier) and `lib/utils/url.ts`
 * (`validateScanUrl`). Zod here only enforces "is a plausible, length-capped
 * http(s) string"; the dedicated SSRF gates remain the authority on reachability.
 */

import { z } from "zod";

// ── Shared primitives ────────────────────────────────────────────────────────

/** Length cap mirrors the historical guards in the routes (DoS hygiene). */
const MAX_URL_LEN = 2048;

/**
 * A pragmatic email check matching `lib/utils/email.ts#isValidEmail` exactly so
 * the Zod layer and the shared helper can't disagree: one `@`, a dotted domain,
 * no whitespace, ≤254 chars. Stricter parsing belongs to the email provider.
 */
export const emailSchema = z
  .string()
  .min(1)
  .max(254)
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);

/**
 * A length-capped http(s) URL STRING. Used where the route still runs its own
 * dedicated URL validation afterwards (public-scan → `validateScanUrl`) or only
 * needs the value as an opaque, display-only label (scan-ingest, report-pdf).
 * Bare domains (no scheme) are accepted here because the downstream normalisers
 * prepend `https://`; the SSRF gates are what actually decide reachability.
 */
export const httpUrlStringSchema = z.string().min(1).max(MAX_URL_LEN);

/**
 * Stricter variant: must already PARSE as http(s). Used by report-pdf and
 * scan-ingest, which treat the URL as a trusted-shape label and don't run it
 * through `validateScanUrl`.
 */
export const parsedHttpUrlSchema = httpUrlStringSchema.refine(
  (v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "must be an http(s) URL" }
);

/** Severity counts. Coerced/clamped downstream; here we only bound the shape. */
const totalsSchema = z
  .object({
    critical: z.number().finite().optional(),
    serious: z.number().finite().optional(),
    moderate: z.number().finite().optional(),
    minor: z.number().finite().optional(),
    total: z.number().finite().optional(),
  })
  // tolerate extra keys but ignore them
  .passthrough()
  .optional();

// ── /api/public-scan ─────────────────────────────────────────────────────────
// Only a URL string. The dedicated SSRF gates (`isPublicHttpUrl` +
// `validateScanUrl` + resolved-IP lookup) run AFTER this and remain authoritative.
export const publicScanBodySchema = z.object({
  url: httpUrlStringSchema,
});
export type PublicScanBody = z.infer<typeof publicScanBodySchema>;

// ── /api/scan-ingest ─────────────────────────────────────────────────────────
// External scanner posts the lead. We persist email + url and a coarse score.
export const scanIngestBodySchema = z.object({
  email: emailSchema,
  url: parsedHttpUrlSchema,
  // score/totals are best-effort and re-normalised in the route; accept anything
  // and let the route clamp. Keeping them loose here avoids rejecting a valid
  // lead just because the caller sent a slightly off score shape.
  score: z.unknown().optional(),
  totals: z.unknown().optional(),
});
export type ScanIngestBody = z.infer<typeof scanIngestBodySchema>;

// ── /api/report-pdf ──────────────────────────────────────────────────────────
// Formats data the caller already holds into a PDF. Email-gated server-side.
const pdfIssueSchema = z
  .object({
    id: z.unknown().optional(),
    impact: z.unknown().optional(),
    help: z.unknown().optional(),
    whatItMeans: z.unknown().optional(),
    whoItAffects: z.unknown().optional(),
  })
  .passthrough();

export const reportPdfBodySchema = z.object({
  email: emailSchema,
  url: parsedHttpUrlSchema,
  score: z.number().finite().optional(),
  totals: totalsSchema,
  // Capped to keep PDF rendering bounded; the route also slices defensively.
  topIssues: z.array(pdfIssueSchema).max(200).optional(),
  isPartialScan: z.boolean().optional(),
});
export type ReportPdfBody = z.infer<typeof reportPdfBodySchema>;

// ── /api/consultation ────────────────────────────────────────────────────────
// Authed route; ownership is still checked in the handler. Schema just shapes
// the body so we never index into untyped input.
export const consultationBodySchema = z.object({
  siteId: z.string().min(1).max(128),
  type: z.enum(["full_report", "book_call"]).optional(),
});
export type ConsultationBody = z.infer<typeof consultationBodySchema>;

// ── Widget public POST routes (accessiBe-parity) ─────────────────────────────

/** Body for `/api/widget-feedback` — a visitor reporting an a11y issue. */
export const widgetFeedbackBodySchema = z.object({
  siteId: z.string().min(1).max(128),
  /** The visitor's report. Length-capped for DoS hygiene. */
  message: z.string().min(1).max(2000),
  /** Optional reply-to email (visitors may report anonymously). */
  email: emailSchema.optional(),
  /** Optional page URL where the issue was found. Uses the strict parsed schema
   *  (asserts http/https via new URL()) so non-HTTP schemes and CRLF-bearing
   *  hostnames can't reach the owner's email body. */
  url: parsedHttpUrlSchema.optional(),
});
export type WidgetFeedbackBody = z.infer<typeof widgetFeedbackBodySchema>;

/** Body for `/api/widget-simplify` — selected text to simplify (opt-in tool). */
export const widgetSimplifyBodySchema = z.object({
  siteId: z.string().min(1).max(128),
  /** The selected paragraph. Length-capped (cost + abuse hygiene). */
  text: z.string().min(1).max(2000),
  /** Target language for the simplification; defaults to English. */
  lang: z.enum(["en", "es", "fr", "de"]).optional(),
});
export type WidgetSimplifyBody = z.infer<typeof widgetSimplifyBodySchema>;

// ── Helper: total, safe parse ────────────────────────────────────────────────

export type ParseResult<T> = { ok: true; data: T } | { ok: false };

/**
 * Parse `raw` against `schema`, returning a minimal discriminated result. On
 * failure we deliberately DROP Zod's error detail — routes respond with their
 * own generic copy so we never leak field names / shape to an untrusted caller.
 */
export function parseBody<T>(schema: z.ZodType<T>, raw: unknown): ParseResult<T> {
  const r = schema.safeParse(raw);
  return r.success ? { ok: true, data: r.data } : { ok: false };
}
