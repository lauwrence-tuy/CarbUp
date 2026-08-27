/**
 * Seeds the Food catalog with USDA's curated generic-food datasets
 * (Foundation + SR Legacy, ~8k items) so common searches resolve locally
 * and offline from day one. Cache-through still fills in branded items on
 * demand.
 *
 * Run:  pnpm seed:foods            (writes to DATABASE_URL)
 *       pnpm seed:foods --dry-run  (fetch + normalize + count only)
 *
 * Idempotent: re-running upserts by (source, externalId).
 */
import { PrismaClient } from "@prisma/client";
import {
  normalizeUsdaFood,
  type NormalizedFood,
  type UsdaFood
} from "../lib/food-sources";

const LIST_URL = "https://api.nal.usda.gov/fdc/v1/foods/list";
const DATA_TYPES = ["Foundation", "SR Legacy"];
const PAGE_SIZE = 200;
const WRITE_CONCURRENCY = 10;
const PAGE_DELAY_MS = 150;

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

function apiKey(): string {
  const key = process.env.USDA_FDC_API_KEY?.trim();

  if (!key) {
    throw new Error(
      "USDA_FDC_API_KEY is not set. Add it to .env (get one free at " +
        "https://fdc.nal.usda.gov/api-key-signup.html)."
    );
  }

  return key;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchListPage(
  dataType: string,
  pageNumber: number
): Promise<UsdaFood[]> {
  const url = new URL(LIST_URL);
  url.searchParams.set("dataType", dataType);
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("pageNumber", String(pageNumber));
  url.searchParams.set("api_key", apiKey());

  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(
      `USDA /foods/list ${dataType} p${pageNumber} failed: ${response.status}`
    );
  }

  return (await response.json()) as UsdaFood[];
}

async function collectDataType(dataType: string): Promise<NormalizedFood[]> {
  const collected: NormalizedFood[] = [];

  for (let page = 1; ; page += 1) {
    const raw = await fetchListPage(dataType, page);

    if (raw.length === 0) {
      break;
    }

    for (const food of raw) {
      const normalized = normalizeUsdaFood({ ...food, dataType });

      if (normalized) {
        collected.push({ ...normalized, source: "seed", verified: true });
      }
    }

    process.stdout.write(
      `\r  ${dataType}: page ${page} (${collected.length} usable)`
    );

    if (raw.length < PAGE_SIZE) {
      break;
    }

    await sleep(PAGE_DELAY_MS);
  }

  process.stdout.write("\n");

  return collected;
}

async function upsertFood(food: NormalizedFood): Promise<"created" | "updated"> {
  const existing = await prisma.food.findUnique({
    where: {
      source_externalId: { source: food.source, externalId: food.externalId }
    },
    select: { id: true }
  });

  if (existing) {
    await prisma.food.update({
      where: { id: existing.id },
      data: {
        name: food.name,
        brand: food.brand ?? null,
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: food.proteinPer100g,
        carbsPer100g: food.carbsPer100g,
        fatPer100g: food.fatPer100g,
        defaultServingGrams: food.defaultServingGrams,
        defaultServingLabel: food.defaultServingLabel,
        verified: food.verified
      }
    });

    return "updated";
  }

  await prisma.food.create({
    data: {
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
    }
  });

  return "created";
}

async function main() {
  console.log(
    dryRun ? "USDA seed (dry run -- no writes)\n" : "USDA seed -> Food catalog\n"
  );

  const foods: NormalizedFood[] = [];

  for (const dataType of DATA_TYPES) {
    foods.push(...(await collectDataType(dataType)));
  }

  // Same fdcId can appear in both datasets; last one wins.
  const byId = new Map<string, NormalizedFood>();
  for (const food of foods) {
    byId.set(food.externalId, food);
  }
  const unique = [...byId.values()];

  console.log(`\nNormalized ${unique.length} unique generic foods.`);

  if (dryRun) {
    console.log("Sample:");
    for (const food of unique.slice(0, 10)) {
      console.log(
        `  ${food.name} - ${food.caloriesPer100g} kcal, ` +
          `P${food.proteinPer100g}/C${food.carbsPer100g}/F${food.fatPer100g}`
      );
    }
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < unique.length; i += WRITE_CONCURRENCY) {
    const batch = unique.slice(i, i + WRITE_CONCURRENCY);
    const results = await Promise.allSettled(batch.map(upsertFood));

    for (const result of results) {
      if (result.status === "rejected") {
        failed += 1;
      } else if (result.value === "created") {
        created += 1;
      } else {
        updated += 1;
      }
    }

    process.stdout.write(
      `\r  written ${created + updated}/${unique.length} ` +
        `(created ${created}, updated ${updated}, failed ${failed})`
    );
  }

  process.stdout.write("\n");
  console.log("Done.");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("\nSeed failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
