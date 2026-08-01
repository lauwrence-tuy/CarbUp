import { createLocalNoonDate, formatDateKey } from "./day-spread-widget";

export type MealName = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

export type Food = {
  id: string;
  name: string;
  brand: string;
  serving: string;
  baseGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type FoodLogEntry = Food & {
  grams?: number;
  items?: FoodLogEntry[];
  logId: string;
  meal: MealName;
  source?: "food" | "meal" | "quick";
};

export type NutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const dailyLogsStorageKey = "carbup-nutrition-logs-by-date";
export const legacyLogStorageKey = "carbup-nutrition-log";
export const foodDiaryRetentionDays = 14;

export const emptyNutritionTotals: NutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0
};

export function createNutritionTotals(log: FoodLogEntry[]): NutritionTotals {
  return log.reduce(
    (sum, food) => ({
      calories: sum.calories + food.calories,
      protein: sum.protein + food.protein,
      carbs: sum.carbs + food.carbs,
      fat: sum.fat + food.fat
    }),
    emptyNutritionTotals
  );
}

export function getTodayDateKey() {
  return formatDateKey(createLocalNoonDate());
}

export function getRetentionStartKey(today = createLocalNoonDate()) {
  const retentionStart = new Date(today);
  retentionStart.setDate(today.getDate() - foodDiaryRetentionDays);

  return formatDateKey(retentionStart);
}

export function pruneStoredLogs(
  logs: Record<string, FoodLogEntry[]>,
  today = createLocalNoonDate()
) {
  const retentionStartKey = getRetentionStartKey(today);

  return Object.fromEntries(
    Object.entries(logs).filter(([dateKey]) => dateKey >= retentionStartKey)
  );
}
