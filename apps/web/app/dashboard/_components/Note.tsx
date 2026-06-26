/**
 * Note — inline informational banner.
 *
 * Three tones: info (blue), warn (amber), good (green).
 * Mirrors .note.info/.note.warn/.note.good from dashboard.css.
 */

import type { ReactNode } from "react";

const TONE_ICON: Record<string, string> = {
  info: "ti ti-info-circle",
  warn: "ti ti-alert-triangle",
  good: "ti ti-circle-check",
};

interface NoteProps {
  tone: "info" | "warn" | "good";
  children: ReactNode;
}

export function Note({ tone, children }: NoteProps) {
  return (
    <div className={`note ${tone}`} role={tone === "warn" ? "alert" : "note"}>
      <i className={TONE_ICON[tone]} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
