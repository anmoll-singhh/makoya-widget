"use client";
/**
 * SnippetBox — the merchant's install surface (Phase 1.5 §A4).
 *
 * Client component (for the copy-to-clipboard UX) that renders THREE copyable
 * things from props the RSC passes down:
 *   1. the full contract snippet (incl. data-token) for raw-HTML / theme.liquid,
 *   2. the bare Site ID, and
 *   3. the bare Token —
 * the last two so they can be pasted into the WordPress / Shopify settings forms.
 *
 * SECURITY: the token arrives ALREADY MINTED as a prop. This component must NEVER
 * import lib/licensing/token.ts (the signing secret stays server-side only).
 */
import { useState } from "react";

const LOADER_URL = "https://makoya-gamma.vercel.app/widget/loader.js";

/** Small copy button that reflects a transient "Copied ✓" state. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        } catch {
          /* clipboard unavailable (insecure context) — value stays selectable */
        }
      }}
      className="transition-base shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

/** A single labelled, copyable inline value (Site ID / Token). */
function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
        <CopyButton value={value} label={label} />
      </div>
      <code className="block overflow-x-auto rounded-lg bg-neutral-100 px-3 py-2 text-[11px] leading-relaxed text-neutral-700 ring-1 ring-neutral-200">
        {value}
      </code>
    </div>
  );
}

export function SnippetBox({ siteId, token }: { siteId: string; token: string }) {
  const snippet = `<script src="${LOADER_URL}" data-site="${siteId}" data-token="${token}" defer></script>`;

  return (
    <div className="mt-4 space-y-4">
      {/* Full contract snippet — paste into raw HTML / theme.liquid before </head>. */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Install snippet</span>
          <CopyButton value={snippet} label="install snippet" />
        </div>
        <pre className="overflow-x-auto rounded-xl bg-neutral-950 p-3.5 text-[11px] leading-relaxed text-neutral-300 ring-1 ring-neutral-800">
          {snippet}
        </pre>
      </div>

      {/* Bare values — for the WordPress / Shopify settings forms. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <CopyField label="Site ID" value={siteId} />
        <CopyField label="Token" value={token} />
      </div>
    </div>
  );
}
