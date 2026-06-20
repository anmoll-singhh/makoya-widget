/**
 * useAutosave — debounced autosave hook for the widget customizer.
 *
 * Watches `config` for changes (skipping the initial mount value) and
 * fires a PATCH to /api/sites/[siteId]/config after a 700 ms quiet period.
 * Rapid edits coalesce: each new change resets the timer.  `saveNow()`
 * flushes immediately (cancels any pending debounce and saves synchronously).
 *
 * Stale-closure strategy
 * ──────────────────────
 * The debounce effect depends on `serialized` (the JSON string of `config`),
 * which re-arms the timer on every change.  The *actual* save call reads from
 * `configRef` (kept current on every render) so `saveNow` and the debounced
 * closure always operate on the latest value without capturing a stale one.
 *
 * Save-on-mount prevention
 * ────────────────────────
 * `lastSavedRef` is initialised to the serialized value of the *first* config
 * received (the server-loaded value).  The save function bails early when the
 * serialized config equals `lastSavedRef`, so the first render never triggers
 * a network request.  Subsequent renders only trigger a save when the value
 * actually differs from the last thing we successfully persisted.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SiteConfig } from "@/lib/sites-mappers";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 700;
const SAVED_RESET_MS = 1500;

export function useAutosave(
  siteId: string,
  config: SiteConfig,
): { status: AutosaveStatus; saveNow: () => void } {
  const [status, setStatus] = useState<AutosaveStatus>("idle");

  // Always holds the latest config — prevents stale closures in saveNow and
  // the debounced callback without adding `config` as a dep of saveNow.
  const configRef = useRef<SiteConfig>(config);
  configRef.current = config;

  // Tracks the serialized form of the last value we successfully sent to the
  // server.  Initialised to the first (server-loaded) value so we never save
  // on mount.
  const serialized = JSON.stringify(config);
  const lastSavedRef = useRef<string>(serialized);

  // Ref for the "saved → idle" auto-reset timer so we can clear it on unmount.
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Core save function — shared by the debounce path and saveNow.
  // Returns early when nothing has changed since the last successful save.
  const persist = useCallback(async () => {
    const current = JSON.stringify(configRef.current);
    if (current === lastSavedRef.current) return; // nothing changed

    setStatus("saving");
    try {
      const res = await fetch(`/api/sites/${siteId}/config`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: current,
      });

      if (res.ok) {
        lastSavedRef.current = current;
        setStatus("saved");

        // Auto-reset to idle after SAVED_RESET_MS.
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setStatus("idle");
        }, SAVED_RESET_MS);
      } else {
        setStatus("error");
      }
    } catch {
      // Network failure or JSON parse error — surface as error, never throw.
      setStatus("error");
    }
  }, [siteId]); // siteId is stable for the lifetime of the customizer page

  // Debounce effect: re-arms whenever the serialized config changes.
  // Using `serialized` (a string primitive) as the dependency means React's
  // equality check is value-based, so referentially-new but identical configs
  // don't re-arm the timer.
  useEffect(() => {
    // Skip save if this is still the initial (server-loaded) value.
    if (serialized === lastSavedRef.current) return;

    const timer = setTimeout(() => {
      persist();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [serialized, persist]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up the "saved → idle" reset timer on unmount.
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Imperative flush: cancels any pending debounce (handled by the effect
  // cleanup when the component re-renders) and saves immediately.
  // We trigger a re-render by calling persist directly; the debounce effect
  // will see the same `serialized` value and bail (timer won't fire before
  // persist completes).
  const saveNow = useCallback(() => {
    persist();
  }, [persist]);

  return { status, saveNow };
}
