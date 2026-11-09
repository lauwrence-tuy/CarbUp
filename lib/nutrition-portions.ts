// Portion math for the nutrition page: scaling foods and saved meals to a
// gram amount and turning them into food log entries.

import {
  type CatalogFood,
  createNutritionTotals,
  type Food,
  type FoodLogEntry,
  type MealName,
  type SavedMeal,
  type SavedMealIngredient
} from "@/components/nutrition/nutrition-diary-storage";

export function createLogId() {
  return `food-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Scale a food's nutrition (given per `baseGrams`) to `grams`. */
export function getFoodPortion(food: Food, grams: number) {
  const safeGrams = Math.max(0, Math.round(grams));
  const ratio = food.baseGrams > 0 ? safeGrams / food.baseGrams : 0;

  return {
    grams: safeGrams,
    serving: `${safeGrams} g`,
    calories: Math.round(food.calories * ratio),
    protein: Math.round(food.protein * ratio),
    carbs: Math.round(food.carbs * ratio),
    fat: Math.round(food.fat * ratio)
  };
}

export function getDefaultServingGrams(food: CatalogFood) {
  return food.servings.find((serving) => serving.isDefault)?.grams ?? food.baseGrams;
}

export function createFoodLogEntry(
  food: Food,
  grams: number,
  meal: MealName
): FoodLogEntry {
  return {
    ...food,
    ...getFoodPortion(food, grams),
    logId: createLogId(),
    meal,
    source: "food"
  };
}

/** Totals for a meal's ingredients at their saved gram amounts. */
export function getMealTotals(ingredients: SavedMealIngredient[]) {
  return ingredients.reduce(
    (totals, ingredient) => {
      const portion = getFoodPortion(ingredient.food, ingredient.grams);

      return {
        grams: totals.grams + portion.grams,
        calories: totals.calories + portion.calories,
        protein: totals.protein + portion.protein,
        carbs: totals.carbs + portion.carbs,
        fat: totals.fat + portion.fat
      };
    },
    { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/** The meal's total weight, as the string the grams input expects. */
export function getMealGramsInput(meal: SavedMeal | undefined) {
  return meal ? String(getMealTotals(meal.ingredients).grams) : "";
}

/** Totals for a saved meal scaled to a different total weight. */
export function getScaledMealTotals(savedMeal: SavedMeal, grams: number) {
  const defaultTotals = getMealTotals(savedMeal.ingredients);
  const safeGrams = Math.max(0, Math.round(grams));
  const ratio = defaultTotals.grams > 0 ? safeGrams / defaultTotals.grams : 0;

  return {
    grams: safeGrams,
    calories: Math.round(defaultTotals.calories * ratio),
    protein: Math.round(defaultTotals.protein * ratio),
    carbs: Math.round(defaultTotals.carbs * ratio),
    fat: Math.round(defaultTotals.fat * ratio)
  };
}

export function createMealLogEntry(
  savedMeal: SavedMeal,
  grams: number,
  meal: MealName
): FoodLogEntry {
  const defaultTotals = getMealTotals(savedMeal.ingredients);
  const safeGrams = Math.max(0, Math.round(grams));
  const ratio = defaultTotals.grams > 0 ? safeGrams / defaultTotals.grams : 0;
  const items = savedMeal.ingredients.map((ingredient) =>
    createFoodLogEntry(ingredient.food, ingredient.grams * ratio, meal)
  );
  const totals = createNutritionTotals(items);

  return {
    id: savedMeal.id,
    name: savedMeal.name,
    brand: "Saved meal",
    serving: `${safeGrams} g`,
    baseGrams: defaultTotals.grams,
    grams: safeGrams,
    ...totals,
    items,
    logId: createLogId(),
    meal,
    source: "meal"
  };
}
