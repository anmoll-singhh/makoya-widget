/**
 * app/admin/sites/[id]/loading.tsx — instant skeleton for the customer detail.
 *
 * Suspense fallback shown while the server component awaits the site detail
 * (site + scan history + requests). Mirrors sites/[id]/page.tsx: back link,
 * identity header card, and two listed sections. shadcn <Skeleton> is stilled
 * under prefers-reduced-motion by the globals.css guard.
 */
import { Skeleton } from "@/components/ui/skeleton";

function RowSkel() {
  return (
    <div
      className="trow"
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}
    >
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-3.5 w-40" />
    </div>
  );
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading customer" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Back link */}
      <Skeleton className="h-10 w-36 rounded-xl" />

      {/* Identity header card */}
      <div className="card cpad between">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Skeleton className="h-12 w-12 rounded-[13px]" />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Scan history */}
      <section>
        <Skeleton className="mb-2.5 h-3 w-24" />
        <div className="tcard">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkel key={i} />
          ))}
        </div>
      </section>

      {/* Consultation requests */}
      <section>
        <Skeleton className="mb-2.5 h-3 w-40" />
        <div className="tcard">
          {Array.from({ length: 2 }).map((_, i) => (
            <RowSkel key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
