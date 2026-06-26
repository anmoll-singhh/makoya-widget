/**
 * lib/validation/heartbeat.ts — Zod request shape for the PUBLIC /api/heartbeat
 * route. Kept out of the shared `lib/validation/api.ts` on purpose (that file is
 * a coordination point owned elsewhere); the heartbeat lane defines its own.
 *
 * Security contract matches the other public schemas: validate SHAPE only, never
 * surface Zod's field-level messages (the route maps any failure to generic copy).
 * `siteId` must be a UUID (every Makoya site id is a UUID); `token` and `url` are
 * optional best-effort telemetry fields and are length-capped for DoS hygiene.
 */
import { z } from "zod";

const MAX_URL_LEN = 2048;
const MAX_TOKEN_LEN = 512;

export const heartbeatBodySchema = z.object({
  siteId: z.string().uuid(),
  token: z.string().max(MAX_TOKEN_LEN).optional(),
  url: z.string().max(MAX_URL_LEN).optional(),
});
export type HeartbeatBody = z.infer<typeof heartbeatBodySchema>;
