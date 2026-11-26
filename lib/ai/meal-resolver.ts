import type { CatalogFood } from "@/lib/food-catalog";
import type { LlmMeal, LlmMealItem } from "./meal-parser";

type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/**
 * One food from a described meal, ready for the confirm step. `per100g`
 * lets the UI rescale it when the user changes the grams, whichever source
 * the numbers came from.
 */
export type ResolvedMealItem = Macros & {
  name: string;
  quantity: string;
  grams: number;
  /** "catalog": macros from the matched food. "estimate": the model's own numbers. */
  source: "catalog" | "estimate";
  per100g: Macros;
  match: { id: string; name: string; brand: string } | null;
};

export type ResolvedMeal = {
  title: string;
  mealHint: LlmMeal["mealHint"];
  items: ResolvedMealItem[];
  totals: Macros;
  notFood: string[];
};

type SearchFoods = (query: string) => Promise<CatalogFood[]>;

/**
 * A catalog match is trusted unless its calories disagree with the model's
 * estimate by more than this factor, which usually means the search found
 * the wrong food ("chicken" matching chicken fat).
 */
const MAX_CALORIE_RATIO = 2;
/** Below this many kcal apart the ratio check is skipped (coffee, greens). */
const SMALL_CALORIE_DIFFERENCE = 60;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function scale(per100g: Macros, grams: number): Macros {
  return {
    calories: Math.round((per100g.calories * grams) / 100),
    protein: round1((per100g.protein * grams) / 100),
    carbs: round1((per100g.carbs * grams) / 100),
    fat: round1((per100g.fat * grams) / 100)
  };
}

function estimatePer100g(item: LlmMealItem): Macros {
  const factor = 100 / item.grams;

  return {
    calories: round1(item.calories * factor),
    protein: round1(item.protein * factor),
    carbs: round1(item.carbs * factor),
    fat: round1(item.fat * factor)
  };
}

/** Whether the catalog's calories for this amount are believable next to the estimate. */
export function catalogAgreesWithEstimate(catalogCalories: number, estimateCalories: number) {
  if (Math.abs(catalogCalories - estimateCalories) <= SMALL_CALORIE_DIFFERENCE) {
    return true;
  }

  const low = Math.max(Math.min(catalogCalories, estimateCalories), 1);
  const high = Math.max(catalogCalories, estimateCalories);

  return high / low <= MAX_CALORIE_RATIO;
}

export function resolveItem(item: LlmMealItem, candidate: CatalogFood | null): ResolvedMealItem {
  const grams = Math.round(item.grams);

  if (candidate) {
    const fromCatalog = scale(candidate.per100g, grams);

    if (catalogAgreesWithEstimate(fromCatalog.calories, item.calories)) {
      return {
        name: item.name,
        quantity: item.quantity,
        grams,
        ...fromCatalog,
        source: "catalog",
        per100g: candidate.per100g,
        match: { id: candidate.id, name: candidate.name, brand: candidate.brand }
      };
    }
  }

  const per100g = estimatePer100g(item);

  return {
    name: item.name,
    quantity: item.quantity,
    grams,
    ...scale(per100g, grams),
    source: "estimate",
    per100g,
    match: null
  };
}

export function sumMacros(items: Macros[]): Macros {
  const totals = items.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein: sum.protein + item.protein,
      carbs: sum.carbs + item.carbs,
      fat: sum.fat + item.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat)
  };
}

/**
 * Match every parsed item against the food catalog (in parallel). The first
 * search result is the match; a failed search falls back to the estimate.
 */
export async function resolveParsedMeal(
  meal: LlmMeal,
  searchFoods: SearchFoods
): Promise<ResolvedMeal> {
  const items = await Promise.all(
    meal.items.map(async (item) => {
      let candidate: CatalogFood | null = null;

      try {
        candidate = (await searchFoods(item.searchTerm))[0] ?? null;
      } catch {
        candidate = null;
      }

      return resolveItem(item, candidate);
    })
  );

  return {
    title: meal.title,
    mealHint: meal.mealHint,
    items,
    totals: sumMacros(items),
    notFood: meal.notFood
  };
}
