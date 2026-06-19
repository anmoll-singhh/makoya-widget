"use client";
import { useState } from "react";

export function SnippetBox({ siteId }: { siteId: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="https://cdn.makoya.example/loader.js" data-site="${siteId}" defer></script>`;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">Install snippet</span>
        <button
          onClick={async () => {
            try {
              if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(snippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            } catch {
              /* clipboard unavailable (insecure context) — the snippet is visible to select manually */
            }
          }}
          className="text-xs font-medium text-neutral-700 hover:text-neutral-900"
        >{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre className="mt-1 overflow-x-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-800 ring-1 ring-neutral-200">{snippet}</pre>
    </div>
  );
}
