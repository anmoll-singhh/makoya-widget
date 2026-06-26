# Lane C — Implementation Report
**Branch:** feat/v7-dashboard  
**Date:** 2026-06-26

---

## C0 — requireAgent + [siteId]/layout.tsx

### Files
- `apps/web/lib/agent-context.ts`
- `apps/web/app/dashboard/[siteId]/layout.tsx`

### What was built
`requireAgent(siteId)` is a server-only helper called at the top of every Lane C RSC page. It:
1. Gets the cookie-bound Supabase client via `getServerSupabase()`
2. Checks `getUser()` — redirects to `/login?next=/dashboard/<siteId>` if no session
3. Calls `getSite(supabase, siteId)` + checks `site.ownerId === user.id` — calls `notFound()` on mismatch
4. Mints the install token server-side via `mintSiteToken(siteId)` (signing secret never crosses to client)
5. Returns `{ site, token, userId }`

`[siteId]/layout.tsx` calls `requireAgent` once as a fast guard (404/redirect on bad siteId), then renders `{children}`. The global `app/dashboard/layout.tsx` still handles the Shell.

### Commit
`5a83a22`

---

## C1 — Overview Screen

### Files
- `apps/web/app/dashboard/[siteId]/page.tsx`
- `apps/web/app/dashboard/[siteId]/_OverviewClient.tsx`

### API wired
`GET /api/sites/[siteId]/overview`

### Mockup numbers replaced
| Mockup value | Real data |
|---|---|
| Score: 86 | `data.score` (SVG gauge with real dashoffset) |
| ↑ 12 pts delta | `data.scoreDelta` |
| Open issues: 24 | `data.openIssues` |
| Widget opens (was "pages scanned: 2,431") | `data.widgetOpens` (re-labelled accurately) |
| Resolved count | `data.issuesResolvedThisMonth` |
| Journey states (Connect/Scan/Improve/Sustain) | derived from `data.status` |
| Score trend chart | `data.trend[]` SVG polyline |
| Activity feed items | `data.activity[]` with real timestamps |
| Framework progress bars | `data.coverage[]` real pct values |
| Next best action count | `data.needsHuman` + `data.openIssues` |

### Concerns
- No "pages scanned" field exists in the overview API. KPI 3 uses `issuesResolvedThisMonth` instead, KPI 4 uses `widgetOpens`. Labels updated to match data.
- "Priority issues" panel from v7 mockup omitted (no separate top-issues endpoint). Replaced with "Next best action" derived from needsHuman/openIssues + CTA to Mike.

### Verified
`npm run ci` — TypeScript clean, 593 tests pass.

---

## C2 — Mike Audit Screen

### Files
- `apps/web/app/dashboard/[siteId]/mike/page.tsx`
- `apps/web/app/dashboard/[siteId]/mike/_MikeClient.tsx`

### APIs wired
- `GET /api/sites/[siteId]/issues` → `{ failing, needs_review, passing }` grouped
- `GET /api/team` → `{ team: TeamMember[] }` for assignment avatars
- `PATCH /api/sites/[siteId]/issues` → `{ issueId, status?, assigneeId? }` for resolve + assign

### Mockup numbers replaced
| Mockup value | Real data |
|---|---|
| Passing checks: 73% | `counts.passing / total * 100` |
| Unassigned: 8 | issues (failing + needs_review) with `assigneeId === null` |
| Criteria met: 16/33 | distinct `wcagCriterion` values in passing group |
| Failing: 3 | `issues.failing.length` |
| Needs review: 2 | `issues.needs_review.length` |
| Passing: 65 | `issues.passing.length` |
| Owner avatars (TA, FS, IW) | team member email initials, mapped by userId |

### Features built
- Client-side search: filters on `title` + `wcagCriterion` across all visible groups
- Filter pills (All / Failing / Needs review / Passing) with real counts
- Optimistic PATCH for resolve (→ passing) and assign (→ assigneeId) with revert on server error
- Assignment dropdown: opens on click, lists all team members, supports remove
- "Mark as needs review" action on Failing issues

### Concerns
- `IssueRecord.assigneeId` stores the userId, but `TeamMember.userId` can be null (pending invite). Fallback to `m.id` (membership id) for matching.
- Team fetch (`/api/team`) is best-effort — if it 404s or fails, assignment still works but shows no member names.

---

## C3 — Install Widget Screen

### Files
- `apps/web/app/dashboard/[siteId]/install/page.tsx`
- `apps/web/app/dashboard/[siteId]/install/_InstallClient.tsx`

### API wired
`GET /api/sites/[siteId]/install-status` → `{ status, lastSeenAt, firstSeenAt, pingCount }`

### Mockup values replaced
| Mockup value | Real data |
|---|---|
| Snippet URL (hardcoded cdn.makoya.app/019ef02e…) | real siteId + server-minted token |
| Agent label (superdemo.jewlx.ai) | `domain` prop from RSC |
| Status pill | `data.status` from install-status API |
| "last seen" description | `data.lastSeenAt` + `data.pingCount` |
| "first seen" date | `data.firstSeenAt` (shown in confirmation note) |
| "Copy" button | real `navigator.clipboard.writeText(snippet)` |
| "Send to developer" | `mailto:` link with snippet in body (honest) |
| "Verify" button | re-fetches install-status on demand |

### Features built
- Token is passed as a prop from the RSC page (server-minted, never re-derived client-side)
- Snippet shows real `siteId` + truncated token display (full token in clipboard copy)
- 6 platform tiles with click-to-select; inline step-by-step guide adapts to selected platform
- Verify button triggers live status re-fetch; pill updates to reflect real state
- Warning note verbatim from mockup (no compliance claim)
- `mailto:` for "Send to developer" — URL-encodes the snippet in the body

---

## CI Result
`npm run ci` — green. sync:shared (no drift), tsc (no errors), vitest 71 files / 593 tests passed, widget tests 59 assertions passed.

## Commit SHAs
| Task | SHA |
|---|---|
| C0 | `5a83a22` |
| C1 | `e33dcd9` |
| C2 | `5dfec2b` |
| C3 | `e19d628` |

---

## Batch 1 Review Fixes — `9d7d422`

**Date:** 2026-06-26  
**Reviewer finding source:** Lane C batch 1 "R" review

### I-1 — server-only guard (`lib/agent-context.ts`)
Added `import "server-only";` as the first line. This prevents any client bundle
from accidentally importing `mintSiteToken` (which calls `node:crypto`) via this
module. Matches the pattern used by other server-only modules in the repo.

### I-2 — unused `token` prop removed (`_OverviewClient.tsx`, `page.tsx`)
Removed `token: string` from `OverviewClient`'s `Props` interface. Updated
`page.tsx` to destructure only `{ site }` from `requireAgent(siteId)` and removed
the `token={token}` JSX attribute. `requireAgent` is still called for auth/ownership
enforcement; the token is simply not forwarded to the Overview screen, which never
needed it.

### M-1 — fabricated benchmark removed (`_OverviewClient.tsx`)
Deleted the hardcoded "Industry avg. 89" dotted reference `<line>` from
`TrendChart`'s SVG and its matching legend entry. No real industry-benchmark data
exists; the line was a fabricated number. The chart now shows only the real score
line/area.

### M-2 — honest denominator (`_MikeClient.tsx`)
Replaced `const WCAG_TOTAL = 50` with a runtime-computed `trackedCriteria`: the
count of DISTINCT non-null `wcagCriterion` values present across *all* issues
(failing + needs_review + passing). The display reads "X of N tracked criteria"
where N is what the scanner actually checked. When `trackedCriteria === 0` (no
scan data yet), the stat shows "No criteria checked yet" instead of dividing by
zero.

### M-3 — Escape key handler (`_MikeClient.tsx`)
Added `onKeyDown` on the assignment dropdown `<div role="listbox">` that calls
`setAssignOpen(false)` on `e.key === "Escape"`. Also added `tabIndex={-1}` so the
div can receive keyboard focus. Closes the popover without requiring a mouse click.

### CI result
`npm run ci` — green. sync:shared (no drift), tsc (0 errors), vitest 71 files /
593 tests passed, widget 59 assertions passed.
