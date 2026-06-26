/**
 * core/telemetry.ts
 *
 * Fire-and-forget, NEVER-throws widget usage telemetry. This is the client end
 * of the Wave-1 backend endpoints that already exist:
 *
 *   POST /api/heartbeat       { siteId, token?, url }
 *   POST /api/widget-events   { siteId, token?, events: [{ event, featureKey?, ts }] }
 *
 * WHY THIS SHAPE (non-negotiable widget rule #1 — availability is sacred)
 *   Telemetry is the LEAST important thing the widget does, so it must be the
 *   first thing sacrificed when anything goes wrong. Every public function here
 *   is wrapped so it can NEVER throw into the widget and NEVER block rendering or
 *   effects. Every network call is fire-and-forget: we do not await it, we do not
 *   read its result, and we swallow any rejection. If `fetch`/`navigator` is
 *   missing, or there is no `siteId`, or the host opted out, we silently no-op.
 *
 * NO PII
 *   We only ever send: siteId, token, the current page URL, an event name, and a
 *   featureKey. Never user content, never keystrokes, never form data.
 *
 * API ORIGIN
 *   We do NOT hardcode a domain. We reuse the SAME mechanism the config fetch
 *   uses (`configBase()` in ../fetch-config, overridable via the
 *   `MAKOYA_CONFIG_BASE` window global) and take its origin, so telemetry always
 *   targets the same backend the widget already talks to. A `MAKOYA_API_ORIGIN`
 *   window global can override it explicitly.
 *
 * THROTTLING / BATCHING
 *   • Heartbeats are throttled to at most once per 5 minutes per page session, so
 *     SPA route changes and re-renders cannot spam the endpoint.
 *   • Usage events are buffered and flushed as a single batch (≤50) on a short
 *     debounce timer AND on page-hide / tab-hidden (with `keepalive`) so events
 *     are not lost when the user navigates away. The buffer is capped so a
 *     pathological page cannot grow it without bound.
 */

import { configBase } from "../fetch-config";

/** The only two event names the widget emits. */
export type TelemetryEventName = "open" | "feature_activated";

/** One buffered usage event. `featureKey` is only present for feature_activated. */
interface BufferedEvent {
  event: TelemetryEventName;
  featureKey?: string;
  ts: number;
}

/** Heartbeat at most once per this window, per page session. */
const HEARTBEAT_THROTTLE_MS = 5 * 60 * 1000;
/** Debounce window before an event batch is flushed. */
const FLUSH_DEBOUNCE_MS = 2000;
/** Hard cap on buffered events AND on a single flush batch size. */
const MAX_BUFFER = 50;

// ── Module-singleton state (one widget instance per page) ───────────────────
let siteId: string | null = null;
let token: string | undefined;
let enabled = false;
let lastHeartbeatAt = 0;
let buffer: BufferedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let unloadHooked = false;

/**
 * Resolve the backend origin the SAME way the config fetch resolves its base.
 * Returns null only if everything fails (then callers no-op).
 */
function apiOrigin(): string | null {
  try {
    const explicit = (window as unknown as { MAKOYA_API_ORIGIN?: string })
      .MAKOYA_API_ORIGIN;
    if (typeof explicit === "string" && explicit) {
      return explicit.replace(/\/+$/, "");
    }
    // Reuse the config-fetch base and take its origin.
    return new URL(configBase()).origin;
  } catch {
    try {
      return location.origin;
    } catch {
      return null;
    }
  }
}

/**
 * Host opt-out: a `data-no-telemetry` attribute on any widget script tag, or a
 * `MAKOYA_NO_TELEMETRY` window global, disables all emission.
 */
function isOptedOut(): boolean {
  try {
    if ((window as unknown as { MAKOYA_NO_TELEMETRY?: unknown }).MAKOYA_NO_TELEMETRY) {
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    if (
      typeof document !== "undefined" &&
      typeof document.querySelector === "function" &&
      document.querySelector("script[data-no-telemetry]")
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Configure telemetry for this page. Safe to call once after the widget mounts.
 * Emission stays disabled unless there is a siteId, the host has not opted out,
 * and `fetch` exists.
 */
export function configureTelemetry(opts: {
  siteId?: string | null;
  token?: string;
}): void {
  try {
    siteId = opts.siteId || null;
    token = opts.token;
    enabled =
      !!siteId && typeof fetch === "function" && !isOptedOut();
    if (enabled) hookUnload();
  } catch {
    enabled = false;
  }
}

/**
 * Fire one POST. Fire-and-forget: never awaited, rejection swallowed, never
 * throws. No-ops if `fetch` is unavailable or no origin can be resolved.
 */
function post(path: string, body: unknown): void {
  try {
    if (typeof fetch !== "function") return;
    const origin = apiOrigin();
    if (!origin) return;
    const ret = fetch(origin + path, {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      mode: "cors",
    });
    // Swallow any rejection so a failed beacon never surfaces as an unhandled
    // rejection or breaks the caller.
    if (ret && typeof (ret as Promise<unknown>).catch === "function") {
      (ret as Promise<unknown>).catch(() => {});
    }
  } catch {
    /* never throw */
  }
}

/**
 * Send a heartbeat — throttled to at most once per HEARTBEAT_THROTTLE_MS per
 * page session. Call on init and after SPA navigation; the throttle absorbs the
 * spam from route changes and re-renders.
 */
export function recordHeartbeat(): void {
  try {
    if (!enabled || !siteId) return;
    const now = Date.now();
    if (now - lastHeartbeatAt < HEARTBEAT_THROTTLE_MS) return;
    lastHeartbeatAt = now;
    // Data minimization: send only origin + pathname, never the query string or
    // hash — host pages can carry PII/tokens there (e.g. ?email=, #reset_token=).
    let url = "";
    try {
      const u = new URL(location.href);
      url = u.origin + u.pathname;
    } catch {
      url = "";
    }
    post("/api/heartbeat", { siteId, token, url });
  } catch {
    /* never throw */
  }
}

/**
 * Buffer a usage event and schedule a debounced batch flush. Drops the event if
 * the buffer is already at its cap (a pathological page cannot grow it forever).
 */
export function trackEvent(event: TelemetryEventName, featureKey?: string): void {
  try {
    if (!enabled || !siteId) return;
    if (buffer.length >= MAX_BUFFER) return; // capped — drop the overflow
    buffer.push(featureKey ? { event, featureKey, ts: Date.now() } : { event, ts: Date.now() });
    scheduleFlush();
  } catch {
    /* never throw */
  }
}

function scheduleFlush(): void {
  try {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushEvents();
    }, FLUSH_DEBOUNCE_MS);
  } catch {
    /* never throw */
  }
}

/**
 * Flush the buffered events as ONE batch (≤MAX_BUFFER). Fire-and-forget. Used by
 * the debounce timer and by the page-hide / tab-hidden handlers (keepalive lets
 * the request outlive the page).
 */
export function flushEvents(): void {
  try {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!enabled || !siteId) {
      buffer = [];
      return;
    }
    if (buffer.length === 0) return;
    const events = buffer.slice(0, MAX_BUFFER);
    buffer = buffer.slice(MAX_BUFFER);
    post("/api/widget-events", { siteId, token, events });
  } catch {
    /* never throw */
  }
}

/**
 * Flush the buffer when the page is being hidden / unloaded, so the last events
 * aren't lost. `visibilitychange`→hidden + `pagehide` are the reliable signals
 * (`pagehide` fires on bfcache too; `unload` is unreliable on mobile).
 */
function hookUnload(): void {
  try {
    if (unloadHooked) return;
    if (
      typeof document !== "undefined" &&
      typeof document.addEventListener === "function"
    ) {
      document.addEventListener("visibilitychange", () => {
        try {
          if (document.visibilityState === "hidden") flushEvents();
        } catch {
          /* never throw */
        }
      });
    }
    if (
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function"
    ) {
      window.addEventListener("pagehide", () => {
        try {
          flushEvents();
        } catch {
          /* never throw */
        }
      });
    }
    unloadHooked = true;
  } catch {
    /* never throw */
  }
}

/**
 * Test-only: reset all module-singleton state. Not used in production code.
 */
export function __resetTelemetryForTests(): void {
  siteId = null;
  token = undefined;
  enabled = false;
  lastHeartbeatAt = 0;
  buffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  unloadHooked = false;
}
