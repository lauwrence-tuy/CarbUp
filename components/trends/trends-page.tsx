"use client";

import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Flame,
  Gauge,
  LineChart,
  PieChart,
  Timer,
  TrendingUp
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { AppHeader } from "@/components/app-header";
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

const toneClasses = {
  green: "bg-app-green text-black",
  orange: "bg-app-orange text-white",
  blue: "bg-app-blue text-black",
  purple: "bg-app-purple text-white"
};



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
    <main className="min-h-screen bg-app-bg text-white">
      <div className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-24 pt-6 sm:px-8 lg:px-10">
        <AppHeader isConnected={isConnected} active="Trends" />

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold leading-none text-white sm:text-5xl">
                Training patterns
              </h1>
              <p className="mt-3 max-w-2xl text-base text-app-secondary">
                See how calories, workout volume, sport mix, and consistency are
                moving across your synced Strava history.
              </p>
            </div>
            <span className="rounded-full border border-app-green/35 bg-black/35 px-5 py-3 text-sm font-bold text-app-green">
              Last 3 months
            </span>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Calories"
            value={summary.totalCalories.toLocaleString()}
            detail={`${summary.averageCaloriesPerWorkout.toLocaleString()} kcal per workout`}
            icon={Flame}
            tone="green"
          />
          <MetricCard
            label="Workouts"
            value={summary.totalWorkouts.toLocaleString()}
            detail={`${summary.activeDays} active days`}
            icon={CalendarDays}
            tone="blue"
          />
          <MetricCard
            label="Moving Time"
            value={formatDuration(summary.totalDurationMinutes)}
            detail={`${summary.averageCaloriesPerHour.toLocaleString()} kcal per hour`}
            icon={Timer}
            tone="purple"
          />
          <MetricCard
            label="Momentum"
            value={insights[0]?.value ?? "Ready"}
            detail={insights[0]?.detail ?? "sync workouts to calculate"}
            icon={TrendingUp}
            tone="orange"
          />
        </section>

        <FitnessFreshnessCard
          points={freshnessChartPoints}
          selectedTimeframe={selectedTimeframe}
        />

        <section className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
          <div className="space-y-5">
          <article className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-app-green text-black">
                  <BarChart3 className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                    Weekly calories
                  </h2>
                  <p className="mt-1 text-sm text-app-muted">
                    {selectedTimeframe}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex h-40 items-end gap-3">
              {weeklyPoints.map((point) => (
                <div
                  key={point.label}
                  className="flex h-full flex-1 flex-col justify-end gap-3"
                >
                  <div className="flex flex-1 items-end rounded-full bg-black/24 p-1">
                    <div
                      className="w-full rounded-full bg-app-green shadow-glow"
                      style={{
                        height: `${Math.max(
                          point.calories > 0
                            ? (point.calories / maxWeeklyCalories) * 100
                            : 0,
                          point.calories > 0 ? 10 : 0
                        )}%`
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-white">
                      {formatCompactCalories(point.calories)}
                    </p>
                    <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wide text-app-muted">
                      {point.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-app-purple text-white">
                <LineChart className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                  Monthly load
                </h2>
                <p className="mt-1 text-sm text-app-muted">
                  {selectedTimeframe} load proxy
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {monthlyPoints.map((point) => (
                <div
                  key={point.label}
                  className="grid grid-cols-[74px_minmax(0,1fr)_74px] items-center gap-4"
                >
                  <span className="text-sm font-bold text-app-secondary">
                    {point.label}
                  </span>
                  <div className="h-4 rounded-full bg-black/35">
                    <div
                      className="h-full rounded-full bg-app-purple"
                      style={{
                        width: `${Math.max(
                          point.load > 0 ? (point.load / maxMonthlyLoad) * 100 : 0,
                          point.load > 0 ? 5 : 0
                        )}%`
                      }}
                    />
                  </div>
                  <span className="text-right text-sm font-bold text-white">
                    {point.load}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-app-green text-black">
                <Gauge className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                  Efficiency
                </h2>
                <p className="mt-1 text-sm text-app-muted">
                  Past 4 weeks, one week per bucket
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {efficiencyPoints.map((point) => (
                <div key={point.label} className="rounded-[22px] bg-black/24 p-4">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-muted">
                    {point.label}
                  </p>
                  <p className="mt-3 text-2xl font-bold text-white">
                    {point.workouts}
                  </p>
                  <p className="mt-1 text-sm text-app-secondary">
                    workouts
                  </p>
                  <p className="mt-4 text-sm font-semibold text-app-green">
                    {formatCompactCalories(point.calories)} kcal
                  </p>
                  <p className="mt-1 text-xs font-semibold text-app-muted">
                    {formatDuration(point.durationMinutes)} -{" "}
                    {point.distanceMiles.toFixed(1)} mi
                  </p>
                </div>
              ))}
            </div>
          </article>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-app-blue text-black">
                  <Activity className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                    Insights
                  </h2>
                  <p className="mt-1 text-sm text-app-muted">
                    Current readout
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.label}
                    className="rounded-[22px] bg-black/24 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-bold text-white">
                        {insight.label}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${toneClasses[insight.tone]}`}
                      >
                        {insight.value}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-app-muted">
                      {insight.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-app-orange text-white">
                  <PieChart className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                    Sport mix
                  </h2>
                  <p className="mt-1 text-sm text-app-muted">
                    Calories by type
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {sportTrends.length > 0 ? (
                  sportTrends.map((sport) => (
                    <div key={sport.type}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm font-bold text-white">
                          {sport.type}
                        </span>
                        <span className="text-sm font-semibold text-app-muted">
                          {sport.calories.toLocaleString()} kcal
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-black/35">
                        <div
                          className="h-full rounded-full bg-app-orange"
                          style={{
                            width: `${Math.max(
                              (sport.calories / sportTotalCalories) * 100,
                              4
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[22px] bg-black/24 p-4 text-sm text-app-muted">
                    Connect Strava to see your sport mix.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
      {isConnected ? <FloatingActionButton href="/nutrition" /> : null}
    </main>
  );
}
