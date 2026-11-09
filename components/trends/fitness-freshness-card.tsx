"use client";

import type { MouseEvent } from "react";
import { useState } from "react";
import { ChevronDown, LineChart } from "lucide-react";
import { type FitnessFreshnessPoint, timeframeOptions } from "@/lib/trends";
import {
  ActivityDots,
  ChartLegend,
  chartHeight,
  chartWidth,
  FreshnessHoverOverlay,
  FreshnessLine,
  FreshnessMetric,
  getFormZeroY
} from "./fitness-freshness-chart";

/** Fitness / fatigue / form chart with week-over-week deltas and hover details. */
export function FitnessFreshnessCard({
  points,
  selectedTimeframe
}: {
  points: FitnessFreshnessPoint[];
  selectedTimeframe: string;
}) {
  const [hoveredFreshnessIndex, setHoveredFreshnessIndex] = useState<
    number | null
  >(null);
  const latestFitnessFreshness =
    points[points.length - 1];
  const previousFitnessFreshness =
    points[points.length - 8];
  const fitnessDelta =
    latestFitnessFreshness && previousFitnessFreshness
      ? latestFitnessFreshness.fitness - previousFitnessFreshness.fitness
      : null;
  const fatigueDelta =
    latestFitnessFreshness && previousFitnessFreshness
      ? latestFitnessFreshness.fatigue - previousFitnessFreshness.fatigue
      : null;
  const formDelta =
    latestFitnessFreshness && previousFitnessFreshness
      ? latestFitnessFreshness.form - previousFitnessFreshness.form
      : null;
  const maxFreshnessValue = Math.max(
    ...points.flatMap((point) => [
      point.fitness,
      point.fatigue,
      Math.abs(point.form)
    ]),
    1
  );
  const hoveredFreshnessPoint =
    hoveredFreshnessIndex == null
      ? null
      : points[hoveredFreshnessIndex];

  function handleFreshnessMouseMove(event: MouseEvent<SVGSVGElement>) {
    if (points.length === 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * chartWidth;
    const index = Math.max(
      0,
      Math.min(
        points.length - 1,
        Math.round((x / chartWidth) * (points.length - 1))
      )
    );

    setHoveredFreshnessIndex(index);
  }

  return (
  <section className="mt-6 rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-app-orange text-white">
          <LineChart className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
            Fitness & Freshness
          </h2>
          <p className="mt-1 text-sm text-app-muted">
            Strava Relative Effort when available, with local load fallback
          </p>
        </div>
      </div>
      <label className="hidden">
        <span className="sr-only">Fitness and freshness date range</span>
        <select
          className="min-h-10 appearance-none rounded-full border border-white/[0.06] bg-black/35 py-2 pl-4 pr-9 text-xs font-bold text-app-green outline-none transition focus:border-app-green/60"
          onChange={() => undefined}
          value={selectedTimeframe}
        >
          {timeframeOptions.map((option) => (
            <option key={option.label} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0] text-app-green">
          <ChevronDown className="size-3.5" aria-hidden="true" />
          ▾
        </span>
      </label>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <FreshnessMetric
        label="Fitness"
        value={latestFitnessFreshness?.fitness ?? 0}
        delta={fitnessDelta}
        color="text-app-orange"
      />
      <FreshnessMetric
        label="Fatigue"
        value={latestFitnessFreshness?.fatigue ?? 0}
        delta={fatigueDelta}
        color="text-app-secondary"
      />
      <FreshnessMetric
        label="Form"
        value={latestFitnessFreshness?.form ?? 0}
        delta={formDelta}
        color="text-app-blue"
      />
    </div>

    <div className="mt-8 h-[540px] rounded-[24px] bg-black/24 p-5">
      <svg
        className="h-full w-full overflow-visible"
        role="img"
        aria-label="Fitness, fatigue, form, and activity load chart"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredFreshnessIndex(null)}
        onMouseMove={handleFreshnessMouseMove}
      >
        <rect
          fill="transparent"
          height={chartHeight}
          width={chartWidth}
          x="0"
          y="0"
        />
        <line
          x1="0"
          x2={chartWidth}
          y1={getFormZeroY(maxFreshnessValue)}
          y2={getFormZeroY(maxFreshnessValue)}
          stroke="rgba(255,255,255,0.12)"
          strokeDasharray="8 8"
        />
        <ActivityDots
          points={points}
        />
        <FreshnessLine
          points={points}
          maxValue={maxFreshnessValue}
          metric="fatigue"
          color="rgba(181,181,181,0.72)"
        />
        <FreshnessLine
          points={points}
          maxValue={maxFreshnessValue}
          metric="fitness"
          color="var(--orange)"
        />
        <FreshnessLine
          points={points}
          maxValue={maxFreshnessValue}
          metric="form"
          color="var(--blue)"
        />
        {hoveredFreshnessPoint && hoveredFreshnessIndex != null ? (
          <FreshnessHoverOverlay
            count={points.length}
            index={hoveredFreshnessIndex}
            maxValue={maxFreshnessValue}
            point={hoveredFreshnessPoint}
          />
        ) : null}
      </svg>
    </div>

    <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-[0.14em] text-app-muted">
      <ChartLegend color="bg-app-orange" label="Fitness" />
      <ChartLegend color="bg-app-secondary" label="Fatigue" />
      <ChartLegend color="bg-app-blue" label="Form" />
      <ChartLegend color="bg-white/20" label="Daily load" />
    </div>
  </section>
  );
}
