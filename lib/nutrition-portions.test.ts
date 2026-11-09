import { describe, expect, it } from "vitest";
import type {
  CatalogFood,
  Food,
  SavedMeal
} from "@/components/nutrition/nutrition-diary-storage";
import {
  createFoodLogEntry,
  createMealLogEntry,
  getDefaultServingGrams,
  getFoodPortion,
  getMealGramsInput,
  getMealTotals,
  getScaledMealTotals
} from "./nutrition-portions";

// 100 g of oats
const oats: Food = {
  id: "oats",
  name: "Oats",
  brand: "",
  serving: "100 g",
  baseGrams: 100,
  calories: 380,
  protein: 13,
  carbs: 67,
  fat: 7
};

// 1 medium banana
const banana: Food = {
  id: "banana",
  name: "Banana",
  brand: "",
  serving: "1 medium",
  baseGrams: 120,
  calories: 105,
  protein: 1,
  carbs: 27,
  fat: 0
};

const bowl: SavedMeal = {
  id: "meal-1",
  name: "Oat bowl",
  ingredients: [
    { food: oats, grams: 50 },
    { food: banana, grams: 120 }
  ]
};

describe("getFoodPortion", () => {
  it("scales nutrition from the food's base grams", () => {
    expect(getFoodPortion(oats, 50)).toEqual({
      grams: 50,
      serving: "50 g",
      calories: 190,
      protein: 7,
      carbs: 34,
      fat: 4
    });
  });

  it("clamps negative grams to zero", () => {
    expect(getFoodPortion(oats, -20).calories).toBe(0);
  });

  it("returns zeros for a food with no base weight", () => {
    expect(getFoodPortion({ ...oats, baseGrams: 0 }, 100).calories).toBe(0);
  });
});

describe("getDefaultServingGrams", () => {
  const catalogOats = {
    ...oats,
    source: "usda",
    verified: true,
    per100g: { calories: 380, protein: 13, carbs: 67, fat: 7 },
    servings: [
      { label: "100 g", grams: 100, isDefault: false },
      { label: "1/2 cup", grams: 40, isDefault: true }
    ]
  } satisfies CatalogFood;

  it("uses the default serving", () => {
    expect(getDefaultServingGrams(catalogOats)).toBe(40);
  });

  it("falls back to base grams", () => {
    expect(getDefaultServingGrams({ ...catalogOats, servings: [] })).toBe(100);
  });
});

describe("createFoodLogEntry", () => {
  it("builds a food entry for the chosen meal", () => {
    const entry = createFoodLogEntry(oats, 50, "Breakfast");

    expect(entry).toMatchObject({
      id: "oats",
      name: "Oats",
      grams: 50,
      calories: 190,
      meal: "Breakfast",
      source: "food"
    });
    expect(entry.logId).toMatch(/^food-/);
  });
});

describe("saved meal totals", () => {
  it("adds up ingredients at their saved grams", () => {
    // oats 50 g = 190 kcal, banana 120 g = 105 kcal
    expect(getMealTotals(bowl.ingredients)).toEqual({
      grams: 170,
      calories: 295,
      protein: 8,
      carbs: 61,
      fat: 4
    });
  });

  it("formats the default grams for the input", () => {
    expect(getMealGramsInput(bowl)).toBe("170");
    expect(getMealGramsInput(undefined)).toBe("");
  });

  it("scales the whole meal to a new weight", () => {
    expect(getScaledMealTotals(bowl, 340)).toMatchObject({ grams: 340, calories: 590 });
  });
});

describe("createMealLogEntry", () => {
  it("logs a saved meal with scaled ingredients", () => {
    const entry = createMealLogEntry(bowl, 85, "Lunch");

    expect(entry).toMatchObject({
      id: "meal-1",
      name: "Oat bowl",
      brand: "Saved meal",
      serving: "85 g",
      baseGrams: 170,
      grams: 85,
      meal: "Lunch",
      source: "meal"
    });
    expect(entry.items).toHaveLength(2);
    expect(entry.items?.map((item) => item.grams)).toEqual([25, 60]);
    expect(entry.calories).toBe(
      (entry.items ?? []).reduce((sum, item) => sum + item.calories, 0)
    );
  });
});
