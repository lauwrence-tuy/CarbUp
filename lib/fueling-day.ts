import { getLocalDateKey } from "@/lib/date";
import { summarizeTraining, toWeightKg, type FuelingDayInput } from "@/lib/fueling";
import { prisma } from "@/lib/prisma";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * One day's fueling inputs for a user, read from the database: their weight,
 * that local day's activities and the food logged on it. Null when the user
 * doesn't exist.
 */
export async function loadFuelingDay(
  userId: string,
  dateKey: string,
  now = new Date()
): Promise<FuelingDayInput | null> {
  // Activities are stored in UTC; take a day either side, then keep the ones
  // that fall on this local day.
  const middayUtc = new Date(`${dateKey}T12:00:00Z`).getTime();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      weight: true,
      units: true,
      activities: {
        where: {
          startDate: {
            gte: new Date(middayUtc - 1.5 * MS_PER_DAY),
            lt: new Date(middayUtc + 1.5 * MS_PER_DAY)
          }
        },
        select: { startDate: true, movingTime: true, calories: true, sufferScore: true }
      }
    }
  });

  if (!user) {
    return null;
  }

  const eaten = await prisma.foodLog.aggregate({
    where: { userId, dateKey },
    _sum: { carbs: true, protein: true }
  });

  const training = summarizeTraining(
    user.activities.filter((activity) => getLocalDateKey(activity.startDate) === dateKey)
  );

  return {
    weightKg: toWeightKg(user.weight, user.units),
    ...training,
    carbsEaten: eaten._sum.carbs ?? 0,
    proteinEaten: eaten._sum.protein ?? 0,
    isToday: getLocalDateKey(now) === dateKey
  };
}
