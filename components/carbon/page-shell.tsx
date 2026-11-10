"use client";

import type { ReactNode } from "react";
import { Column, Grid, Tile } from "@carbon/react";
import { CarbonHeader } from "./carbon-header";

/** Header + main area shared by every signed-in page. */
export function PageShell({
  isConnected,
  children
}: {
  isConnected: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <CarbonHeader isConnected={isConnected} />
      <main id="main-content" className="min-h-screen bg-cds-background pb-16 pt-8">
        {children}
      </main>
    </>
  );
}

/** Page heading row: small label, title, optional description and actions. */
export function PageTitle({
  label,
  title,
  description,
  actions
}: {
  label?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {label ? <p className="cu-label">{label}</p> : null}
            <h1 className={`cu-heading-05 ${label ? "mt-2" : ""}`}>{title}</h1>
            {description ? (
              <p className="cu-body-01 mt-3 max-w-[40rem] text-cds-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      </Column>
    </Grid>
  );
}

/** A labelled number tile (label above value, helper below). */
export function StatTile({
  label,
  value,
  helper,
  accent = false
}: {
  label: string;
  value: string;
  helper?: string;
  accent?: boolean;
}) {
  return (
    <Tile className="!p-6">
      <p className="cu-label">{label}</p>
      <p className={`cu-number mt-2 ${accent ? "cu-accent" : ""}`}>{value}</p>
      {helper ? <p className="cu-helper mt-1">{helper}</p> : null}
    </Tile>
  );
}

/** Pill toggle group, like the header nav (white pill = selected). */
export function PillGroup<T extends string | number | null>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-full bg-black/35 p-1">
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={`min-h-10 rounded-full px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus ${
              isSelected
                ? "bg-white text-black"
                : "text-cds-text-secondary hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Intensity → Carbon Tag colour, shared by every workout list. */
export const effortTagType = {
  Easy: "green",
  Moderate: "blue",
  Hard: "magenta",
  "Very Hard": "red"
} as const;
