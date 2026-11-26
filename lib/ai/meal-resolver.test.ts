import { describe, expect, it } from "vitest";
import type { CatalogFood } from "@/lib/food-catalog";
import type { LlmMealItem } from "./meal-parser";
import {
  catalogAgreesWithEstimate,
  resolveItem,
  resolveParsedMeal,
  sumMacros
} from "./meal-resolver";

function catalogFood(name: string, per100g: CatalogFood["per100g"]): CatalogFood {
  return {
    id: `food-${name}`,
    name,
    brand: "USDA",
    serving: "100 g",
    baseGrams: 100,
    ...per100g,
    source: "seed",
    verified: true,
    per100g,
    servings: [{ label: "100 g", grams: 100, isDefault: true }]
  };
}

const oats = catalogFood("Oats", { calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5 });

function item(overrides: Partial<LlmMealItem> = {}): LlmMealItem {
  return {
    name: "a bowl of oats",
    searchTerm: "oats",
    quantity: "1 cup dry",
    grams: 80,
    calories: 300,
    protein: 10,
    carbs: 54,
    fat: 5,
    ...overrides
  };
}

describe("catalogAgreesWithEstimate", () => {
  it("accepts close numbers and small absolute gaps", () => {
    expect(catalogAgreesWithEstimate(303, 300)).toBe(true);
    expect(catalogAgreesWithEstimate(5, 50)).toBe(true);
  });

  it("rejects a match more than 2x off", () => {
    expect(catalogAgreesWithEstimate(900, 300)).toBe(false);
    expect(catalogAgreesWithEstimate(100, 400)).toBe(false);
  });
});

describe("resolveItem", () => {
  it("uses the catalog's per-100 g numbers scaled to the grams", () => {
    const resolved = resolveItem(item(), oats);

    expect(resolved).toMatchObject({
      source: "catalog",
      grams: 80,
      calories: 303,
      protein: 10.6,
      carbs: 54.2,
      fat: 5.2,
      match: { id: "food-Oats", name: "Oats" }
    });
  });

  it("falls back to the estimate when the match is implausible", () => {
    const lard = catalogFood("Lard", { calories: 902, protein: 0, carbs: 0, fat: 100 });
    const resolved = resolveItem(item(), lard);

    expect(resolved.source).toBe("estimate");
    expect(resolved.match).toBeNull();
    expect(resolved.calories).toBe(300);
    expect(resolved.per100g.calories).toBe(375);
  });

  it("uses the estimate when nothing matched", () => {
    expect(resolveItem(item({ grams: 79.6 }), null)).toMatchObject({
      source: "estimate",
      grams: 80
    });
  });
});

describe("resolveParsedMeal", () => {
  it("matches each item and totals the meal", async () => {
    const searched: string[] = [];
    const resolved = await resolveParsedMeal(
      {
        title: "Breakfast",
        mealHint: "Breakfast",
        items: [item(), item({ name: "mystery", searchTerm: "mystery", calories: 100, protein: 1, carbs: 1, fat: 1 })],
        notFood: ["went for a ride"]
      },
      async (query) => {
        searched.push(query);
        if (query === "mystery") {
          throw new Error("search down");
        }
        return [oats];
      }
    );

    expect(searched.sort()).toEqual(["mystery", "oats"]);
    expect(resolved.items.map((entry) => entry.source)).toEqual(["catalog", "estimate"]);
    expect(resolved.totals.calories).toBe(403);
    expect(resolved.notFood).toEqual(["went for a ride"]);
  });
});

describe("sumMacros", () => {
  it("rounds the totals", () => {
    expect(
      sumMacros([
        { calories: 100, protein: 1.4, carbs: 2.2, fat: 0.3 },
        { calories: 50, protein: 1.4, carbs: 2.2, fat: 0.3 }
      ])
    ).toEqual({ calories: 150, protein: 3, carbs: 4, fat: 1 });
  });
});
