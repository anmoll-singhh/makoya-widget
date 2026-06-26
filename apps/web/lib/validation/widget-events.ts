/**
 * lib/validation/widget-events.ts — Zod body schema for /api/widget-events.
 *
 * Kept out of lib/validation/api.ts (which is owned by other lanes) so this lane
 * is self-contained. Same security contract as api.ts: SHAPE-only validation, no
 * field-level errors surfaced to callers, no compliance claims in copy.
 *
 * The route is PUBLIC + unauthenticated, so every field is bounded:
 *  - siteId: a uuid (the public, non-secret site id from the snippet),
 *  - token:  optional anti-forgery signature (monitor-only; never blocks ingest),
 *  - events: at most 50 per POST; each is one of two event names with an optional
 *            featureKey (length-capped) and an optional epoch-millis ts.
 * Semantic validation (valid featureKey, event/feature pairing) happens in
 * lib/analytics.ts#recordEvents, which drops invalid rows silently.
 */
import { z } from "zod";

const MAX_EVENTS = 50;
const MAX_FEATURE_KEY_LEN = 64;

export const widgetEventsBodySchema = z.object({
  siteId: z.string().uuid(),
  token: z.string().max(256).optional(),
  events: z
    .array(
      z.object({
        event: z.enum(["open", "feature_activated"]),
        featureKey: z.string().max(MAX_FEATURE_KEY_LEN).optional(),
        ts: z.number().finite().optional(),
      })
    )
    .max(MAX_EVENTS),
});

export type WidgetEventsBody = z.infer<typeof widgetEventsBodySchema>;
