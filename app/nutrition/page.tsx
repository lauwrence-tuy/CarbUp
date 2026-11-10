import { NutritionPage } from "@/components/nutrition/nutrition-page";
import { StravaLoginRequiredPage } from "@/components/strava/strava-login-required-page";
import { getLocalDateKey } from "@/lib/date";
import {
  frequentFoodsFromLogs,
  projectFood,
  recentFoodsFromLogs
} from "@/lib/food-catalog";
import { groupFoodLogsByDate, savedMealRowToRecord } from "@/lib/nutrition-db";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type ActivityRow = {
  startDate: Date;
  calories: number | null;
};

type FoodLogRow = Parameters<typeof groupFoodLogsByDate>[0][number];
type SavedMealRow = Parameters<typeof savedMealRowToRecord>[0];

/**
 * How far back Nutrition loads the diary (and the activities that set each
 * day's target). Week paging stops here, and Recent/Frequent come from it.
 */
const NUTRITION_HISTORY_DAYS = 84;

export default async function NutritionRoute() {
  const userId = await getCurrentUserId();
  const historyStart = new Date(Date.now() - (NUTRITION_HISTORY_DAYS - 1) * 24 * 60 * 60 * 1000);
  const historyStartKey = getLocalDateKey(historyStart);
  // A day of slack so activities near midnight in the app's time zone count.
  const activitiesFrom = new Date(historyStart.getTime() - 24 * 60 * 60 * 1000);
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          maintenanceCalories: true,
          goalAdjustment: true,
          activities: {
            where: { startDate: { gte: activitiesFrom } },
            orderBy: { startDate: "desc" },
            select: { startDate: true, calories: true }
          },
          foodLogs: {
            where: { dateKey: { gte: historyStartKey } },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              dateKey: true,
              foodId: true,
              name: true,
              brand: true,
              serving: true,
              baseGrams: true,
              grams: true,
              calories: true,
              protein: true,
              carbs: true,
              fat: true,
              itemsJson: true,
              meal: true,
              source: true
            }
          },
          savedMeals: {
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true, ingredientsJson: true }
          },
          customFoods: {
            orderBy: { updatedAt: "desc" },
            include: { servings: true }
          }
        }
      })
    : null;
  // Every day with entries (dates only), so the one-time localStorage
  // migration never re-uploads a day that is older than the loaded window.
  const loggedDateKeys = userId
    ? (
        await prisma.foodLog.findMany({
          where: { userId },
          distinct: ["dateKey"],
          select: { dateKey: true }
        })
      ).map((row) => row.dateKey)
    : [];

  if (!user) {
    return <StravaLoginRequiredPage pageName="Nutrition" />;
  }

  const activities = (user?.activities ?? []) as ActivityRow[];
  const foodLogs = (user?.foodLogs ?? []) as FoodLogRow[];
  const savedMeals = (user?.savedMeals ?? []) as SavedMealRow[];
  const activityCaloriesByDate =
    activities.reduce<Record<string, number>>((totals, activity) => {
      const key = getLocalDateKey(activity.startDate);

      totals[key] = (totals[key] ?? 0) + Math.round(activity.calories ?? 0);

      return totals;
    }, {});

  return (
    <NutritionPage
      baseCalories={user?.maintenanceCalories ?? 0}
      activityCaloriesByDate={activityCaloriesByDate}
      initialLogsByDate={groupFoodLogsByDate(foodLogs)}
      initialSavedMeals={savedMeals.map(savedMealRowToRecord)}
      initialRecentFoods={recentFoodsFromLogs(foodLogs)}
      initialFrequentFoods={frequentFoodsFromLogs(foodLogs)}
      initialCustomFoods={(user.customFoods ?? []).map(projectFood)}
      goalAdjustment={user?.maintenanceCalories == null ? 0 : user.goalAdjustment}
      historyStartKey={historyStartKey}
      loggedDateKeys={loggedDateKeys}
      isConnected={Boolean(user)}
    />
  );
}
