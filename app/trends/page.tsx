import { TrendsPage } from "@/components/trends/trends-page";
import { StravaLoginRequiredPage } from "@/components/strava/strava-login-required-page";
import {
  getActivityCalories,
  getActivityWeightKg
} from "@/lib/activity-calories";
import { getLocalDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { buildFitnessFreshnessSeries } from "@/lib/training-load";
import { calculateActivityLoad, metersToMiles } from "@/lib/workout-metrics";

export const dynamic = "force-dynamic";

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

export default async function TrendsRoute() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          units: true,
          weight: true,
          activities: {
            orderBy: { startDate: "desc" },
            take: 3000,
            select: {
              stravaActivityId: true,
              name: true,
              type: true,
              startDate: true,
              distance: true,
              movingTime: true,
              calories: true,
              sufferScore: true
            }
          }
        }
      })
    : null;

  if (!user) {
    return <StravaLoginRequiredPage pageName="Trends" />;
  }

  const activities = (user?.activities ?? []) as ActivityMetric[];
  const referenceDate = new Date();
  const fitnessFreshnessPoints = buildFitnessFreshnessSeries(
    activities,
    referenceDate
  );
  const weightKg = getActivityWeightKg({
    units: user.units,
    weight: user.weight
  });
  const trendActivities = activities.map((activity) => ({
    stravaActivityId: activity.stravaActivityId,
    name: activity.name,
    type: activity.type,
    dateKey: getLocalDateKey(activity.startDate),
    calories: getActivityCalories({
      calories: activity.calories,
      movingTime: activity.movingTime,
      type: activity.type,
      weightKg
    }),
    durationMinutes: Math.round((activity.movingTime ?? 0) / 60),
    distanceMiles: metersToMiles(activity.distance ?? 0),
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
