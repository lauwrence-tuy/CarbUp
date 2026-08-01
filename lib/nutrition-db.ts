import type { Food, FoodLogEntry, MealName } from "@/components/dashboard/nutrition-diary-storage";

export type SavedMealIngredient = {
  food: Food;
  grams: number;
};

export type SavedMealRecord = {
  id: string;
  name: string;
  ingredients: SavedMealIngredient[];
};

type FoodLogRow = {
  id: string;
  foodId: string | null;
  name: string;
  brand: string | null;
  serving: string;
  baseGrams: number;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  itemsJson: string | null;
  meal: string;
  source: string;
};

type SavedMealRow = {
  id: string;
  name: string;
  ingredientsJson: string;
};

export function foodLogRowToEntry(row: FoodLogRow): FoodLogEntry {
  return {
    id: row.foodId ?? row.id,
    name: row.name,
    brand: row.brand ?? "Saved food",
    serving: row.serving,
    baseGrams: row.baseGrams,
    grams: row.grams,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    items: parseJson<FoodLogEntry[] | undefined>(row.itemsJson, undefined),
    logId: row.id,
    meal: row.meal as MealName,
    source: row.source as FoodLogEntry["source"]
  };
}

export function savedMealRowToRecord(row: SavedMealRow): SavedMealRecord {
  return {
    id: row.id,
    name: row.name,
    ingredients: parseJson<SavedMealIngredient[]>(row.ingredientsJson, [])
  };
}

export function groupFoodLogsByDate(
  rows: Array<FoodLogRow & { dateKey: string }>
) {
  return rows.reduce<Record<string, FoodLogEntry[]>>((grouped, row) => {
    grouped[row.dateKey] = [
      ...(grouped[row.dateKey] ?? []),
      foodLogRowToEntry(row)
    ];

    return grouped;
  }, {});
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
