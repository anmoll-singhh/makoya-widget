/**
 * fetch-config.ts  →  the SINGLE gated config-fetch shared by BOTH entry bundles
 * (loader.ts and core/index.ts auto-init).
 *
 * THE CONTRACT
 *   The client snippet carries `data-site` (which site's config to load) and
 *   `data-token` (a per-site token that proves the snippet was issued by us).
 *   We forward the token to the config endpoint as the query param `?t=TOKEN`.
 *   The endpoint may answer with `active: false` — an EXPLICIT "this site is
 *   licensed-off / domain-mismatch — do not mount" verdict.
 *
 * WHY THIS EXISTS
 *   Before this, core/index.ts auto-init mounted on raw DEFAULT_CONFIG without
 *   ever calling the config endpoint — a free bypass of the gate. Routing BOTH
 *   bundles through this one function closes that hole: every auto-mount path
 *   now hits the endpoint and honours the `active` verdict.
 *
 * THE FAIL-OPEN ASYMMETRY (non-negotiable rule #1 — availability is sacred)
 *   • A NON-200, a network/CORS error, or a thrown fetch → we return
 *     `{ active: true, config: {} }`. No verdict was delivered, so we FAIL OPEN
 *     and let the widget mount on defaults. A paying customer is never punished
 *     for an outage on our side.
 *   • Only an EXPLICIT `active: false` in a 200 body suppresses the widget. A
 *     freeloader's browser always reaches our server, so it always receives the
 *     explicit `false`; an outage produces `undefined`, which is NOT `false`.
 *
 * `active` is a LOADER-LOCAL transport/envelope flag. It is deliberately NOT
 * part of the canonical `WidgetConfig` in `packages/shared` (adding it would
 * force a `sync:shared` regen and trip the shared-sync drift gate for a value
 * the widget UI never reads), so we strip it off before returning `config`.
 */

import type { WidgetConfig } from "@makoya/shared";

/**
 * Loader-LOCAL transport shape of the raw fetched payload: a partial widget
 * config plus the optional envelope flag `active`. Kept here, never in shared.
 */
type FetchedPayload = Partial<WidgetConfig> & { active?: boolean };

/** What callers get back: a clean verdict + the config with `active` removed. */
export interface GatedConfig {
  /** false ONLY when the server explicitly said so; true on success or any failure. */
  active: boolean;
  /** The widget config, guaranteed free of the transport-only `active` flag. */
  config: Partial<WidgetConfig>;
}

/**
 * Resolve the config endpoint base the SAME way loader.ts does, so both bundles
 * agree. Overridable via the `MAKOYA_CONFIG_BASE` window global (set by the
 * build env); falls back to the production CDN.
 *
 * Exported so the telemetry module can derive the backend origin from the EXACT
 * same mechanism (it takes `new URL(configBase()).origin`), guaranteeing usage
 * beacons always target the same backend the widget already fetches config from.
 */
export function configBase(): string {
  return (
    (window as any).MAKOYA_CONFIG_BASE ||
    "https://makoya-gamma.vercel.app/api/config"
  );
}

/**
 * How long to wait for the config endpoint before giving up and FAILING OPEN.
 *
 * Non-negotiable rule #1 says a network FAILURE must never stop the widget — but
 * a slow *hang* (the server accepts the TCP connection then never responds: cold
 * start stall, overloaded origin, captive portal) is not a failure `fetch` will
 * reject quickly. Without a bound the loader's `Promise.all([config, core])`
 * never settles and the widget silently never mounts. We abort after this budget
 * so a hang resolves to the SAME fail-open verdict as an error. Overridable via
 * the `MAKOYA_CONFIG_TIMEOUT_MS` window global (the tests set it tiny).
 */
function configTimeoutMs(): number {
  const v = (window as any).MAKOYA_CONFIG_TIMEOUT_MS;
  return typeof v === "number" && v > 0 ? v : 5000;
}

/**
 * Fetch + gate a site's config. NEVER throws — every failure mode resolves to
 * the fail-open verdict `{ active: true, config: {} }`.
 *
 * @param siteId  the site whose config to load (from `data-site`).
 * @param token   the per-site token (from `data-token`), forwarded as `?t=`.
 */
export async function fetchGatedConfig(
  siteId: string,
  token?: string,
): Promise<GatedConfig> {
  const base = configBase();
  const url =
    `${base}/${encodeURIComponent(siteId)}` +
    (token ? `?t=${encodeURIComponent(token)}` : "");

  // Bound the request with an AbortController so a HANG (not just an error) also
  // fails open. AbortController is universal in browsers; guard for exotic hosts.
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), configTimeoutMs())
    : null;

  try {
    const res = await fetch(url, { cache: "default", signal: controller?.signal });
    // Non-200 → no verdict delivered → FAIL OPEN (mount on defaults).
    if (!res.ok) return { active: true, config: {} };

    const payload = (await res.json()) as FetchedPayload;

    // Strip the transport-only `active` flag off before handing config to init().
    const { active, ...config } = payload;

    // active === false is the ONLY value that suppresses the widget. Anything
    // else (true / undefined / missing) means mount.
    return { active: active !== false, config };
  } catch {
    // Network / CORS / timeout / abort / parse error → FAIL OPEN (non-negotiable #1).
    return { active: true, config: {} };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
