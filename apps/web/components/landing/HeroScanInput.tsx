/**
 * components/landing/HeroScanInput.tsx — the hero's interactive hook.
 *
 * The landing page is a Server Component for speed/SEO; this small client island
 * is the one interactive piece. Research is clear that putting the free tool IN
 * the hero (not a button to elsewhere) is the highest-converting pattern, so we
 * carry the typed URL straight into /scan via a query param. /scan reads ?url=,
 * prefills, and auto-runs — the visitor sees their real score with one action.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeroScanInput({ cta, placeholder }: { cta: string; placeholder: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    router.push(trimmed ? `/scan?url=${encodeURIComponent(trimmed)}` : "/scan");
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
      <Input
        type="text"
        inputMode="url"
        autoComplete="url"
        aria-label="Website address to scan"
        placeholder={placeholder}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-12 flex-1 text-base"
      />
      <Button type="submit" size="lg" className="h-12 px-7 text-base">
        {cta}
      </Button>
    </form>
  );
}
