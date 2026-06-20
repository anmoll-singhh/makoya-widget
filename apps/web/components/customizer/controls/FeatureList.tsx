/**
 * FeatureList.tsx
 *
 * Renders the full 15-row ordered feature list for the widget customizer.
 * Uses `buildFeatureRows` / `rowsToEnabled` / `moveRow` from feature-order.ts
 * and the metadata from FEATURE_META (labels, descriptions, groups).
 *
 * Design decisions (ui-ux-pro-max / frontend-design):
 *  - Group headers (content / color / navigation / audio) provide visual
 *    hierarchy so the list doesn't feel like 15 undifferentiated items, while
 *    still preserving the user's custom ORDER across groups (a feature from
 *    "content" can be moved above one from "navigation" — the group header
 *    only floats visually, it does not constrain ordering).
 *  - Because ordering spans group boundaries we render a SINGLE ordered list
 *    and derive the group label from FEATURE_META per row.  This is clearer
 *    than four separate sortable sub-lists which would prevent cross-group
 *    reordering.
 *  - Off-rows still appear (greyed out, no ↑/↓) so users can see what is
 *    available and toggle it back on.  Up/down buttons are disabled for off-
 *    rows (off = not visible = order irrelevant) and at array bounds.
 *  - The Switch carries aria-label = feature label so screen readers announce
 *    "Text size, on/off" without needing the visible label to also be the
 *    accessible name.
 *  - Group badge colours distinguish the four categories without relying on
 *    colour alone (each has a distinct text abbreviation too).
 */

"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { buildFeatureRows, rowsToEnabled, moveRow, type FeatureRow } from "@/lib/customizer/feature-order";
import { FEATURE_META, type FeatureGroup } from "@/lib/customizer/feature-meta";
import type { FeatureKey } from "@/lib/shared";

// ─── Constants ───────────────────────────────────────────────────────────────

const GROUP_STYLES: Record<FeatureGroup, { badge: string; label: string }> = {
  content:    { badge: "bg-sky-100 text-sky-700",    label: "Content"    },
  color:      { badge: "bg-purple-100 text-purple-700", label: "Colour"  },
  navigation: { badge: "bg-amber-100 text-amber-700", label: "Navigation" },
  audio:      { badge: "bg-green-100 text-green-700", label: "Audio"     },
};

// Map key → meta for O(1) lookups.
const META_MAP = Object.fromEntries(FEATURE_META.map((m) => [m.key, m])) as Record<FeatureKey, typeof FEATURE_META[0]>;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface FeatureListProps {
  /** The currently enabled features in display order (from SiteConfig). */
  enabled: FeatureKey[];
  /** Called whenever the enabled list changes (toggle or reorder). */
  onChange: (enabled: FeatureKey[]) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FeatureList({ enabled, onChange }: FeatureListProps) {
  // Local rows state so reordering is instant (not round-tripped through the
  // parent's debounced autosave path for every arrow press).
  const [rows, setRows] = useState<FeatureRow[]>(() => buildFeatureRows(enabled));

  // Re-sync rows whenever the parent's enabled prop changes (e.g. site switch
  // or external state reset) without unmounting this component.
  useEffect(() => {
    setRows(buildFeatureRows(enabled));
  }, [enabled]);

  function applyRows(next: FeatureRow[]) {
    setRows(next);
    onChange(rowsToEnabled(next));
  }

  function handleToggle(index: number) {
    const next = rows.map((r, i) =>
      i === index ? { ...r, on: !r.on } : r,
    );
    applyRows(next);
  }

  function handleMove(index: number, dir: -1 | 1) {
    applyRows(moveRow(rows, index, dir));
  }

  return (
    <ol className="space-y-1" aria-label="Feature display order">
      {rows.map((row, index) => {
        const meta = META_MAP[row.key];
        const groupStyle = GROUP_STYLES[meta.group];
        const isFirst = index === 0;
        const isLast = index === rows.length - 1;

        return (
          <li
            key={row.key}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-base",
              row.on
                ? "border-neutral-200 bg-white"
                : "border-neutral-100 bg-neutral-50 opacity-60",
            )}
          >
            {/* Toggle */}
            <Switch
              checked={row.on}
              onCheckedChange={() => handleToggle(index)}
              aria-label={meta.label}
              className="shrink-0"
            />

            {/* Label + description */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-semibold",
                  row.on ? "text-neutral-900" : "text-neutral-500",
                )}>
                  {meta.label}
                </span>
                <span className={cn(
                  "hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline",
                  groupStyle.badge,
                )}>
                  {groupStyle.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-400 leading-snug">
                {meta.description}
              </p>
            </div>

            {/* Reorder buttons — keyboard-accessible ordering (required) */}
            <div className="flex shrink-0 flex-col gap-0.5" aria-label={`Reorder ${meta.label}`}>
              <button
                type="button"
                onClick={() => handleMove(index, -1)}
                disabled={!row.on || isFirst}
                aria-label={`Move ${meta.label} up`}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-base",
                  !row.on || isFirst
                    ? "cursor-not-allowed opacity-30"
                    : "hover:bg-neutral-100 hover:text-neutral-700",
                )}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M6 9V3M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 1)}
                disabled={!row.on || isLast}
                aria-label={`Move ${meta.label} down`}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-base",
                  !row.on || isLast
                    ? "cursor-not-allowed opacity-30"
                    : "hover:bg-neutral-100 hover:text-neutral-700",
                )}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M6 3v6M9 6l-3 3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
