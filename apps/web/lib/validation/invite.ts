/**
 * lib/validation/invite.ts — Zod request-body schema for invite acceptance.
 *
 * Kept separate from `lib/validation/api.ts` and `lib/validation/org.ts` (do not
 * edit those) but follows the same contract: schemas validate SHAPE only, and
 * routes use `parseBody` (from api.ts) so a failure yields a generic 400 with no
 * field-level detail — we never leak internal field names to the caller.
 */

import { z } from "zod";

// ── POST /api/team/accept ─────────────────────────────────────────────────────
// Accept a team invite by its raw token. The token is an opaque url-safe string
// (base64url of 32 random bytes ≈ 43 chars); cap the length for DoS hygiene.
export const acceptInviteBodySchema = z.object({
  token: z.string().min(1).max(512),
});
export type AcceptInviteBody = z.infer<typeof acceptInviteBodySchema>;
