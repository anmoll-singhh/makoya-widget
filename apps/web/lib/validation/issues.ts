/**
 * lib/validation/issues.ts
 *
 * Zod request-body schema for the AUTHED `/api/sites/[id]/issues` PATCH route
 * (the v3.1 Audit/Issues screen's status + assignee edits).
 *
 * Kept separate from `lib/validation/api.ts` (the public-funnel schemas) so the
 * issues lane owns its own boundary without touching the shared file. The route
 * uses `parseBody` from `lib/validation/api.ts`, which DROPS Zod's field-level
 * detail and yields a generic 400 — so internal field names never leak.
 *
 * Honesty: this validates SHAPE only. It asserts no WCAG/ADA "compliance" or
 * "guarantee" claims — none of that copy lives here.
 */
import { z } from "zod";

/** The three lifecycle states an owner can move an issue between. */
export const issueStatusSchema = z.enum(["failing", "needs_review", "passing"]);

/**
 * PATCH body: identify the issue, then optionally set status and/or assignee.
 * `assigneeId` is nullable so the UI can CLEAR an assignment (set to null).
 * Ids are UUIDs because both the issue and the assignee are uuid PKs.
 */
export const issuePatchBodySchema = z
  .object({
    issueId: z.string().uuid(),
    status: issueStatusSchema.optional(),
    assigneeId: z.string().uuid().nullable().optional(),
  })
  // Require at least one mutable field so an empty patch is a 400, not a no-op.
  .refine((b) => b.status !== undefined || b.assigneeId !== undefined, {
    message: "no fields to update",
  });

export type IssuePatchBody = z.infer<typeof issuePatchBodySchema>;
