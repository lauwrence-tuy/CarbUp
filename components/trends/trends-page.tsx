"use client";

import { useMemo } from "react";
import { Column, Grid, Tag, Tile } from "@carbon/react";
import { PageShell, PageTitle, StatTile } from "@/components/carbon/page-shell";
import {
  type TrendsPageProps,
  buildInsights,
  buildRangeBuckets,
  buildSportTrends,
  buildSummary,
  buildTrailingWeeklyBuckets,
  formatCompactCalories,
  formatDuration,
  getRangeStartDateKey,
  timeframeOptions
} from "@/lib/trends";
import { FitnessFreshnessCard } from "./fitness-freshness-card";

// Insight tone → Carbon Tag colour.
const insightTagType = {
  green: "green",
  orange: "magenta",
  blue: "blue",
  purple: "purple"
} as const;



export function TrendsPage({
  isConnected,
  trendActivities,
  fitnessFreshnessPoints
}: TrendsPageProps) {
  const selectedTimeframe = "Last 3 months";
  const selectedTimeframeOption =
    timeframeOptions.find((option) => option.label === selectedTimeframe) ??
    timeframeOptions[0];
  const latestDateKey =
    fitnessFreshnessPoints[fitnessFreshnessPoints.length - 1]?.dateKey ??
    trendActivities[0]?.dateKey;
  const rangeStart = useMemo(
    () => getRangeStartDateKey(latestDateKey, selectedTimeframeOption.days),
    [latestDateKey, selectedTimeframeOption.days]
  );
  const filteredActivities = useMemo(
    () =>
      rangeStart
        ? trendActivities.filter((activity) => activity.dateKey >= rangeStart)
        : trendActivities,
    [rangeStart, trendActivities]
  );
  const freshnessChartPoints = useMemo(
    () =>
      rangeStart
        ? fitnessFreshnessPoints.filter((point) => point.dateKey >= rangeStart)
        : fitnessFreshnessPoints,
    [fitnessFreshnessPoints, rangeStart]
  );
  const weeklyPoints = useMemo(
    () =>
      buildRangeBuckets({
        activities: filteredActivities,
        count: 8,
        fallbackEndDateKey: latestDateKey,
        rangeStart
      }),
    [filteredActivities, latestDateKey, rangeStart]
  );
  const monthlyPoints = useMemo(
    () =>
      buildRangeBuckets({
        activities: filteredActivities,
        count: 6,
        fallbackEndDateKey: latestDateKey,
        rangeStart
      }),
    [filteredActivities, latestDateKey, rangeStart]
  );
  const efficiencyPoints = useMemo(
    () =>
      buildTrailingWeeklyBuckets({
        activities: filteredActivities,
        fallbackEndDateKey: latestDateKey
      }),
    [filteredActivities, latestDateKey]
  );
  const sportTrends = useMemo(
    () => buildSportTrends(filteredActivities),
    [filteredActivities]
  );
  const summary = useMemo(
    () => buildSummary(filteredActivities),
    [filteredActivities]
  );
  const insights = useMemo(
    () => buildInsights(weeklyPoints, summary.activeDays),
    [summary.activeDays, weeklyPoints]
  );
  const maxWeeklyCalories = Math.max(
    ...weeklyPoints.map((point) => point.calories),
    1
  );
  const maxMonthlyLoad = Math.max(...monthlyPoints.map((point) => point.load), 1);
  const sportTotalCalories = Math.max(
    sportTrends.reduce((total, sport) => total + sport.calories, 0),
    1
  );
  return (
    <PageShell isConnected={isConnected}>
      <PageTitle
        label="Trends"
        title="Training patterns"
        description="How calories, workout volume, sport mix and consistency are moving across your synced Strava history."
        actions={
          <span className="inline-flex min-h-10 items-center rounded-full bg-cds-layer px-4 text-sm font-bold text-cds-interactive">
            {selectedTimeframe}
          </span>
        }
      />

      <Grid className="mt-8">
        <Column sm={4} md={8} lg={16}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Calories"
              value={summary.totalCalories.toLocaleString("en-US")}
              helper={`${summary.averageCaloriesPerWorkout.toLocaleString("en-US")} kcal per workout`}
              accent
            />
            <StatTile
              label="Workouts"
              value={summary.totalWorkouts.toLocaleString("en-US")}
              helper={`${summary.activeDays} active days`}
            />
            <StatTile
              label="Moving time"
              value={formatDuration(summary.totalDurationMinutes)}
              helper={`${summary.averageCaloriesPerHour.toLocaleString("en-US")} kcal per hour`}
            />
            <StatTile
              label="Momentum"
              value={insights[0]?.value ?? "Ready"}
              helper={insights[0]?.detail ?? "sync workouts to calculate"}
            />
          </div>

          <FitnessFreshnessCard
            points={freshnessChartPoints}
            selectedTimeframe={selectedTimeframe}
          />

          {/* Paired rows keep the two columns the same height. */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Tile className="flex h-full flex-col !p-6">
              <CardHeading title="Weekly calories" helper={selectedTimeframe} />
              <div className="mt-8 flex min-h-40 flex-1 items-end gap-2 sm:gap-3">
                {weeklyPoints.map((point) => (
                  <div key={point.label} className="flex h-full flex-1 flex-col justify-end gap-3">
                    <div className="flex flex-1 items-end rounded-full bg-black/30 p-1">
                      <div
                        className="w-full rounded-full bg-cds-interactive"
                        style={{
                          height: `${Math.max(
                            point.calories > 0 ? (point.calories / maxWeeklyCalories) * 100 : 0,
                            point.calories > 0 ? 10 : 0
                          )}%`
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="cu-mono text-xs text-white">
                        {formatCompactCalories(point.calories)}
                      </p>
                      <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wide text-cds-text-helper">
                        {point.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Tile>

            <Tile className="h-full !p-6">
              <CardHeading title="Load by period" helper={`${selectedTimeframe}, load proxy`} />
              <div className="mt-6 space-y-4">
                {monthlyPoints.map((point) => (
                  <div
                    key={point.label}
                    className="grid grid-cols-[64px_minmax(0,1fr)_56px] items-center gap-4"
                  >
                    <span className="text-sm font-bold text-cds-text-secondary">{point.label}</span>
                    <div className="h-3 rounded-full bg-black/30">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{
                          width: `${Math.max(
                            point.load > 0 ? (point.load / maxMonthlyLoad) * 100 : 0,
                            point.load > 0 ? 5 : 0
                          )}%`
                        }}
                      />
                    </div>
                    <span className="cu-mono text-right text-sm text-white">{point.load}</span>
                  </div>
                ))}
              </div>
            </Tile>

            <Tile className="flex h-full flex-col !p-6">
              <CardHeading title="Efficiency" helper="Past 4 weeks, one week per bucket" />
              <div className="mt-6 grid flex-1 gap-3 sm:grid-cols-4">
                {efficiencyPoints.map((point) => (
                  <div
                    key={point.label}
                    className="flex flex-col justify-between gap-4 rounded-[22px] bg-black/30 p-4"
                  >
                    <div>
                      <p className="cu-label">{point.label}</p>
                      <p className="cu-number mt-3 !text-2xl">{point.workouts}</p>
                      <p className="cu-helper">workouts</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-cds-interactive">
                        {formatCompactCalories(point.calories)} kcal
                      </p>
                      <p className="cu-helper mt-1">
                        {formatDuration(point.durationMinutes)} · {point.distanceMiles.toFixed(1)} mi
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Tile>

            <Tile className="h-full !p-6">
              <CardHeading title="Insights" helper="Current readout" />
              <div className="mt-5 space-y-3">
                {insights.map((insight) => (
                  <div key={insight.label} className="rounded-[22px] bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-bold text-white">{insight.label}</span>
                      <Tag type={insightTagType[insight.tone]} size="sm" className="shrink-0">
                        {insight.value}
                      </Tag>
                    </div>
                    <p className="cu-helper mt-2">{insight.detail}</p>
                  </div>
                ))}
              </div>
            </Tile>

            <Tile className="!p-6 lg:col-span-2">
              <CardHeading title="Sport mix" helper="Calories by type" />
              <div className="mt-5 space-y-4">
                {sportTrends.length > 0 ? (
                  sportTrends.map((sport) => (
                    <div key={sport.type}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm font-bold text-white">{sport.type}</span>
                        <span className="cu-mono text-sm text-cds-text-secondary">
                          {sport.calories.toLocaleString("en-US")} kcal
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-black/30">
                        <div
                          className="h-full rounded-full bg-cds-interactive"
                          style={{
                            width: `${Math.max((sport.calories / sportTotalCalories) * 100, 4)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="cu-body-01 rounded-[22px] bg-black/30 p-4 text-cds-text-secondary">
                    Connect Strava to see your sport mix.
                  </p>
                )}
              </div>
            </Tile>
          </div>
        </Column>
      </Grid>
    </PageShell>
  );
}

function CardHeading({ title, helper }: { title: string; helper: string }) {
  return (
    <div>
      <h2 className="cu-heading-02">{title}</h2>
      <p className="cu-helper mt-1">{helper}</p>
    </div>
  );
}
