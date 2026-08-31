import type { NormalizedFood } from "./types";
import {
  buildServings,
  cleanText,
  dedupeByNameBrand,
  failsAtwaterCheck,
  MAX_SANE_KCAL_PER_100G,
  round
} from "./normalize";

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const DATA_TYPES = ["Foundation", "SR Legacy", "Branded"];
const REQUEST_TIMEOUT_MS = 4000;
const MAX_RESULTS = 25;
const MIN_QUERY_LENGTH = 2;

// USDA identifies nutrients by a numeric `nutrientId` and a legacy string
// `nutrientNumber`. Different dataTypes populate one or the other, so match both.
const NUTRIENT_ID = {
  energyKcal: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005
} as const;
const NUTRIENT_NUMBER = {
  energyKcal: "208",
  protein: "203",
  fat: "204",
  carbs: "205",
  energyKj: "268"
} as const;

const KJ_PER_KCAL = 4.184;

// `/foods/search` uses nutrientId/nutrientNumber + `value`; the abridged
// `/foods/list` payload uses `number` + `amount`. Accept either.
export type UsdaNutrient = {
  nutrientId?: number;
  nutrientNumber?: string;
  number?: string;
  unitName?: string;
  value?: number;
  amount?: number;
};

export type UsdaFood = {
  fdcId?: number;
  description?: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaNutrient[];
};

type UsdaSearchResponse = {
  foods?: UsdaFood[];
};

function nutrientAmount(nutrient: UsdaNutrient): number | null {
  if (typeof nutrient.value === "number") {
    return nutrient.value;
  }

  return typeof nutrient.amount === "number" ? nutrient.amount : null;
}

function getApiKey(): string {
  const key = process.env.USDA_FDC_API_KEY?.trim();

  // DEMO_KEY works but is aggressively rate limited; fine for local smoke tests.
  return key && key.length > 0 ? key : "DEMO_KEY";
}

function readNutrient(
  nutrients: UsdaNutrient[],
  id: number,
  number: string
): number | null {
  const match = nutrients.find(
    (nutrient) =>
      nutrient.nutrientId === id ||
      nutrient.nutrientNumber === number ||
      nutrient.number === number
  );

  return match ? nutrientAmount(match) : null;
}

function readEnergyKcal(nutrients: UsdaNutrient[]): number | null {
  const kcal = readNutrient(
    nutrients,
    NUTRIENT_ID.energyKcal,
    NUTRIENT_NUMBER.energyKcal
  );

  if (kcal != null && kcal > 0) {
    return kcal;
  }

  // Some Foundation foods only report energy in kilojoules.
  const kjNutrient = nutrients.find(
    (nutrient) =>
      nutrient.nutrientNumber === NUTRIENT_NUMBER.energyKj ||
      nutrient.number === NUTRIENT_NUMBER.energyKj
  );
  const kj = kjNutrient ? nutrientAmount(kjNutrient) : null;

  return kj != null && kj > 0 ? kj / KJ_PER_KCAL : null;
}

/** Grams for the provider's stated serving, or null if it can't be trusted. */
function servingGramsFor(food: UsdaFood): number | null {
  if (typeof food.servingSize !== "number" || food.servingSize <= 0) {
    return null;
  }

  const unit = (food.servingSizeUnit ?? "").toLowerCase();

  if (["g", "grm", "gram", "grams", ""].includes(unit)) {
    return food.servingSize;
  }

  // Approximate volume servings at water density -- good enough for a picker.
  if (["ml", "mlt", "milliliter", "milliliters"].includes(unit)) {
    return food.servingSize;
  }

  return null;
}

export function normalizeUsdaFood(food: UsdaFood): NormalizedFood | null {
  const description = food.description?.trim();

  if (!description || !food.fdcId) {
    return null;
  }

  const nutrients = food.foodNutrients ?? [];
  const calories = readEnergyKcal(nutrients);

  if (calories == null || calories <= 0 || calories > MAX_SANE_KCAL_PER_100G) {
    return null;
  }

  const protein =
    readNutrient(nutrients, NUTRIENT_ID.protein, NUTRIENT_NUMBER.protein) ?? 0;
  const carbs =
    readNutrient(nutrients, NUTRIENT_ID.carbs, NUTRIENT_NUMBER.carbs) ?? 0;
  const fat = readNutrient(nutrients, NUTRIENT_ID.fat, NUTRIENT_NUMBER.fat) ?? 0;

  if (protein < 0 || carbs < 0 || fat < 0) {
    return null;
  }

  if (failsAtwaterCheck(calories, protein, carbs, fat)) {
    return null;
  }

  const servingGrams = servingGramsFor(food);
  const servingLabel =
    food.householdServingFullText?.trim() ||
    (servingGrams
      ? `${round(servingGrams, 2)} ${food.servingSizeUnit ?? "g"}`
      : "100 g");

  return {
    source: "usda",
    externalId: String(food.fdcId),
    name: cleanText(description) ?? description,
    brand: cleanText(food.brandName?.trim() || food.brandOwner?.trim()),
    barcode: food.gtinUpc?.trim() || undefined,
    caloriesPer100g: Math.round(calories),
    proteinPer100g: round(protein, 2),
    carbsPer100g: round(carbs, 2),
    fatPer100g: round(fat, 2),
    defaultServingGrams: servingGrams ?? 100,
    defaultServingLabel: servingGrams ? servingLabel : "100 g",
    verified: food.dataType === "Foundation" || food.dataType === "SR Legacy",
    servings: buildServings(servingGrams, servingLabel)
  };
}

export async function searchUsdaFoods(query: string): Promise<NormalizedFood[]> {
  const trimmed = query.trim();

  if (trimmed.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set("query", trimmed);
  url.searchParams.set("dataType", DATA_TYPES.join(","));
  url.searchParams.set("pageSize", String(MAX_RESULTS));
  url.searchParams.set("api_key", getApiKey());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`USDA food search failed: ${response.status}`);
    }

    const data = (await response.json()) as UsdaSearchResponse;
    const normalized = (data.foods ?? [])
      .map(normalizeUsdaFood)
      .filter((food): food is NormalizedFood => food !== null);

    return dedupeByNameBrand(normalized);
  } finally {
    clearTimeout(timer);
  }
}
