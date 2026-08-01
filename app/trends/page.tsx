import { TrendsPage } from "@/components/dashboard/trends-page";
import { APP_TIMEZONE, getLocalDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { redirect } from "next/navigation";

type ActivityMetric = {
  stravaActivityId: string;
  name: string;
  type: string;
  startDate: Date;
  distance: number | null;
  movingTime: number | null;
  calories: number | null;
  sufferScore: number | null;
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

function calculateActivityLoad(activity: {
  movingTime: number | null;
  calories: number | null;
  sufferScore?: number | null;
}) {
  if (typeof activity.sufferScore === "number") {
    return Math.round(activity.sufferScore);
  }

  const durationLoad = (activity.movingTime ?? 0) / 90;
  const calorieLoad = (activity.calories ?? 0) / 18;

  return Math.round(durationLoad + calorieLoad);
}

function startOfLocalDay(date: Date) {
  const key = getLocalDateKey(date);

  return new Date(`${key}T12:00:00`);
}

function formatChartLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric"
  }).format(date);
}

function buildFitnessFreshnessPoints(
  activities: ActivityMetric[],
  referenceDate: Date
) {
  const earliestActivity = activities.reduce<ActivityMetric | null>(
    (earliest, activity) =>
      !earliest || activity.startDate < earliest.startDate ? activity : earliest,
    null
  );
  const rangeStart = earliestActivity
    ? startOfLocalDay(earliestActivity.startDate)
    : startOfLocalDay(referenceDate);

  if (!earliestActivity) {
    rangeStart.setDate(rangeStart.getDate() - 89);
  }

  const loadByDate = activities.reduce<Record<string, number>>(
    (totals, activity) => {
      const activityDate = startOfLocalDay(activity.startDate);

      if (activityDate < rangeStart) {
        return totals;
      }

      const key = getLocalDateKey(activity.startDate);
      totals[key] = (totals[key] ?? 0) + calculateActivityLoad(activity);

      return totals;
    },
    {}
  );
  const activitiesByDate = activities.reduce<
    Record<
      string,
      Array<{
        stravaActivityId: string;
        name: string;
        type: string;
        load: number;
      }>
    >
  >((totals, activity) => {
    const activityDate = startOfLocalDay(activity.startDate);

    if (activityDate < rangeStart) {
      return totals;
    }

    const key = getLocalDateKey(activity.startDate);
    const load = calculateActivityLoad(activity);
    totals[key] = [
      ...(totals[key] ?? []),
      {
        stravaActivityId: activity.stravaActivityId,
        name: activity.name,
        type: activity.type,
        load
      }
    ];

    return totals;
  }, {});
  const points: FitnessFreshnessPoint[] = [];
  let fitness = 0;
  let fatigue = 0;
  const rangeEnd = startOfLocalDay(referenceDate);
  const dayCount =
    Math.max(
      0,
      Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000)
    ) + 1;

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const date = new Date(rangeStart);
    date.setDate(rangeStart.getDate() + dayIndex);

    const dateKey = getLocalDateKey(date);
    const load = loadByDate[dateKey] ?? 0;

    fitness += (load - fitness) / 42;
    fatigue += (load - fatigue) / 7;

    points.push({
      dateKey,
      label: formatChartLabel(date),
      load,
      activities: activitiesByDate[dateKey] ?? [],
      fitness: Math.round(fitness),
      fatigue: Math.round(fatigue),
      form: Math.round(fitness - fatigue)
    });
  }

  return points;
}

export default async function TrendsRoute() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: {
          activities: {
            orderBy: { startDate: "desc" },
            take: 3000
          }
        }
      })
    : null;

  if (!user) {
    redirect("/");
  }

  const activities = (user?.activities ?? []) as ActivityMetric[];
  const referenceDate = new Date();
  const fitnessFreshnessPoints = buildFitnessFreshnessPoints(
    activities,
    referenceDate
  );
  const trendActivities = activities.map((activity) => ({
    stravaActivityId: activity.stravaActivityId,
    name: activity.name,
    type: activity.type,
    dateKey: getLocalDateKey(activity.startDate),
    calories: Math.round(activity.calories ?? 0),
    durationMinutes: Math.round((activity.movingTime ?? 0) / 60),
    distanceMiles: (activity.distance ?? 0) / 1609.344,
    load: calculateActivityLoad(activity)
  }));

  return (
    <TrendsPage
      isConnected={Boolean(user)}
      trendActivities={trendActivities}
      fitnessFreshnessPoints={fitnessFreshnessPoints}
    />
  );
}
