/**
 * lib/validation/org.ts — Zod request-body schemas for the org/team routes.
 *
 * Kept separate from `lib/validation/api.ts` (do not edit that file) but follows
 * the same contract: schemas validate SHAPE only, and routes use `parseBody`
 * (from api.ts) so a failure yields a generic 400 with no field-level detail —
 * we never leak internal field names to the caller.
 */

import { z } from "zod";
import { emailSchema } from "./api";

/** The three org roles. Mirrors the DB check constraint + lib/roles.ts. */
export const roleSchema = z.enum(["owner", "admin", "developer"]);

// ── POST /api/team ────────────────────────────────────────────────────────────
// Invite a teammate. You cannot invite another "owner" via this path; the org
// owner is established at creation/backfill, so invites are admin/developer only.
export const createInviteBodySchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "developer"]),
});
export type CreateInviteBody = z.infer<typeof createInviteBodySchema>;

// ── POST /api/org/api-keys ────────────────────────────────────────────────────
// Mint an API key. Name is a short human label for the key list.
export const createApiKeyBodySchema = z.object({
  name: z.string().min(1).max(80),
});
export type CreateApiKeyBody = z.infer<typeof createApiKeyBodySchema>;

// ── DELETE /api/org/api-keys ──────────────────────────────────────────────────
// Revoke a key by id.
export const revokeApiKeyBodySchema = z.object({
  id: z.string().min(1).max(128),
});
export type RevokeApiKeyBody = z.infer<typeof revokeApiKeyBodySchema>;
