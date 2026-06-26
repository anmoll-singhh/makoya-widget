/**
 * lib/validation/partner.ts — Zod request-body schema for the partner routes.
 *
 * Kept separate from `lib/validation/api.ts` (do not edit that file) and from the
 * team lane's `lib/validation/org.ts`, but follows the same contract: schemas
 * validate SHAPE only, and routes use `parseBody` (from api.ts) so a failure
 * yields a generic 400 with no field-level detail — we never leak internal field
 * names to the caller.
 *
 * Guardrail: white-label is cosmetic branding only. These fields carry no
 * accessibility "compliance" / "guarantee" semantics; the schema enforces shape
 * + length caps and nothing more.
 */

import { z } from "zod";
import { emailSchema } from "./api";

// ── PATCH /api/partner/white-label ────────────────────────────────────────────
// Update the partner's cosmetic branding. Every field is optional (partial
// update); at least one must be present so an empty no-op body is rejected.
export const whiteLabelPatchSchema = z
  .object({
    brandName: z.string().max(120),
    logoUrl: z.string().max(2048),
    primaryColor: z.string().max(32),
    supportEmail: z.union([emailSchema, z.literal("")]),
    hideMakoyaBranding: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "empty patch" });
export type WhiteLabelPatchBody = z.infer<typeof whiteLabelPatchSchema>;
