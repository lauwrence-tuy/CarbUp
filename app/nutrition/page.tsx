import { NutritionPage } from "@/components/dashboard/nutrition-page";
import { getLocalDateKey } from "@/lib/date";
import { groupFoodLogsByDate, savedMealRowToRecord } from "@/lib/nutrition-db";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { redirect } from "next/navigation";

type ActivityRow = {
  startDate: Date;
  calories: number | null;
};

type FoodLogRow = Parameters<typeof groupFoodLogsByDate>[0][number];
type SavedMealRow = Parameters<typeof savedMealRowToRecord>[0];

export default async function NutritionRoute() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: {
          activities: {
            orderBy: { startDate: "desc" },
            take: 30
          },
          foodLogs: {
            orderBy: { createdAt: "asc" }
          },
          savedMeals: {
            orderBy: { createdAt: "desc" }
          }
        }
      })
    : null;

  if (!user) {
    redirect("/");
  }

  const activities = (user?.activities ?? []) as ActivityRow[];
  const foodLogs = (user?.foodLogs ?? []) as FoodLogRow[];
  const savedMeals = (user?.savedMeals ?? []) as SavedMealRow[];
  const activityCaloriesByDate =
    activities.reduce<Record<string, number>>((totals, activity) => {
      const key = getLocalDateKey(activity.startDate);

      return {
        ...totals,
        [key]: (totals[key] ?? 0) + Math.round(activity.calories ?? 0)
      };
    }, {});

  return (
    <NutritionPage
      baseCalories={user?.maintenanceCalories ?? 0}
      activityCaloriesByDate={activityCaloriesByDate}
      initialLogsByDate={groupFoodLogsByDate(foodLogs)}
      initialSavedMeals={savedMeals.map(savedMealRowToRecord)}
      goalAdjustment={user?.maintenanceCalories == null ? 0 : user.goalAdjustment}
      isConnected={Boolean(user)}
    />
  );
}
