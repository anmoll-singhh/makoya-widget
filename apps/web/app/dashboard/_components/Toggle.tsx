/**
 * Toggle — accessible on/off switch.
 *
 * Renders as a real <button role="switch" aria-checked> so it is
 * keyboard-operable (Space/Enter to toggle) and screen-reader-friendly.
 * Visual style mirrors .toggle/.toggle.on from dashboard.css.
 */

"use client";

interface ToggleProps {
  on: boolean;
  onChange: (next: boolean) => void;
  /** Visible label (used as aria-label when no external label is associated) */
  label: string;
  /** Optional id to associate with an external <label> */
  id?: string;
}

export function Toggle({ on, onChange, label, id }: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`toggle${on ? " on" : ""}`}
      style={{ border: "none", padding: 0, cursor: "pointer" }}
    >
      <span className="sr-only">{label}</span>
    </button>
  );
}
