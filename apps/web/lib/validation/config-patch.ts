/**
 * lib/validation/config-patch.ts
 *
 * Zod schema for PATCH /api/sites/[id]/config (the Customize screen's Publish).
 *
 * Only allows the known @makoya/shared SiteConfig fields with correct value types.
 * Unknown keys are absent from the schema (not passthrough) so a confused client
 * can never set an unexpected column. `siteId` is intentionally excluded — the
 * route derives the site from the URL param, not the body.
 *
 * All fields are optional (partial update). The route applies server-side plan
 * gating AFTER validation before forwarding to `updateConfig`.
 *
 * Uses `parseBody` from `lib/validation/api.ts` — Zod's field-level error detail
 * is deliberately dropped; the route returns its own generic 400 copy so internal
 * field names never leak to the caller.
 */
import { z } from "zod";

const FEATURE_KEYS = [
  "textSize", "lineSpacing", "contrast", "stopMotion", "readingRuler",
  "highlightLinks", "bigCursor", "readableFont", "hideImages", "saturation",
  "readingMask", "highlightTitles", "textAlign", "muteSounds", "readAloud",
] as const;

const WIDGET_POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left"] as const;
const LAUNCHER_ICONS = ["accessibility", "person", "eye", "adjust"] as const;
const LAUNCHER_SIZES = ["sm", "md", "lg"] as const;
const WIDGET_LANGUAGES = ["en", "es", "fr", "de"] as const;
const PROFILE_KEYS = [
  "none", "vision", "lowVision", "dyslexia",
  "adhd", "seizure", "senior", "cognitive", "colorBlind",
] as const;

export const configPatchSchema = z.object({
  primaryColor:              z.string().max(32).optional(),
  position:                  z.enum(WIDGET_POSITIONS).optional(),
  launcherIcon:              z.enum(LAUNCHER_ICONS).optional(),
  featuresEnabled:           z.array(z.enum(FEATURE_KEYS)).optional(),
  hideBranding:              z.boolean().optional(),
  launcherSize:              z.enum(LAUNCHER_SIZES).optional(),
  defaultProfile:            z.enum(PROFILE_KEYS).optional(),
  accessibilityStatementUrl: z.string().max(2048).optional(),
  defaultLanguage:           z.enum(WIDGET_LANGUAGES).optional(),
  panelTitle:                z.string().max(120).optional(),
  customTriggerSelector:     z.string().max(256).optional(),
  domObserverEnabled:        z.boolean().optional(),
  inheritFonts:              z.boolean().optional(),
  mobileEnabled:             z.boolean().optional(),
});

export type ConfigPatchBody = z.infer<typeof configPatchSchema>;
