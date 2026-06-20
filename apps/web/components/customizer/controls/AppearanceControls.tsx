/**
 * AppearanceControls.tsx
 *
 * Grouped controls for the visual identity of the widget launcher:
 *  - primaryColor  — native colour picker + hex text field (stays in sync)
 *  - launcherIcon  — icon button group (renders the actual SVGs from LAUNCHER_ICONS,
 *                    matching the pattern used in ConfigEditor.tsx)
 *  - launcherSize  — segmented sm / md / lg selector
 *  - position      — 2×2 spatial grid (corner picker)
 *
 * Design decisions (ui-ux-pro-max / frontend-design):
 *  - The icon picker and size picker are horizontally scannable rows — quick
 *    to compare without scrolling.
 *  - Position uses a 2×2 grid that mirrors screen corners: top-left/top-right
 *    on the first row, bottom-left/bottom-right on the second, so the spatial
 *    metaphor is immediately obvious.
 *  - Active selections use brand-600 ring + background so they match the rest
 *    of the dashboard (indigo/violet system), not the old neutral-900 approach
 *    in ConfigEditor.tsx.
 *  - All interactive elements carry proper aria attributes.
 */

"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LAUNCHER_ICONS, type LauncherIconKey, type WidgetPosition } from "@/lib/shared";
import type { SiteConfig } from "@/lib/sites-mappers";

// ─── Constants ──────────────────────────────────────────────────────────────

const LAUNCHER_ICON_KEYS = Object.keys(LAUNCHER_ICONS) as LauncherIconKey[];

const ICON_LABELS: Record<LauncherIconKey, string> = {
  accessibility: "Accessibility",
  person: "Person",
  eye: "Eye",
  adjust: "Adjust",
};

const SIZE_OPTIONS: { value: SiteConfig["launcherSize"]; label: string }[] = [
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
];

// Ordered for 2×2 spatial grid: [top-left, top-right] / [bottom-left, bottom-right]
const POSITION_GRID: { value: WidgetPosition; label: string }[][] = [
  [
    { value: "top-left",  label: "Top left"  },
    { value: "top-right", label: "Top right" },
  ],
  [
    { value: "bottom-left",  label: "Bottom left"  },
    { value: "bottom-right", label: "Bottom right" },
  ],
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AppearanceControlsProps {
  value: SiteConfig;
  onChange: <K extends keyof SiteConfig>(key: K, val: SiteConfig[K]) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AppearanceControls({ value, onChange }: AppearanceControlsProps) {
  // Keep the hex text input in sync with the colour picker.
  function handleHexInput(raw: string) {
    const trimmed = raw.trim();
    // Accept #rrggbb or rrggbb; ignore incomplete values.
    if (/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
      onChange("primaryColor", trimmed.startsWith("#") ? trimmed : `#${trimmed}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Primary colour ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="appearance-color" className="text-sm font-medium text-neutral-700">
          Primary colour
        </Label>
        <div className="flex items-center gap-3">
          {/* Native colour picker — styled to look intentional, not browser-default */}
          <label
            htmlFor="appearance-color"
            className="relative h-10 w-10 cursor-pointer overflow-hidden rounded-lg border border-neutral-300 shadow-sm transition-base hover:border-brand-400"
            aria-label="Open colour picker"
          >
            <input
              id="appearance-color"
              type="color"
              value={value.primaryColor}
              onChange={(e) => onChange("primaryColor", e.target.value)}
              className="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] cursor-pointer opacity-0"
            />
            <span
              className="block h-full w-full rounded-lg"
              style={{ background: value.primaryColor }}
              aria-hidden="true"
            />
          </label>

          {/* Hex text field */}
          <Input
            type="text"
            defaultValue={value.primaryColor}
            key={value.primaryColor}       /* reset when picker updates the value */
            onBlur={(e) => handleHexInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleHexInput(e.currentTarget.value); }}
            maxLength={7}
            className="w-32 font-mono text-sm uppercase"
            aria-label="Hex colour value"
            placeholder="#2563eb"
          />
        </div>
      </div>

      {/* ── Launcher icon ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-neutral-700">Launcher icon</Label>
        <div className="flex gap-2" role="group" aria-label="Launcher icon">
          {LAUNCHER_ICON_KEYS.map((ic) => {
            const active = value.launcherIcon === ic;
            return (
              <button
                key={ic}
                type="button"
                onClick={() => onChange("launcherIcon", ic)}
                aria-label={ICON_LABELS[ic]}
                aria-pressed={active}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-xl border transition-base",
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-300"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50",
                )}
                // Reuse the same SVG-injection pattern as ConfigEditor.tsx
                dangerouslySetInnerHTML={{
                  __html: LAUNCHER_ICONS[ic].replace("<svg ", '<svg width="22" height="22" '),
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Launcher size ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-neutral-700">Button size</Label>
        <div
          className="inline-flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1"
          role="group"
          aria-label="Button size"
        >
          {SIZE_OPTIONS.map(({ value: sz, label }) => {
            const active = value.launcherSize === sz;
            return (
              <button
                key={sz}
                type="button"
                onClick={() => onChange("launcherSize", sz)}
                aria-pressed={active}
                className={cn(
                  "min-w-[2.5rem] rounded-lg px-4 py-1.5 text-sm font-semibold transition-base",
                  active
                    ? "bg-white text-brand-700 shadow-sm ring-1 ring-neutral-200"
                    : "text-neutral-500 hover:text-neutral-700",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Position ────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-neutral-700">Position</Label>
        {/* 2×2 grid mirrors screen corners so the affordance is spatial */}
        <div className="grid grid-cols-2 gap-2 max-w-xs" role="group" aria-label="Widget position">
          {POSITION_GRID.flat().map(({ value: pos, label }) => {
            const active = value.position === pos;
            return (
              <button
                key={pos}
                type="button"
                onClick={() => onChange("position", pos)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-medium transition-base",
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-300"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
