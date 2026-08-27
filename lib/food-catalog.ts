import type { Food, FoodServing } from "@prisma/client";
import { prisma } from "./prisma";
import { searchExternalFoods, type NormalizedFood } from "./food-sources";

export type CatalogServing = {
  id?: string;
  label: string;
  grams: number;
  isDefault: boolean;
};

/**
 * Shape returned by the food search API. A superset of the client's existing
 * `Food` type: `calories`/`protein`/`carbs`/`fat` are scaled to `baseGrams`
 * (the default serving) so current client math keeps working, while `per100g`
 * and `servings` support the richer serving picker.
 */
export type CatalogFood = {
  id: string;
  name: string;
  brand: string;
  source: string;
  verified: boolean;
  serving: string;
  baseGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  servings: CatalogServing[];
};

type FoodWithServings = Food & { servings: FoodServing[] };

const LOCAL_RESULTS_CONSIDERED_ENOUGH = 8;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 25;
const EXTERNAL_CACHE_TTL_MS = 60_000;

const EXACT_MATCH_SCORE = 100;
const PREFIX_MATCH_SCORE = 80;
const WORD_MATCH_SCORE = 60;
const SUBSTRING_MATCH_SCORE = 40;
// Enough to lift a verified prefix match ("Bananas, raw") above a branded
// exact match ("Banana"), but not above a verified exact match.
const VERIFIED_SCORE_BONUS = 25;

const externalCache = new Map<string, { at: number; foods: NormalizedFood[] }>();

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function scaleFromPer100g(per100g: number, grams: number): number {
  return round((per100g * grams) / 100, 1);
}

export function projectFood(row: FoodWithServings): CatalogFood {
  const baseGrams = row.defaultServingGrams > 0 ? row.defaultServingGrams : 100;
  const servings: CatalogServing[] = row.servings
    .map((serving) => ({
      id: serving.id,
      label: serving.label,
      grams: serving.grams,
      isDefault: serving.isDefault
    }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  if (servings.length === 0) {
    servings.push({
      label: row.defaultServingLabel || "100 g",
      grams: baseGrams,
      isDefault: true
    });
  }

  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? (row.source === "custom" ? "Custom food" : "USDA"),
    source: row.source,
    verified: row.verified,
    serving: row.defaultServingLabel || "100 g",
    baseGrams,
    calories: Math.round(scaleFromPer100g(row.caloriesPer100g, baseGrams)),
    protein: scaleFromPer100g(row.proteinPer100g, baseGrams),
    carbs: scaleFromPer100g(row.carbsPer100g, baseGrams),
    fat: scaleFromPer100g(row.fatPer100g, baseGrams),
    per100g: {
      calories: Math.round(row.caloriesPer100g),
      protein: round(row.proteinPer100g, 1),
      carbs: round(row.carbsPer100g, 1),
      fat: round(row.fatPer100g, 1)
    },
    servings
  };
}

/**
 * Insert (or refresh) an external food in the local catalog. Servings are only
 * written on first insert to avoid churn. Never throws to the caller: a failed
 * write just means the food isn't cached yet.
 */
async function cacheExternalFood(
  food: NormalizedFood
): Promise<FoodWithServings | null> {
  try {
    return await prisma.food.upsert({
      where: {
        source_externalId: {
          source: food.source,
          externalId: food.externalId
        }
      },
      create: {
        source: food.source,
        externalId: food.externalId,
        name: food.name,
        brand: food.brand ?? null,
        barcode: food.barcode ?? null,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        defaultServingGrams: food.defaultServingGrams,
        defaultServingLabel: food.defaultServingLabel,
        verified: food.verified,
        servings: {
          create: food.servings.map((serving) => ({
            label: serving.label,
            grams: serving.grams,
            isDefault: Boolean(serving.isDefault)
          }))
        }
      },
      update: {
        name: food.name,
        brand: food.brand ?? null,
        barcode: food.barcode ?? null,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        defaultServingGrams: food.defaultServingGrams,
        defaultServingLabel: food.defaultServingLabel,
        verified: food.verified
      },
      include: { servings: true }
    });
  } catch {
    return null;
  }
}

function dedupeByIdentity(foods: CatalogFood[]): CatalogFood[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  return foods.filter((food) => {
    const nameKey = `${food.name.toLowerCase()}|${food.brand.toLowerCase()}`;

    if (seenIds.has(food.id) || seenNames.has(nameKey)) {
      return false;
    }

    seenIds.add(food.id);
    seenNames.add(nameKey);

    return true;
  });
}

/** Higher is better. Rewards close name matches before falling back to flags. */
function matchScore(name: string, query: string): number {
  const haystack = name.toLowerCase();
  const needle = query.toLowerCase().trim();

  if (haystack === needle) {
    return EXACT_MATCH_SCORE;
  }

  if (haystack.startsWith(needle)) {
    return PREFIX_MATCH_SCORE;
  }

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (new RegExp(`\\b${escaped}\\b`).test(haystack)) {
    return WORD_MATCH_SCORE;
  }

  if (haystack.includes(needle)) {
    return SUBSTRING_MATCH_SCORE;
  }

  return 0;
}

function rankScore(food: CatalogFood, query: string): number {
  return (
    matchScore(food.name, query) +
    (food.verified ? VERIFIED_SCORE_BONUS : 0)
  );
}

function makeRanker(query: string) {
  return (a: CatalogFood, b: CatalogFood): number => {
    const scoreDelta = rankScore(b, query) - rankScore(a, query);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    // Shorter names are usually the plainer, more generic item.
    if (a.name.length !== b.name.length) {
      return a.name.length - b.name.length;
    }

    return a.name.localeCompare(b.name);
  };
}

async function readExternal(query: string): Promise<NormalizedFood[]> {
  const key = query.toLowerCase();
  const cached = externalCache.get(key);

  if (cached && Date.now() - cached.at < EXTERNAL_CACHE_TTL_MS) {
    return cached.foods;
  }

  const foods = await searchExternalFoods(query);
  externalCache.set(key, { at: Date.now(), foods });

  return foods;
}

export async function searchFoodCatalog(options: {
  query: string;
  userId: string;
  limit?: number;
}): Promise<{ foods: CatalogFood[]; usedExternal: boolean }> {
  const query = options.query.trim();
  const limit = Math.min(
    Math.max(Math.trunc(options.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  if (query.length < 2) {
    return { foods: [], usedExternal: false };
  }

  const ranker = makeRanker(query);

  // Pull a wide candidate set and rank in JS -- the DB `name` index can't
  // express "closest match first", only alphabetical.
  const local = await prisma.food.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
      OR: [{ createdBy: null }, { createdBy: options.userId }]
    },
    orderBy: [{ verified: "desc" }, { usageCount: "desc" }],
    take: Math.min(limit * 4, 120),
    include: { servings: true }
  });

  const localFoods = local.map(projectFood).sort(ranker);
  const strongLocalMatches = localFoods.filter(
    (food) => matchScore(food.name, query) >= WORD_MATCH_SCORE
  ).length;

  if (strongLocalMatches >= LOCAL_RESULTS_CONSIDERED_ENOUGH) {
    return { foods: localFoods.slice(0, limit), usedExternal: false };
  }

  const external = await readExternal(query);

  if (external.length === 0) {
    return { foods: localFoods.slice(0, limit), usedExternal: false };
  }

  const knownKeys = new Set(
    local.map((row) => `${row.source}:${row.externalId ?? ""}`)
  );
  const toCache = external.filter(
    (food) => !knownKeys.has(`${food.source}:${food.externalId}`)
  );

  const cached = await Promise.allSettled(toCache.map(cacheExternalFood));
  const cachedRows = cached
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((row): row is FoodWithServings => row !== null);

  const merged = dedupeByIdentity(
    [...local, ...cachedRows].map(projectFood).sort(ranker)
  ).slice(0, limit);

  return { foods: merged, usedExternal: true };
}
