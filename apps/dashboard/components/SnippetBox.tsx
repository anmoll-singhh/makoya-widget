"use client";
import { useState } from "react";
export function SnippetBox({ siteId }: { siteId: string }) {
  const base = process.env.NEXT_PUBLIC_CDN_BASE || "https://cdn.makoya.example";
  const snippet = `<script src="${base}/loader.js" data-site="${siteId}" defer></script>`;
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="snippet">{snippet}</div>
      <div style={{ height: 8 }} />
      <button className="btn secondary" onClick={() => { navigator.clipboard.writeText(snippet); setCopied(true); }}>
        {copied ? "Copied ✓" : "Copy snippet"}
      </button>
    </div>
  );
}
