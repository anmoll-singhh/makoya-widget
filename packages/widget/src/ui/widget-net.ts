/**
 * ui/widget-net.ts
 *
 * Tiny fail-silent client for the widget's own backend POST routes
 * (`/api/widget-feedback`). The backend origin is derived from the SAME
 * mechanism the config fetch + telemetry use (`new URL(configBase()).origin`),
 * so the widget always talks to the backend it already trusts.
 *
 * Contract: never throws, never rejects — returns a boolean ok. The widget is
 * fail-silent, so a network/CORS/outage just means "couldn't send".
 */

import { configBase } from "../fetch-config";

function apiOrigin(): string | null {
  try {
    return new URL(configBase()).origin;
  } catch {
    return null;
  }
}

/** POST a visitor's accessibility feedback. Resolves true only on a 2xx. */
export async function postFeedback(body: {
  siteId: string;
  message: string;
  email?: string;
  url?: string;
}): Promise<boolean> {
  try {
    const origin = apiOrigin();
    if (!origin || typeof fetch === "undefined") return false;
    const res = await fetch(`${origin}/api/widget-feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * POST selected text to the AI-simplify route. Returns the simplified string on
 * success, or null on ANY failure (route disabled/403, key missing/503, network,
 * non-2xx). Never throws/rejects — the widget treats null as "not available".
 */
export async function postSimplify(body: {
  siteId: string;
  text: string;
  lang?: string;
}): Promise<string | null> {
  try {
    const origin = apiOrigin();
    if (!origin || typeof fetch === "undefined") return null;
    const res = await fetch(`${origin}/api/widget-simplify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; text?: string };
    return data?.ok && typeof data.text === "string" ? data.text : null;
  } catch {
    return null;
  }
}
