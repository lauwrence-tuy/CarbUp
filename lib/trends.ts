// Pure data shaping for the Trends page: bucketing activities by week and
// month, sport breakdowns, the summary numbers, and the generated insights.

export type TrendPoint = {
  label: string;
  calories: number;
  workouts: number;
  durationMinutes: number;
  distanceMiles: number;
  load: number;
};

export type SportTrend = {
  type: string;
  calories: number;
  workouts: number;
  durationMinutes: number;
};

export type TrendActivity = {
  stravaActivityId: string;
  name: string;
  type: string;
  dateKey: string;
  calories: number;
  durationMinutes: number;
  distanceMiles: number;
  load: number;
};

export type FitnessFreshnessPoint = {
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

export type Insight = {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "orange" | "blue" | "purple";
};

export type TrendsPageProps = {
  isConnected: boolean;
  trendActivities: TrendActivity[];
  fitnessFreshnessPoints: FitnessFreshnessPoint[];
};

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${Math.round(minutes)}m`;
}

export function formatCompactCalories(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return String(value);
}

export function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

export function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function getRangeStartDateKey(latestDateKey: string | undefined, days: number | null) {
  if (!latestDateKey || days == null) {
    return null;
  }

  const date = parseDateKey(latestDateKey);
  date.setDate(date.getDate() - days + 1);

  return formatDateKey(date);
}

export function formatBucketLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

export function createEmptyTrendPoint(label: string): TrendPoint {
  return {
    label,
    calories: 0,
    workouts: 0,
    durationMinutes: 0,
    distanceMiles: 0,
    load: 0
  };
}

export function addActivityToTrendPoint(point: TrendPoint, activity: TrendActivity) {
  point.calories += activity.calories;
  point.workouts += 1;
  point.durationMinutes += activity.durationMinutes;
  point.distanceMiles += activity.distanceMiles;
  point.load += activity.load;
}

export function getBucketRange({
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

export function buildRangeBuckets({
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

export function buildTrailingWeeklyBuckets({
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

export function buildSportTrends(activities: TrendActivity[]) {
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

export function buildSummary(activities: TrendActivity[]) {
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

export function buildInsights(weeklyPoints: TrendPoint[], activeDays: number): Insight[] {
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

export const timeframeOptions = [
  { label: "Last 3 months", days: 90 },
  { label: "Last 6 months", days: 183 },
  { label: "Last yr", days: 365 },
  { label: "Last 2 yrs", days: 730 },
  { label: "All-time", days: null },
];
