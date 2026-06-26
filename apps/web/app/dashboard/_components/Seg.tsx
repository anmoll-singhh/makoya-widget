/**
 * Seg — segmented control (tab-like toggle group).
 *
 * A real set of <button> elements inside a container styled as .seg.
 * Each option is keyboard-operable. The active button gets class "on".
 */

"use client";

interface SegOption {
  value: string;
  label: string;
}

interface SegProps {
  options: SegOption[];
  value: string;
  onChange: (value: string) => void;
  /** Optional aria-label for the group */
  label?: string;
}

export function Seg({ options, value, onChange, label }: SegProps) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={opt.value === value ? "on" : ""}
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
