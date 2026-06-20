/**
 * BehaviorControls.tsx
 *
 * Controls for runtime widget behaviour:
 *  - defaultProfile  — which accessibility profile the widget pre-applies on
 *                      first visit (none = user chooses themselves)
 *  - defaultLanguage — the language used for the widget's own labels
 *
 * Design decisions:
 *  - Two Selects stacked vertically; each has a label above and a helper line
 *    below so the effect of "none" vs. a profile is immediately clear.
 *  - Option lists use the exact value→label pairs specified in the task brief.
 *  - No compliance language anywhere in this file.
 */

"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { SiteConfig } from "@/lib/sites-mappers";
import type { WidgetProfileKey, WidgetLanguage } from "@/lib/shared";

// ─── Option sets (exact values from task brief) ───────────────────────────

const PROFILE_OPTIONS: { value: WidgetProfileKey; label: string }[] = [
  { value: "none",       label: "None"            },
  { value: "vision",     label: "Vision impaired" },
  { value: "lowVision",  label: "Low vision"      },
  { value: "dyslexia",   label: "Dyslexia"        },
  { value: "adhd",       label: "ADHD / focus"    },
  { value: "seizure",    label: "Seizure safe"     },
  { value: "senior",     label: "Senior"           },
  { value: "cognitive",  label: "Cognitive"        },
  { value: "colorBlind", label: "Color-blind"      },
];

const LANGUAGE_OPTIONS: { value: WidgetLanguage; label: string }[] = [
  { value: "en", label: "English"  },
  { value: "es", label: "Español"  },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch"  },
];

// ─── Props ────────────────────────────────────────────────────────────────

export interface BehaviorControlsProps {
  value: SiteConfig;
  onChange: <K extends keyof SiteConfig>(key: K, val: SiteConfig[K]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export function BehaviorControls({ value, onChange }: BehaviorControlsProps) {
  return (
    <div className="space-y-6">
      {/* ── Default profile ─────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="behavior-profile" className="text-sm font-medium text-neutral-700">
          Default profile
        </Label>
        <Select
          value={value.defaultProfile}
          onValueChange={(v) => onChange("defaultProfile", v as WidgetProfileKey)}
        >
          <SelectTrigger id="behavior-profile" className="w-full">
            <SelectValue placeholder="Select profile…" />
          </SelectTrigger>
          <SelectContent>
            {PROFILE_OPTIONS.map(({ value: v, label }) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-neutral-400">
          When set, the widget pre-applies this profile on a visitor&apos;s first
          open. Visitors can still adjust or reset at any time.
        </p>
      </div>

      {/* ── Default language ────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="behavior-language" className="text-sm font-medium text-neutral-700">
          Widget language
        </Label>
        <Select
          value={value.defaultLanguage}
          onValueChange={(v) => onChange("defaultLanguage", v as WidgetLanguage)}
        >
          <SelectTrigger id="behavior-language" className="w-full">
            <SelectValue placeholder="Select language…" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map(({ value: v, label }) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-neutral-400">
          Sets the language used for the widget&apos;s own labels and button text.
          Visitors can switch it from within the panel.
        </p>
      </div>
    </div>
  );
}
