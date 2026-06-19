"use client";
import { useState } from "react";

export function SnippetBox({ siteId }: { siteId: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="${siteId}" defer></script>`;
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Install snippet</span>
        <button
          onClick={async () => {
            try {
              if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(snippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            } catch {
              /* clipboard unavailable (insecure context) — visible to select manually */
            }
          }}
          className="transition-base rounded-md px-2 py-0.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl bg-neutral-950 p-3.5 text-[11px] leading-relaxed text-neutral-300 ring-1 ring-neutral-800">
        {snippet}
      </pre>
    </div>
  );
}
