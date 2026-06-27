/**
 * app/admin/leads/loading.tsx — instant skeleton for the Leads list.
 *
 * Suspense fallback shown while the server component awaits the service-role
 * read of `leads`. Mirrors leads/page.tsx (header + subtitle + rows). shadcn
 * <Skeleton> is stilled under prefers-reduced-motion by the globals.css guard.
 */
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading leads">
      {/* Header + subtitle */}
      <div className="between" style={{ marginBottom: "22px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Lead rows */}
      <div className="tcard">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="trow"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}
          >
            <Skeleton className="h-4 w-48" />
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
