import type { NormalizedFood } from "./types";
import {
  buildServings,
  cleanText,
  dedupeByNameBrand,
  failsAtwaterCheck,
  MAX_SANE_KCAL_PER_100G,
  round
} from "./normalize";

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";
const REQUEST_TIMEOUT_MS = 4500;
const MAX_RESULTS = 25;
const MIN_QUERY_LENGTH = 2;
const FIELDS =
  "code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity";
// OFF asks every client to identify itself; anonymous traffic gets throttled.
const USER_AGENT = "CarbUp/0.1 (personal calorie tracker; contact via app)";

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

type OffSearchResponse = { products?: OffProduct[] };
type OffProductResponse = { status?: number; product?: OffProduct };

function toNumber(value: unknown): number | null {
  const parsed =
    typeof value === "string"
      ? Number.parseFloat(value)
      : typeof value === "number"
        ? value
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function firstBrand(brands: string | undefined): string | undefined {
  return cleanText(brands?.split(",")[0]);
}

/** Grams for the product's serving, from serving_quantity or a "(30 g)" string. */
function servingGramsFor(product: OffProduct): number | null {
  const quantity = toNumber(product.serving_quantity);

  if (quantity && quantity > 0 && quantity < 2000) {
    return quantity;
  }

  const match = product.serving_size?.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  const parsed = match ? Number.parseFloat(match[1]) : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeOffProduct(product: OffProduct): NormalizedFood | null {
  const code = product.code?.trim();
  const name = cleanText(
    product.product_name?.trim() || product.product_name_en?.trim()
  );

  if (!code || !name) {
    return null;
  }

  const nutriments = product.nutriments ?? {};
  const calories = toNumber(nutriments["energy-kcal_100g"]);

  if (calories == null || calories <= 0 || calories > MAX_SANE_KCAL_PER_100G) {
    return null;
  }

  const protein = toNumber(nutriments["proteins_100g"]) ?? 0;
  const carbs = toNumber(nutriments["carbohydrates_100g"]) ?? 0;
  const fat = toNumber(nutriments["fat_100g"]) ?? 0;

  if (protein < 0 || carbs < 0 || fat < 0) {
    return null;
  }

  if (failsAtwaterCheck(calories, protein, carbs, fat)) {
    return null;
  }

  const servingGrams = servingGramsFor(product);
  const servingLabel =
    cleanText(product.serving_size) ??
    (servingGrams ? `${round(servingGrams, 1)} g` : "100 g");

  return {
    source: "off",
    externalId: code,
    name,
    brand: firstBrand(product.brands),
    barcode: code,
    caloriesPer100g: Math.round(calories),
    proteinPer100g: round(protein, 2),
    carbsPer100g: round(carbs, 2),
    fatPer100g: round(fat, 2),
    defaultServingGrams: servingGrams ?? 100,
    defaultServingLabel: servingGrams ? servingLabel : "100 g",
    verified: false,
    servings: buildServings(servingGrams, servingLabel)
  };
}

async function offFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT }
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function searchOffFoods(query: string): Promise<NormalizedFood[]> {
  const trimmed = query.trim();

  if (trimmed.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const url = new URL(OFF_SEARCH_URL);
  url.searchParams.set("search_terms", trimmed);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(MAX_RESULTS));
  url.searchParams.set("fields", FIELDS);

  const response = await offFetch(url.toString());

  if (!response.ok) {
    throw new Error(`OFF search failed: ${response.status}`);
  }

  const data = (await response.json()) as OffSearchResponse;
  const normalized = (data.products ?? [])
    .map(normalizeOffProduct)
    .filter((food): food is NormalizedFood => food !== null);

  return dedupeByNameBrand(normalized);
}

export async function lookupOffBarcode(
  code: string
): Promise<NormalizedFood | null> {
  const trimmed = code.trim();

  if (!/^\d{6,14}$/.test(trimmed)) {
    return null;
  }

  const response = await offFetch(
    `${OFF_PRODUCT_URL}/${trimmed}?fields=${FIELDS}`
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as OffProductResponse;

  return data.product ? normalizeOffProduct(data.product) : null;
}
