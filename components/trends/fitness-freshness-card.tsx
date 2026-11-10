"use client";

import type { MouseEvent } from "react";
import { useState } from "react";
import { Tile } from "@carbon/react";
import type { FitnessFreshnessPoint } from "@/lib/trends";
import {
  ActivityDots,
  ChartLegend,
  chartHeight,
  chartWidth,
  FreshnessHoverLine,
  FreshnessHoverTooltip,
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

  function handleFreshnessMouseMove(event: MouseEvent<HTMLDivElement>) {
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
  <Tile className="mt-4 !p-6">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div>
        <h2 className="cu-heading-02">Fitness &amp; Freshness</h2>
        <p className="cu-helper mt-1">
          {selectedTimeframe}. Strava Relative Effort when available, with local load fallback
        </p>
      </div>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <FreshnessMetric
        label="Fitness"
        value={latestFitnessFreshness?.fitness ?? 0}
        delta={fitnessDelta}
        color="text-cds-interactive"
      />
      <FreshnessMetric
        label="Fatigue"
        value={latestFitnessFreshness?.fatigue ?? 0}
        delta={fatigueDelta}
        color="text-cds-text-secondary"
      />
      <FreshnessMetric
        label="Form"
        value={latestFitnessFreshness?.form ?? 0}
        delta={formDelta}
        color="text-[color:var(--blue)]"
      />
    </div>

    <div className="mt-6 h-[540px] rounded-[22px] bg-black/30 p-5">
      {/* Lines live in a stretched SVG; tooltip and dots are HTML on top so they keep their shape. */}
      <div
        className="relative h-full w-full"
        onMouseLeave={() => setHoveredFreshnessIndex(null)}
        onMouseMove={handleFreshnessMouseMove}
      >
      <svg
        className="h-full w-full overflow-visible"
        role="img"
        aria-label="Fitness, fatigue, form, and activity load chart"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="none"
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
          color="var(--cds-interactive)"
        />
        <FreshnessLine
          points={points}
          maxValue={maxFreshnessValue}
          metric="form"
          color="var(--blue)"
        />
        {hoveredFreshnessIndex != null ? (
          <FreshnessHoverLine count={points.length} index={hoveredFreshnessIndex} />
        ) : null}
      </svg>
      <ActivityDots points={points} />
      {hoveredFreshnessPoint && hoveredFreshnessIndex != null ? (
        <FreshnessHoverTooltip
          count={points.length}
          index={hoveredFreshnessIndex}
          point={hoveredFreshnessPoint}
        />
      ) : null}
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-[0.14em] text-cds-text-helper">
      <ChartLegend color="bg-cds-interactive" label="Fitness" />
      <ChartLegend color="bg-cds-text-secondary" label="Fatigue" />
      <ChartLegend color="bg-[color:var(--blue)]" label="Form" />
      <ChartLegend color="bg-white/20" label="Daily load" />
    </div>
  </Tile>
  );
}
