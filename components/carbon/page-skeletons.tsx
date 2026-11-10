"use client";

import type { ReactNode } from "react";
import { Column, Grid } from "@carbon/react";
import { PageShell } from "./page-shell";
import { SkeletonBlock, SkeletonStat, SkeletonTile } from "./skeleton";

/**
 * Route loading screens: the real header plus card-shaped placeholders laid
 * out like each page, so a click shows the page's frame at once while the
 * server fetches its data.
 */
function SkeletonPage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <PageShell isConnected>
      <p role="status" className="sr-only">
        Loading {label}…
      </p>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          {children}
        </Column>
      </Grid>
    </PageShell>
  );
}

function SkeletonTitle() {
  return (
    <div aria-hidden="true">
      <SkeletonBlock className="h-3 w-20" />
      <SkeletonBlock className="mt-4 h-9 w-64 max-w-full" />
      <SkeletonBlock className="mt-4 h-3 w-96 max-w-full" />
    </div>
  );
}

function SkeletonWeekBar() {
  return (
    <SkeletonTile>
      <SkeletonBlock className="h-5 w-40" />
      <SkeletonBlock className="mt-3 h-3 w-64 max-w-full" />
      <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-3">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="h-[7.5rem] rounded-[18px] bg-black/30 motion-safe:animate-pulse" />
        ))}
      </div>
    </SkeletonTile>
  );
}

function SkeletonRows({ count, className = "" }: { count: number; className?: string }) {
  return (
    <SkeletonTile className={className}>
      <SkeletonBlock className="h-3 w-28" />
      <div className="mt-4 divide-y divide-white/[0.05]">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="flex items-center gap-4 py-4">
            <div className="size-9 shrink-0 rounded-full bg-white/[0.06] motion-safe:animate-pulse" />
            <div className="flex-1">
              <SkeletonBlock className="h-3 w-40 max-w-full" />
              <SkeletonBlock className="mt-2 h-3 w-24" />
            </div>
            <SkeletonBlock className="h-3 w-14" />
          </div>
        ))}
      </div>
    </SkeletonTile>
  );
}

export function DashboardSkeleton() {
  return (
    <SkeletonPage label="dashboard">
      <SkeletonWeekBar />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SkeletonTile>
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="mt-5 h-14 w-48" />
          <SkeletonBlock className="mt-3 h-3 w-28" />
          <SkeletonBlock className="mt-8 h-2 w-full" />
          <SkeletonBlock className="mt-8 h-3 w-56 max-w-full" />
          <div className="mt-8 grid grid-cols-3 gap-4">
            <SkeletonBlock className="h-2" />
            <SkeletonBlock className="h-2" />
            <SkeletonBlock className="h-2" />
          </div>
        </SkeletonTile>
        <SkeletonRows count={4} />
      </div>
      <SkeletonRows count={2} className="mt-4" />
    </SkeletonPage>
  );
}

export function NutritionSkeleton() {
  return (
    <SkeletonPage label="nutrition">
      <SkeletonWeekBar />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SkeletonTile className="min-h-[28rem]">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-5 h-11 w-full" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
            <SkeletonBlock className="h-10" />
          </div>
          <SkeletonBlock className="mt-5 h-11 w-full" />
        </SkeletonTile>
        <SkeletonRows count={4} />
      </div>
    </SkeletonPage>
  );
}

export function WorkoutsSkeleton() {
  return (
    <SkeletonPage label="workouts">
      <SkeletonTitle />
      <div className="mt-8 flex flex-wrap gap-3">
        <SkeletonBlock className="h-11 w-full max-w-sm" />
        <SkeletonBlock className="h-11 w-56" />
      </div>
      <SkeletonRows count={6} className="mt-6" />
    </SkeletonPage>
  );
}

export function TrendsSkeleton() {
  return (
    <SkeletonPage label="trends">
      <SkeletonTitle />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <SkeletonTile className="mt-4">
        <SkeletonBlock className="h-3 w-36" />
        <div className="mt-6 h-64 rounded-2xl bg-white/[0.03] motion-safe:animate-pulse" />
      </SkeletonTile>
    </SkeletonPage>
  );
}

export function WorkoutDetailSkeleton() {
  return (
    <SkeletonPage label="workout">
      <SkeletonBlock className="h-10 w-32" />
      <div className="mt-6">
        <SkeletonTitle />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <SkeletonTile className="mt-4 !p-0">
        <div className="px-6 py-5">
          <SkeletonBlock className="h-3 w-24" />
        </div>
        <div className="aspect-[1200/420] w-full rounded-b-[28px] bg-white/[0.03] motion-safe:animate-pulse" />
      </SkeletonTile>
    </SkeletonPage>
  );
}

export function SettingsSkeleton() {
  return (
    <SkeletonPage label="settings">
      <SkeletonTitle />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <SkeletonTile className="min-h-72">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-6 h-11 w-full" />
          <SkeletonBlock className="mt-4 h-11 w-full" />
          <SkeletonBlock className="mt-4 h-11 w-full" />
        </SkeletonTile>
        <SkeletonTile className="min-h-72">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-6 h-11 w-full" />
          <SkeletonBlock className="mt-4 h-11 w-full" />
        </SkeletonTile>
      </div>
    </SkeletonPage>
  );
}
