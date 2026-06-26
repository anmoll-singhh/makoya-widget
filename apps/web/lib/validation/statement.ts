/**
 * lib/validation/statement.ts
 *
 * Zod request-body schema for the AUTHED `/api/sites/[id]/statement` POST route
 * (the v3.1 Statement screen's create/update).
 *
 * Kept separate from `lib/validation/api.ts` (the public-funnel schemas) so the
 * statement lane owns its own boundary without touching the shared file. The
 * route uses `parseBody` from `lib/validation/api.ts`, which DROPS Zod's
 * field-level detail and yields a generic 400 — so internal field names never
 * leak.
 *
 * Honesty: this validates SHAPE only. It asserts no WCAG/ADA "compliance" or
 * "guarantee" claims — that copy lives nowhere here (and the generator that does
 * produce copy is guardrailed + tested in lib/statement.ts).
 */
import { z } from "zod";

/** The legal frameworks an owner can reference (display-only labels). */
export const jurisdictionSchema = z.enum(["ada", "aoda", "aca", "eaa"]);

/**
 * POST body: the owner-supplied inputs that drive statement generation. Lengths
 * are bounded for DoS hygiene; the brand/email are escaped by the generator
 * regardless. `contactEmail` reuses the project's pragmatic email shape.
 */
export const statementBodySchema = z.object({
  brandName: z.string().min(1).max(120),
  // Only 4 distinct legal values exist — cap the array so a caller can't write a
  // huge `text[]` (storage/DoS amplification). The generator also de-dupes.
  jurisdictions: z.array(jurisdictionSchema).max(4),
  conformanceTarget: z.string().min(1).max(60),
  contactEmail: z.string().min(1).max(254).email(),
});

export type StatementBody = z.infer<typeof statementBodySchema>;
