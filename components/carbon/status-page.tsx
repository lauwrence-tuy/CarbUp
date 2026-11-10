import Link from "next/link";
import type { ReactNode } from "react";
import { Flame } from "lucide-react";

/** Centered card for 404 / error states, in the CarbUp style. */
export function StatusPage({
  label,
  title,
  description,
  actions
}: {
  label: string;
  title: string;
  description: string;
  actions: ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-cds-background px-4 py-12"
    >
      <section className="w-full max-w-lg rounded-[28px] border border-white/[0.04] bg-cds-layer p-8 text-center shadow-[var(--cu-shadow-card)]">
        <Link
          href="/"
          className="mx-auto inline-flex items-center gap-3 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cds-focus"
        >
          <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-cds-interactive">
            <Flame className="size-6" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-[-0.04em]">
            Carb<span className="text-cds-interactive">Up</span>
          </span>
        </Link>
        <p className="cu-label mt-8">{label}</p>
        <h1 className="cu-heading-05 mt-2">{title}</h1>
        <p className="cu-body-01 mx-auto mt-3 max-w-sm text-cds-text-secondary">{description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>
      </section>
    </main>
  );
}

export const statusPrimaryClass =
  "inline-flex min-h-11 items-center rounded-full bg-cds-interactive px-5 text-sm font-bold text-black shadow-[var(--cu-shadow-glow)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const statusSecondaryClass =
  "inline-flex min-h-11 items-center rounded-full border border-white/[0.16] px-5 text-sm font-bold text-white transition hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus";
