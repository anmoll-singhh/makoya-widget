/**
 * lib/validation/site-settings.ts
 *
 * Zod request-body schema for the AUTHED `/api/sites/[id]/settings` PATCH route
 * (the v3.1 Settings screen — owner contact + notification prefs).
 *
 * Kept separate from `lib/validation/api.ts` (the public-funnel schemas) so this
 * lane owns its own boundary without touching the shared file. The route uses
 * `parseBody` from `lib/validation/api.ts`, which DROPS Zod's field-level detail
 * and yields a generic 400 — so internal field names never leak.
 *
 * `emailSchema` is reused from `lib/validation/api.ts` so the email rule can't
 * drift from the rest of the app.
 *
 * Honesty: validates SHAPE only — no WCAG/ADA "compliance" claims live here.
 */
import { z } from "zod";
import { emailSchema } from "./api";

const MAX_NAME_LEN = 200;
const MAX_PHONE_LEN = 40;

/**
 * Owner email is "valid email OR empty string" — the UI must be able to CLEAR a
 * previously-set address by sending "".
 */
const ownerEmailSchema = z.union([z.literal(""), emailSchema]);

/**
 * `notificationPrefs` must be a PLAIN object — not an array, null, or primitive.
 * `z.record` in Zod v3 happily accepts arrays (their indices become keys), so we
 * use an explicit guard to reject anything that isn't a true object literal.
 */
const notificationPrefsSchema = z.custom<Record<string, unknown>>(
  (v) => typeof v === "object" && v !== null && !Array.isArray(v),
  { message: "must be an object" }
);

/**
 * PATCH body: every field optional (partial update), but at least one must be
 * present so an empty patch is a 400, not a silent no-op.
 */
export const siteSettingsPatchSchema = z
  .object({
    ownerName: z.string().max(MAX_NAME_LEN).optional(),
    ownerEmail: ownerEmailSchema.optional(),
    ownerPhone: z.string().max(MAX_PHONE_LEN).optional(),
    notificationPrefs: notificationPrefsSchema.optional(),
  })
  .refine(
    (b) =>
      b.ownerName !== undefined ||
      b.ownerEmail !== undefined ||
      b.ownerPhone !== undefined ||
      b.notificationPrefs !== undefined,
    { message: "no fields to update" }
  );

export type SiteSettingsPatchBody = z.infer<typeof siteSettingsPatchSchema>;
