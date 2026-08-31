import type { Food, FoodServing } from "@prisma/client";
import type {
  CatalogFood,
  CatalogServing
} from "@/components/dashboard/nutrition-diary-storage";
import { prisma } from "./prisma";
import {
  lookupOffBarcode,
  searchExternalFoods,
  type NormalizedFood
} from "./food-sources";

export type { CatalogFood, CatalogServing };

type FoodWithServings = Food & { servings: FoodServing[] };

/** Minimal food-log row shape needed to derive a recent-foods list. */
type RecentFoodLogRow = {
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
  source: string;
};

const RECENT_FOODS_LIMIT = 20;

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

function defaultBrandLabel(source: string): string {
  switch (source) {
    case "custom":
      return "Custom food";
    case "off":
      return "Open Food Facts";
    case "recent":
      return "Recent";
    default:
      return "USDA";
  }
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
    brand: row.brand ?? defaultBrandLabel(row.source),
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

function logKey(log: RecentFoodLogRow): string {
  return (log.foodId ?? `${log.name}|${log.brand ?? ""}`).toLowerCase();
}

/** One food-log row -> CatalogFood, backing per-100g out of the stored portion. */
function logToCatalogFood(log: RecentFoodLogRow): CatalogFood {
  const grams = log.grams > 0 ? log.grams : log.baseGrams || 100;
  const portionGrams = Math.round(grams);
  const per100 = (value: number) => round((value / grams) * 100, 1);
  const servingLabel = log.serving || `${portionGrams} g`;

  return {
    id: log.foodId ?? `recent-${logKey(log)}`,
    name: log.name,
    brand: log.brand ?? "Recent",
    source: "recent",
    verified: false,
    serving: servingLabel,
    baseGrams: portionGrams,
    calories: Math.round(log.calories),
    protein: Math.round(log.protein),
    carbs: Math.round(log.carbs),
    fat: Math.round(log.fat),
    per100g: {
      calories: Math.round(per100(log.calories)),
      protein: per100(log.protein),
      carbs: per100(log.carbs),
      fat: per100(log.fat)
    },
    servings: [
      { label: servingLabel, grams: portionGrams, isDefault: true },
      { label: "100 g", grams: 100, isDefault: false }
    ]
  };
}

/**
 * Distinct foods the user has logged, most recent first, as CatalogFood so the
 * search UI can show them before anything is typed. Composite "meal" entries
 * are skipped -- they aren't single foods. Callers pass logs oldest-first.
 */
export function recentFoodsFromLogs(logs: RecentFoodLogRow[]): CatalogFood[] {
  const seen = new Set<string>();
  const recent: CatalogFood[] = [];

  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const log = logs[index];

    if (log.source === "meal" || seen.has(logKey(log))) {
      continue;
    }

    seen.add(logKey(log));
    recent.push(logToCatalogFood(log));

    if (recent.length >= RECENT_FOODS_LIMIT) {
      break;
    }
  }

  return recent;
}

/**
 * Distinct foods the user has logged, most-logged first (ties broken by
 * recency). Projected from each food's most recent log entry.
 */
export function frequentFoodsFromLogs(logs: RecentFoodLogRow[]): CatalogFood[] {
  const counts = new Map<string, number>();
  const latest = new Map<string, RecentFoodLogRow>();
  const order: string[] = [];

  for (const log of logs) {
    if (log.source === "meal") {
      continue;
    }

    const key = logKey(log);

    if (!counts.has(key)) {
      order.push(key);
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
    latest.set(key, log); // logs are oldest-first, so this ends on the newest
  }

  return order
    .map((key, index) => ({ key, index, count: counts.get(key) ?? 0 }))
    .sort((a, b) => b.count - a.count || b.index - a.index)
    .slice(0, RECENT_FOODS_LIMIT)
    .map((entry) => logToCatalogFood(latest.get(entry.key)!));
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

function queryTokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function wordRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Tolerate a singular query matching a plural name ("apple" -> "apples").
  return new RegExp(`\\b${escaped}s?\\b`);
}

/** Higher is better. Rewards close name matches before falling back to flags. */
function matchScore(name: string, query: string): number {
  const haystack = name.toLowerCase();
  const needle = query.toLowerCase().trim();

  if (haystack === needle) {
    return EXACT_MATCH_SCORE;
  }

  // Whole-word prefix ("egg" -> "Egg, yolk"), not mid-word ("egg" -> "Eggnog").
  if (new RegExp(`^${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`).test(haystack)) {
    return PREFIX_MATCH_SCORE;
  }

  if (wordRegex(needle).test(haystack)) {
    return WORD_MATCH_SCORE;
  }

  // Multi-word query whose every word appears in the name, any order
  // ("broccoli raw" -> "Broccoli, raw").
  const tokens = queryTokens(needle);

  if (tokens.length > 1 && tokens.every((token) => wordRegex(token).test(haystack))) {
    return WORD_MATCH_SCORE - 5;
  }

  if (haystack.includes(needle)) {
    return SUBSTRING_MATCH_SCORE;
  }

  // Partial token coverage.
  const covered = tokens.filter((token) => haystack.includes(token)).length;

  if (covered > 0) {
    return Math.round((covered / tokens.length) * SUBSTRING_MATCH_SCORE);
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

  // Match every query word against the name (any order), so "broccoli raw"
  // finds "Broccoli, raw". Pull a wide candidate set and rank in JS -- the
  // DB `name` index can't express "closest match first", only alphabetical.
  const words = queryTokens(query);
  const local = await prisma.food.findMany({
    where: {
      AND: words.map((word) => ({
        name: { contains: word, mode: "insensitive" as const }
      })),
      OR: [{ createdBy: null }, { createdBy: options.userId }]
    },
    orderBy: [{ verified: "desc" }, { usageCount: "desc" }],
    take: Math.min(limit * 4, 120),
    include: { servings: true }
  });

  const localFoods = dedupeByIdentity(local.map(projectFood).sort(ranker));
  const strongLocalMatches = localFoods.filter(
    (food) => matchScore(food.name, query) >= WORD_MATCH_SCORE - 5
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

/**
 * Resolve a scanned/entered barcode to a single food: local catalog first
 * (by `barcode`), then Open Food Facts with cache-through. Returns null when
 * nothing matches.
 */
export async function lookupFoodByBarcode(options: {
  code: string;
  userId: string;
}): Promise<CatalogFood | null> {
  const code = options.code.trim();

  if (!/^\d{6,14}$/.test(code)) {
    return null;
  }

  const local = await prisma.food.findFirst({
    where: {
      barcode: code,
      OR: [{ createdBy: null }, { createdBy: options.userId }]
    },
    include: { servings: true }
  });

  if (local) {
    return projectFood(local);
  }

  let external: NormalizedFood | null = null;

  try {
    external = await lookupOffBarcode(code);
  } catch {
    external = null;
  }

  if (!external) {
    return null;
  }

  const cached = await cacheExternalFood(external);

  return cached ? projectFood(cached) : null;
}
