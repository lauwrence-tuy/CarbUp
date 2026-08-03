"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Flame,
  Gauge,
  LineChart,
  PieChart,
  Settings,
  Timer,
  TrendingUp
} from "lucide-react";
import { MetricCard } from "./metric-card";
import { FloatingActionButton } from "./floating-action-button";

type TrendPoint = {
  label: string;
  calories: number;
  workouts: number;
  durationMinutes: number;
  distanceMiles: number;
  load: number;
};

type SportTrend = {
  type: string;
  calories: number;
  workouts: number;
  durationMinutes: number;
};

type TrendActivity = {
  stravaActivityId: string;
  name: string;
  type: string;
  dateKey: string;
  calories: number;
  durationMinutes: number;
  distanceMiles: number;
  load: number;
};

type FitnessFreshnessPoint = {
  dateKey: string;
  label: string;
  load: number;
  activities: Array<{
    stravaActivityId: string;
    name: string;
    type: string;
    load: number;
  }>;
  fitness: number;
  fatigue: number;
  form: number;
};

type Insight = {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "orange" | "blue" | "purple";
};

type TrendsPageProps = {
  isConnected: boolean;
  trendActivities: TrendActivity[];
  fitnessFreshnessPoints: FitnessFreshnessPoint[];
};

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${Math.round(minutes)}m`;
}

function formatCompactCalories(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return String(value);
}

const toneClasses = {
  green: "bg-app-green text-black",
  orange: "bg-app-orange text-white",
  blue: "bg-app-blue text-black",
  purple: "bg-app-purple text-white"
};

const timeframeOptions = [
  { label: "Last 3 months", days: 90 },
  { label: "Last 6 months", days: 183 },
  { label: "Last yr", days: 365 },
  { label: "Last 2 yrs", days: 730 },
  { label: "All-time", days: null },
];

const chartWidth = 900;
const chartHeight = 420;
const plotTop = 24;
const plotBottom = 360;
const plotHeight = plotBottom - plotTop;
const hoverTooltipY = -84;

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function getRangeStartDateKey(latestDateKey: string | undefined, days: number | null) {
  if (!latestDateKey || days == null) {
    return null;
  }

  const date = parseDateKey(latestDateKey);
  date.setDate(date.getDate() - days + 1);

  return formatDateKey(date);
}

function formatBucketLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function createEmptyTrendPoint(label: string): TrendPoint {
  return {
    label,
    calories: 0,
    workouts: 0,
    durationMinutes: 0,
    distanceMiles: 0,
    load: 0
  };
}

function addActivityToTrendPoint(point: TrendPoint, activity: TrendActivity) {
  point.calories += activity.calories;
  point.workouts += 1;
  point.durationMinutes += activity.durationMinutes;
  point.distanceMiles += activity.distanceMiles;
  point.load += activity.load;
}

function getBucketRange({
  activities,
  fallbackEndDateKey,
  rangeStart
}: {
  activities: TrendActivity[];
  fallbackEndDateKey?: string;
  rangeStart: string | null;
}) {
  const sortedDateKeys = activities.map((activity) => activity.dateKey).sort();
  const startDateKey = rangeStart ?? sortedDateKeys[0] ?? fallbackEndDateKey;
  const endDateKey =
    sortedDateKeys[sortedDateKeys.length - 1] ?? fallbackEndDateKey ?? startDateKey;

  return {
    start: parseDateKey(startDateKey ?? formatDateKey(new Date())),
    end: parseDateKey(endDateKey ?? formatDateKey(new Date()))
  };
}

function buildRangeBuckets({
  activities,
  count,
  fallbackEndDateKey,
  rangeStart
}: {
  activities: TrendActivity[];
  count: number;
  fallbackEndDateKey?: string;
  rangeStart: string | null;
}) {
  const { start, end } = getBucketRange({
    activities,
    fallbackEndDateKey,
    rangeStart
  });
  const totalDays =
    Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000)) + 1;
  const bucketSizeDays = Math.max(1, Math.ceil(totalDays / count));
  const buckets = Array.from({ length: count }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(start.getDate() + index * bucketSizeDays);

    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + bucketSizeDays);

    return {
      start: bucketStart,
      end: bucketEnd,
      point: createEmptyTrendPoint(formatBucketLabel(bucketStart))
    };
  });

  activities.forEach((activity) => {
    const activityDate = parseDateKey(activity.dateKey);
    const match = buckets.find(
      (bucket, index) =>
        activityDate >= bucket.start &&
        (activityDate < bucket.end || index === buckets.length - 1)
    );

    if (match) {
      addActivityToTrendPoint(match.point, activity);
    }
  });

  return buckets.map((bucket) => bucket.point);
}

function buildTrailingWeeklyBuckets({
  activities,
  fallbackEndDateKey
}: {
  activities: TrendActivity[];
  fallbackEndDateKey?: string;
}) {
  const sortedDateKeys = activities.map((activity) => activity.dateKey).sort();
  const endDate = parseDateKey(
    sortedDateKeys[sortedDateKeys.length - 1] ??
      fallbackEndDateKey ??
      formatDateKey(new Date())
  );
  const rangeStart = new Date(endDate);
  rangeStart.setDate(endDate.getDate() - 27);

  const buckets = Array.from({ length: 4 }, (_, index) => {
    const start = new Date(rangeStart);
    start.setDate(rangeStart.getDate() + index * 7);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return {
      start,
      end,
      point: createEmptyTrendPoint(formatBucketLabel(start))
    };
  });

  activities.forEach((activity) => {
    const activityDate = parseDateKey(activity.dateKey);
    const match = buckets.find(
      (bucket, index) =>
        activityDate >= bucket.start &&
        (activityDate < bucket.end || index === buckets.length - 1)
    );

    if (match) {
      addActivityToTrendPoint(match.point, activity);
    }
  });

  return buckets.map((bucket) => bucket.point);
}

function buildSportTrends(activities: TrendActivity[]) {
  const totals = activities.reduce<Record<string, SportTrend>>(
    (accumulator, activity) => {
      const current = accumulator[activity.type] ?? {
        type: activity.type,
        calories: 0,
        workouts: 0,
        durationMinutes: 0
      };

      current.calories += activity.calories;
      current.workouts += 1;
      current.durationMinutes += activity.durationMinutes;
      accumulator[activity.type] = current;

      return accumulator;
    },
    {}
  );

  return Object.values(totals)
    .sort((first, second) => second.calories - first.calories)
    .slice(0, 5);
}

function buildSummary(activities: TrendActivity[]) {
  const totalCalories = activities.reduce(
    (total, activity) => total + activity.calories,
    0
  );
  const totalDurationMinutes = activities.reduce(
    (total, activity) => total + activity.durationMinutes,
    0
  );
  const activeDays = new Set(activities.map((activity) => activity.dateKey)).size;

  return {
    totalCalories,
    totalWorkouts: activities.length,
    activeDays,
    totalDurationMinutes,
    averageCaloriesPerWorkout:
      activities.length > 0 ? Math.round(totalCalories / activities.length) : 0,
    averageCaloriesPerHour:
      totalDurationMinutes > 0
        ? Math.round(totalCalories / (totalDurationMinutes / 60))
        : 0
  };
}

function buildInsights(weeklyPoints: TrendPoint[], activeDays: number): Insight[] {
  const currentWeek = weeklyPoints[weeklyPoints.length - 1];
  const previousWeek = weeklyPoints[weeklyPoints.length - 2];
  const calorieDelta = currentWeek.calories - previousWeek.calories;
  const calorieDeltaPercent =
    previousWeek.calories > 0
      ? Math.round((calorieDelta / previousWeek.calories) * 100)
      : currentWeek.calories > 0
        ? 100
        : 0;
  const consistencyLabel =
    activeDays >= 20 ? "High" : activeDays >= 12 ? "Steady" : activeDays > 0 ? "Light" : "Ready";
  const loadPeak = weeklyPoints.reduce(
    (peak, point) => (point.load > peak.load ? point : peak),
    weeklyPoints[0]
  );

  return [
    {
      label: "Period shift",
      value: calorieDeltaPercent > 0 ? `+${calorieDeltaPercent}%` : `${calorieDeltaPercent}%`,
      detail:
        previousWeek.calories > 0
          ? `${Math.abs(calorieDelta).toLocaleString()} kcal ${
              calorieDelta >= 0 ? "above" : "below"
            } prior bucket`
          : "building a baseline from synced workouts",
      tone: calorieDelta >= 0 ? "green" : "orange"
    },
    {
      label: "Consistency",
      value: consistencyLabel,
      detail: `${activeDays} active days in this range`,
      tone: "blue"
    },
    {
      label: "Peak load",
      value: loadPeak.label,
      detail: `${loadPeak.load} load from ${loadPeak.workouts} workouts`,
      tone: "purple"
    }
  ];
}

export function TrendsPage({
  isConnected,
  trendActivities,
  fitnessFreshnessPoints
}: TrendsPageProps) {
  const selectedTimeframe = "Last 3 months";
  const [hoveredFreshnessIndex, setHoveredFreshnessIndex] = useState<
    number | null
  >(null);
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
  const latestFitnessFreshness =
    freshnessChartPoints[freshnessChartPoints.length - 1];
  const previousFitnessFreshness =
    freshnessChartPoints[freshnessChartPoints.length - 8];
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
    ...freshnessChartPoints.flatMap((point) => [
      point.fitness,
      point.fatigue,
      Math.abs(point.form)
    ]),
    1
  );
  const hoveredFreshnessPoint =
    hoveredFreshnessIndex == null
      ? null
      : freshnessChartPoints[hoveredFreshnessIndex];

  function handleFreshnessMouseMove(event: MouseEvent<SVGSVGElement>) {
    if (freshnessChartPoints.length === 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * chartWidth;
    const index = Math.max(
      0,
      Math.min(
        freshnessChartPoints.length - 1,
        Math.round((x / chartWidth) * (freshnessChartPoints.length - 1))
      )
    );

    setHoveredFreshnessIndex(index);
  }

  return (
    <main className="min-h-screen bg-app-bg text-white">
      <div className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-24 pt-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-6 rounded-[28px] border border-white/[0.04] bg-app-card/72 px-5 py-4 shadow-card backdrop-blur lg:px-6">
          <Link
            href={isConnected ? "/dashboard" : "/"}
            className="flex items-center gap-3"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-app-card text-app-green shadow-card">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <p className="text-lg font-bold tracking-[-0.04em] sm:text-xl">
              Carb<span className="text-app-green">Up</span>
            </p>
          </Link>

          <nav
            className="hidden items-center gap-2 rounded-full bg-black/35 p-1 lg:flex"
            aria-label="Trends navigation"
          >
            {[
                {
                  label: "Dashboard",
                  href: isConnected ? "/dashboard" : "/",
                  active: false
                },
                {
                  label: "Nutrition",
                  href: isConnected ? "/nutrition" : "/",
                  active: false
                },
                {
                  label: "Workouts",
                  href: isConnected ? "/workouts" : "/",
                  active: false
                },
                {
                  label: "Trends",
                  href: isConnected ? "/trends" : "/",
                  active: true
                }
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  item.active
                    ? "bg-white text-black"
                    : "text-app-secondary hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {!isConnected ? (
              <Link
                href="/api/strava/auth"
                className="hidden min-h-11 items-center gap-2 rounded-full bg-app-green px-5 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5 sm:inline-flex"
              >
                Connect Strava
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
            <Link
              href="/settings"
              className="flex size-12 items-center justify-center rounded-full bg-app-card text-app-blue transition hover:bg-app-hover"
              aria-label="Settings"
            >
              <Settings className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </header>

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
                points={freshnessChartPoints}
              />
              <FreshnessLine
                points={freshnessChartPoints}
                maxValue={maxFreshnessValue}
                metric="fatigue"
                color="rgba(181,181,181,0.72)"
              />
              <FreshnessLine
                points={freshnessChartPoints}
                maxValue={maxFreshnessValue}
                metric="fitness"
                color="#f97316"
              />
              <FreshnessLine
                points={freshnessChartPoints}
                maxValue={maxFreshnessValue}
                metric="form"
                color="#60a5fa"
              />
              {hoveredFreshnessPoint && hoveredFreshnessIndex != null ? (
                <FreshnessHoverOverlay
                  count={freshnessChartPoints.length}
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

function FreshnessMetric({
  label,
  value,
  delta,
  color
}: {
  label: string;
  value: number;
  delta: number | null;
  color: string;
}) {
  return (
    <div className="rounded-[22px] bg-black/24 p-5">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-muted">
        {label}
      </p>
      <div className="mt-3 flex items-end gap-2">
        <p className={`text-5xl font-bold tracking-[-0.04em] ${color}`}>
          {value}
        </p>
        {delta == null ? null : (
          <span
            className={`pb-2 text-sm font-bold ${
              delta >= 0 ? "text-app-green" : "text-app-red"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

function getChartX(index: number, count: number) {
  if (count <= 1) {
    return 0;
  }

  return (index / (count - 1)) * chartWidth;
}

function formatHoverDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);

  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
    date: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric"
    }).format(date)
  };
}

function FreshnessHoverOverlay({
  point,
  index,
  count
}: {
  point: FitnessFreshnessPoint;
  index: number;
  count: number;
  maxValue: number;
}) {
  const x = getChartX(index, count);
  const width = 276;
  const tooltipX = Math.max(8, Math.min(chartWidth - width - 8, x - width / 2));
  const date = formatHoverDate(point.dateKey);

  return (
    <g className="pointer-events-none">
      <line
        x1={x}
        x2={x}
        y1="0"
        y2={chartHeight - 8}
        stroke="rgba(255,255,255,0.46)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        fill="rgba(0,0,0,0.86)"
        height="58"
        rx="12"
        stroke="rgba(255,255,255,0.10)"
        width={width}
        x={tooltipX}
        y={hoverTooltipY}
      />
      <text
        fill="#b5b5b5"
        fontSize="10"
        fontWeight="800"
        textAnchor="middle"
        x={tooltipX + 34}
        y={hoverTooltipY + 20}
      >
        {date.weekday}
      </text>
      <text
        fill="#ffffff"
        fontSize="12"
        fontWeight="900"
        textAnchor="middle"
        x={tooltipX + 34}
        y={hoverTooltipY + 37}
      >
        {date.date}
      </text>
      <HoverValue
        color="#f97316"
        label="Fitness"
        value={point.fitness}
        x={tooltipX + 98}
        y={hoverTooltipY}
      />
      <HoverValue
        color="#b5b5b5"
        label="Fatigue"
        value={point.fatigue}
        x={tooltipX + 166}
        y={hoverTooltipY}
      />
      <HoverValue
        color="#60a5fa"
        label="Form"
        value={point.form}
        x={tooltipX + 230}
        y={hoverTooltipY}
      />
    </g>
  );
}

function HoverValue({
  label,
  value,
  color,
  x,
  y
}: {
  label: string;
  value: number;
  color: string;
  x: number;
  y: number;
}) {
  return (
    <>
      <text
        fill="#b5b5b5"
        fontSize="10"
        fontWeight="800"
        textAnchor="middle"
        x={x}
        y={y + 20}
      >
        {label}
      </text>
      <text
        fill={color}
        fontSize="13"
        fontWeight="900"
        textAnchor="middle"
        x={x}
        y={y + 38}
      >
        {value}
      </text>
    </>
  );
}

function getLinePoints({
  points,
  metric,
  maxValue
}: {
  points: FitnessFreshnessPoint[];
  metric: "fitness" | "fatigue" | "form";
  maxValue: number;
}) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const x = getChartX(index, points.length);
      const rawValue =
        metric === "form" ? point.form + maxValue * 0.42 : point[metric];
      const domain = metric === "form" ? maxValue * 1.42 : maxValue;
      const y = plotBottom - (Math.max(rawValue, 0) / domain) * plotHeight;

      return `${x.toFixed(1)},${Math.max(plotTop, Math.min(plotBottom, y)).toFixed(1)}`;
    })
    .join(" ");
}

function getFormZeroY(maxValue: number) {
  return plotBottom - ((maxValue * 0.42) / (maxValue * 1.42)) * plotHeight;
}

function FreshnessLine({
  points,
  metric,
  maxValue,
  color
}: {
  points: FitnessFreshnessPoint[];
  metric: "fitness" | "fatigue" | "form";
  maxValue: number;
  color: string;
}) {
  return (
    <polyline
      fill="none"
      points={getLinePoints({ points, metric, maxValue })}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="4"
      vectorEffect="non-scaling-stroke"
    />
  );
}

function ActivityDots({ points }: { points: FitnessFreshnessPoint[] }) {
  if (points.length === 0) {
    return null;
  }

  const dayWidth = chartWidth / points.length;

  return (
    <g>
      {points.flatMap((point, dayIndex) =>
        point.activities.map((activity, activityIndex) => {
          const x = dayIndex * dayWidth + dayWidth / 2;
          const y = chartHeight - 22 - activityIndex * 12;
          const dotY = Math.max(chartHeight - 70, y);

          return (
            <a
              key={`${point.dateKey}-${activity.stravaActivityId}-${activityIndex}`}
              className="group"
              href={`https://www.strava.com/activities/${activity.stravaActivityId}`}
              target="_blank"
              rel="noreferrer"
            >
              <title>
                {activity.name} - {activity.type} - load {activity.load}
              </title>
              <g
                className="pointer-events-none opacity-0 transition group-hover:opacity-100 group-focus:opacity-100"
                transform={`translate(${Math.max(72, Math.min(chartWidth - 72, x))} ${Math.max(34, dotY - 34)})`}
              >
                <rect
                  fill="rgba(0,0,0,0.86)"
                  height="42"
                  rx="10"
                  stroke="rgba(255,255,255,0.10)"
                  width="144"
                  x="-72"
                  y="-42"
                />
                <text
                  fill="#b5b5b5"
                  fontSize="9"
                  fontWeight="700"
                  textAnchor="middle"
                  x="0"
                  y="-25"
                >
                  {point.label}
                </text>
                <text
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="middle"
                  x="0"
                  y="-11"
                >
                  {truncateActivityName(activity.name)}
                </text>
              </g>
              <circle
                cx={x}
                cy={dotY}
                fill="rgba(255,255,255,0.16)"
                r={4}
                className="transition hover:fill-app-green"
              />
            </a>
          );
        })
      )}
    </g>
  );
}

function truncateActivityName(name: string) {
  if (name.length <= 22) {
    return name;
  }

  return `${name.slice(0, 21)}...`;
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
