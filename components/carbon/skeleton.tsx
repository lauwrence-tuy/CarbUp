import type { ReactNode } from "react";

/**
 * Loading placeholders in the CarbUp card style. Server-safe (no client
 * hooks), so route `loading.tsx` files can use them. The pulse is skipped for
 * people who prefer reduced motion.
 */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-full bg-white/[0.06] motion-safe:animate-pulse ${className}`}
    />
  );
}

/** A card-shaped placeholder; children are the placeholder lines inside it. */
export function SkeletonTile({
  className = "",
  children
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-[28px] border border-white/[0.04] bg-cds-layer p-6 shadow-[var(--cu-shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Label + big number + helper, the shape of a StatTile. */
export function SkeletonStat({ className = "" }: { className?: string }) {
  return (
    <SkeletonTile className={className}>
      <SkeletonBlock className="h-3 w-20" />
      <SkeletonBlock className="mt-4 h-8 w-28" />
      <SkeletonBlock className="mt-3 h-3 w-24" />
    </SkeletonTile>
  );
}
