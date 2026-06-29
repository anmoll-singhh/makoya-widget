# Makoya — Governance, Memory & Agent System

> How multiple Claude sessions (often 2–3 in parallel) stay coordinated, keep the project's
> memory true, and divide work without collisions or context loss. This is the operating
> manual for the **Project Governor** and the specialist agents it coordinates.
>
> **Last revised:** 2026-06-29 (ownership-audit block).

---

## 1. The memory system (single source of truth)

Makoya already runs on a deliberate memory stack. Use it; do not invent parallel copies.

| Layer | File / tool | Role | Update cadence |
|---|---|---|---|
| **Dashboard** | `docs/STATUS.md` | Glanceable *volatile* state: live / in-flight / blocked / next + the agent board | End of **every** work block, **first** |
| **Narrative log** | `docs/SESSION.md` | Append-only "what + why + verification" | End of every block, after STATUS |
| **Architecture** | `docs/ARCHITECTURE.md` | *Stable* structure + invariants (no volatile state) | Only on structural change |
| **Decisions** | `docs/DECISIONS.md` | One-line ADR index of locked decisions | When a decision is locked/reversed |
| **Guidance** | `CLAUDE.md` | Rules every agent must follow | When a guardrail changes |
| **Searchable brain** | `gbrain` (PGLite, local) | Semantic-ish recall of past state | Re-seed after big changes (see §5) |

**Drift rule.** When any two of these disagree, **the code is ground truth.** Fix the doc
that drifted in the same block you noticed it. Mark status ✅ only when *verified* (tests
run / browser- or live-checked); 🔶 in progress; ⛔ blocked. Never claim done without evidence.

---

## 2. Session bootstrap (so you never re-read the whole repo)

Every session, in order:
1. **Read `docs/STATUS.md`** — where we are, what's in flight, what's blocked.
2. **Claim a lane** on the STATUS agent board (one worktree = one branch = one agent).
3. **Read `docs/ARCHITECTURE.md`** only if you're unsure how a piece fits.
4. **Read only the code your lane touches.** Use `gbrain search` / Grep for "where is X",
   not a full-tree sweep.
5. At block end, run the **Update protocol** (§4) before you stop.

A fresh session should be productive after reading **two files** (STATUS + ARCHITECTURE),
not 500. That is the whole point of this system.

---

## 3. The Project Governor

The Governor is a **role**, not a daemon — whichever session is doing coordination/merge/deploy
work wears the Governor hat. There is exactly **one Governor at a time**; parallel feature
sessions defer to it for cross-cutting decisions.

**Governor responsibilities**
- Owns `docs/STATUS.md` (especially the agent board) and resolves lane conflicts.
- Assigns work to specialists (§6) and prevents duplicate effort.
- Guards the **QA gate** around every merge (§7) and is the only role that **deploys** (from a
  clean `main` worktree, CLI-only).
- Keeps memory true: reconciles doc drift, re-seeds gbrain, prunes stale worktrees/branches
  (with confirmation per the project's "confirm before delete" rule).
- Records every locked decision in `DECISIONS.md`.

**Governor must escalate to the founder (never decide alone):** anything touching application
behavior in prod, public APIs, DB schema/migrations applied to prod, infrastructure, payments,
licensing/security boundaries, or irreversible operations. Everything in the "autonomous-safe"
list (§8) the Governor may do without asking.

---

## 4. Update protocol (every agent, every block)

**START:** read `STATUS.md` + claim/confirm your lane.

**END, in order:**
1. **`STATUS.md`** — edit the table cells, agent board, "Up next", and the
   `Last updated` / `Updated by` line. Keep it scannable. *(See §9 for the format fix:
   put detail in the body, keep the header one line.)*
2. **`SESSION.md`** — append the dated narrative entry (what / why / verification).
3. **`DECISIONS.md`** — if a decision was locked or reversed, add/age the one-liner.
4. **`CLAUDE.md` / `ARCHITECTURE.md`** — only if a guardrail or structure changed.
5. **`gbrain`** — re-seed if state moved materially (§5).

---

## 5. Keeping gbrain honest

gbrain is currently **stale** (last meaningful seed ~2026-06-24; `brain_score` low; embeddings
disabled, so search is keyword-only). It is only useful if re-seeded. After a material change:

```bash
# re-seed the status page (the one agents query most)
cat docs/STATUS.md  | "$HOME/.bun/bin/gbrain.exe" put "makoya-status-dashboard"
cat docs/ARCHITECTURE.md | "$HOME/.bun/bin/gbrain.exe" put "makoya-architecture"
```

Or via MCP: `mcp__gbrain__put_page`. If gbrain stays unmaintained, treat `STATUS.md` as the
real brain and gbrain as best-effort. **Do not trust a gbrain result without checking its
`effective_date`** against `STATUS.md` — a stale chunk will confidently report old state.

---

## 6. Specialist agents (the working roster)

Makoya doesn't need bespoke agent files for everything — the installed **ECC agent suite**
already covers most specialties. Prefer dispatching those, scoped tightly to a lane. Map of
need → agent:

| Domain | Use | When |
|---|---|---|
| Architecture / planning | `ecc:architect`, `ecc:planner`, `Plan` | New feature, refactor, cross-cutting change |
| Codebase recon (read-only) | `Explore`, `ecc:code-explorer` | "Where/how does X work" before editing |
| TS/React review | `ecc:typescript-reviewer`, `ecc:react-reviewer` | Every TS/TSX change (MUST per CLAUDE.md QA gate) |
| Database | `ecc:database-reviewer` + Supabase MCP | Any migration / RLS / query change |
| Security | `ecc:security-reviewer` | Auth, API input, secrets, licensing, webhooks |
| Performance | `ecc:performance-optimizer` | Hot paths (config endpoint, scanner, bundles) |
| Accessibility | `ecc:a11y-architect` | Widget UI + dashboard UI (we sell a11y — eat our own dog food) |
| Build/type fix | `ecc:build-error-resolver`, `ecc:react-build-resolver` | Red build/typecheck |
| Tests | `ecc:tdd-guide`, `ecc:pr-test-analyzer` | New feature/bugfix; PR coverage check |
| Docs | `ecc:doc-updater` | Codemaps / README / guide drift |
| Cleanup | `ecc:refactor-cleaner` | Dead code, duplicate logic, branch/worktree pruning |

**Dispatch rules:** spawn a specialist only when the user asks or the task genuinely needs
parallel/isolated work; otherwise do it inline. Each dispatched agent gets: a single lane
(file set or worktree), a clear success criterion, and a reporting-back format. **No two
agents edit the same shared file** (`packages/shared`, `package.json`, `lib/email`, `lib/env`)
— if two lanes need it, the Governor pre-provisions it on `main` first (the proven pattern
from blocks 9/13).

---

## 7. QA gate around every merge (standing founder directive, 2026-06-25)

Before merging any branch to `main`:
- **QA-before:** `npm run ci` green on an up-to-date `main` base **and** on the branch.
- **QA-after:** re-run `npm run ci` on `main` post-merge + a live smoke check if deployed.
- Never merge on a red or stale base. For larger lanes, dispatch a read-only verification
  agent for both passes. Migrations applied to prod require explicit founder authorization.

---

## 8. Autonomy boundary

**Do without asking** (objectively safe, reversible): documentation, comments, formatting,
lint fixes, naming consistency, dead-code removal, dependency cleanup that doesn't change
runtime behavior, internal tooling, config/DX improvements, re-seeding gbrain, fixing doc
drift, additive tests.

**Ask first** (per the project's higher-priority rules): application behavior, public APIs,
DB schema / prod migrations, infrastructure, production deploys, licensing/security boundaries,
deleting branches/worktrees ("confirm before delete"), anything irreversible or outward-facing.

---

## 9. Known governance debt (fix opportunistically)

- **`STATUS.md` header is a single run-on paragraph** spanning many blocks — unscannable.
  Convergence target: a one-line `Last updated` + a short "current state" table; push block
  history down into `SESSION.md`. Trim when you next own STATUS.
- **gbrain stale ~20 blocks** — re-seed (§5).
- **16 stale `worktree-agent-*` worktrees + ~30 prunable branches** — Governor cleanup task,
  needs confirmation (all backed up to origin).
- **`SESSION.md` "Ground truth" block says 15 widget features**; code + `CLAUDE.md` say 18.
  Correct the SESSION ground-truth section (append a correction; it is append-only).
