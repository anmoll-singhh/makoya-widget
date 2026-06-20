/**
 * ClientsTable.tsx
 *
 * Sortable clients-overview table for the operator admin dashboard.
 *
 * Design contract:
 * - Dark operator theme: bg-neutral-950 root, neutral-800/900 surfaces, brand
 *   accents. Explicit Tailwind dark-palette classes — no shadcn light/dark token
 *   reliance — so the table looks identical whether the host page applies a dark
 *   class or not.
 * - scoreClass thresholds match app/admin/page.tsx exactly:
 *     ≥80 → emerald, ≥60 → amber, else red; null → muted neutral.
 * - Default sort: issues desc (worst-first — the operator's primary signal).
 * - Sortable columns: issues, score, plan, email, open.
 * - Nulls always sink to the bottom (handled inside sortClients).
 * - Issues column is deliberately emphasized (larger numeral, brighter text)
 *   because it is the worst-first signal the operator acts on first.
 * - Each row is a whole-row link to /admin/sites/<id>, matching the existing
 *   admin table pattern.
 * - Accessible: header sort buttons are real <button>s with aria-sort on the
 *   active <th>; Esc is not trapped; focus order is natural.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminSiteRow } from "@/lib/admin";
import { sortClients, type SortKey } from "@/lib/admin-sort";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns Tailwind classes for the score pill — identical to admin/page.tsx. */
function scoreClass(score: number | null): string {
  if (score === null) return "bg-neutral-800 text-neutral-500";
  if (score >= 80) return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  if (score >= 60) return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
  return "bg-red-500/15 text-red-300 ring-1 ring-red-500/30";
}

/** Caret indicator for the active sort column. */
function Caret({ dir }: { dir: "asc" | "desc" }) {
  return (
    <span aria-hidden className="ml-1 inline-block text-[10px] leading-none opacity-80">
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Column header button
// ---------------------------------------------------------------------------

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortHeader({ label, sortKey, activeKey, dir, onSort, className = "" }: SortHeaderProps) {
  const isActive = sortKey === activeKey;
  // aria-sort only applies to the active column
  const ariaSort = isActive ? (dir === "asc" ? "ascending" : "descending") : undefined;

  return (
    <th scope="col" aria-sort={ariaSort} className={`px-5 py-3 font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={[
          "inline-flex items-center gap-0.5 transition-colors",
          "rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500",
          isActive
            ? "text-white"
            : "text-neutral-500 hover:text-neutral-300",
        ].join(" ")}
      >
        {label}
        {isActive && <Caret dir={dir} />}
      </button>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ClientsTable({ rows }: { rows: AdminSiteRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("issues");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      // Toggle direction on the same column
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Numeric columns default desc (worst first); string columns default asc
      const defaultDesc: SortKey[] = ["issues", "score", "open"];
      setSortDir(defaultDesc.includes(key) ? "desc" : "asc");
    }
  }

  const sorted = sortClients(rows, sortKey, sortDir);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <SortHeader
              label="Customer"
              sortKey="email"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
            />

            <SortHeader
              label="Plan"
              sortKey="plan"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
            />

            <SortHeader
              label="Score"
              sortKey="score"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
            />

            {/* Issues — primary worst-first signal, emphasized */}
            <SortHeader
              label="Issues"
              sortKey="issues"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
            />

            <SortHeader
              label="Open"
              sortKey="open"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-800/70">
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-5 py-10 text-center text-neutral-500"
              >
                No customers yet — add one to hand over a configured widget.
              </td>
            </tr>
          ) : (
            sorted.map((s) => (
              <tr
                key={s.id}
                className="transition-colors hover:bg-neutral-800/40"
              >
                {/* Customer cell: avatar + domain + email — whole cell is a link */}
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/sites/${s.id}`}
                    className="flex items-center gap-3 group"
                  >
                    {/* Avatar: domain initial on brand gradient */}
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-sm font-bold text-white"
                      aria-hidden
                    >
                      {(s.domain[0] ?? "?").toUpperCase()}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white group-hover:underline underline-offset-2">
                        {s.domain}
                      </span>
                      <span className="block truncate text-xs text-neutral-400">
                        {s.ownerEmail}
                      </span>
                    </span>
                  </Link>
                </td>

                {/* Plan pill */}
                <td className="px-5 py-3">
                  <span className="inline-flex items-center rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium capitalize text-neutral-300">
                    {s.plan}
                  </span>
                </td>

                {/* Latest score pill */}
                <td className="px-5 py-3">
                  <Link href={`/admin/sites/${s.id}`} tabIndex={-1} aria-hidden>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreClass(s.latestScore)}`}
                    >
                      {s.latestScore ?? "—"}
                    </span>
                  </Link>
                </td>

                {/* Issues — emphasized: larger numeral, bold, bright red when high */}
                <td className="px-5 py-3">
                  <Link href={`/admin/sites/${s.id}`} tabIndex={-1} aria-hidden>
                    {s.issueCount === null ? (
                      <span className="text-neutral-600 text-xs">—</span>
                    ) : s.issueCount > 0 ? (
                      <span className="text-base font-extrabold tabular-nums text-red-400">
                        {s.issueCount}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold tabular-nums text-emerald-400">
                        0
                      </span>
                    )}
                  </Link>
                </td>

                {/* Open requests */}
                <td className="px-5 py-3">
                  <Link href={`/admin/sites/${s.id}`} tabIndex={-1} aria-hidden>
                    {s.openRequests > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                        {s.openRequests}
                      </span>
                    ) : (
                      <span className="text-neutral-600">0</span>
                    )}
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
