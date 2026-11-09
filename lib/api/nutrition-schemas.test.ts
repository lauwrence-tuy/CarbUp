import { describe, expect, it } from "vitest";
import {
  createCustomFoodSchema,
  createFoodLogSchema,
  createSavedMealSchema,
  deleteFoodLogSchema,
  updateCustomFoodSchema
} from "./nutrition-schemas";

const validEntry = {
  id: "food-123",
  logId: "food-1700000000000-abc",
  name: "Banana",
  brand: "",
  meal: "Breakfast",
  source: "food",
  serving: "1 medium",
  grams: 118,
  baseGrams: 118,
  calories: 105.4,
  protein: 1.3,
  carbs: 27,
  fat: 0.4
};

describe("createFoodLogSchema", () => {
  it("accepts what the nutrition page sends and shapes it for the database", () => {
    const result = createFoodLogSchema.parse({ dateKey: "2026-11-09", entry: validEntry });

    expect(result).toEqual({
      dateKey: "2026-11-09",
      foodId: "food-123",
      meal: "Breakfast",
      source: "food",
      name: "Banana",
      brand: null,
      serving: "1 medium",
      baseGrams: 118,
      grams: 118,
      calories: 105,
      protein: 1,
      carbs: 27,
      fat: 0,
      itemsJson: null
    });
  });

  it("fills defaults for a quick-add entry with no grams", () => {
    const result = createFoodLogSchema.parse({
      dateKey: "2026-11-09",
      entry: { name: "Coffee", meal: "Snacks", calories: 5, protein: 0, carbs: 0, fat: 0 }
    });

    expect(result).toMatchObject({
      foodId: null,
      source: "food",
      serving: "0 g",
      baseGrams: 100,
      grams: 0
    });
  });

  it("stores meal items as JSON", () => {
    const result = createFoodLogSchema.parse({
      dateKey: "2026-11-09",
      entry: { ...validEntry, source: "meal", items: [{ name: "Oats" }] }
    });

    expect(result.itemsJson).toBe('[{"name":"Oats"}]');
  });

  it.each([
    ["a bad date", { dateKey: "11/09/2026", entry: validEntry }],
    ["an unknown meal", { dateKey: "2026-11-09", entry: { ...validEntry, meal: "Brunch" } }],
    ["a blank name", { dateKey: "2026-11-09", entry: { ...validEntry, name: "   " } }],
    ["negative calories", { dateKey: "2026-11-09", entry: { ...validEntry, calories: -10 } }],
    ["calories sent as text", { dateKey: "2026-11-09", entry: { ...validEntry, calories: "lots" } }],
    ["no entry", { dateKey: "2026-11-09" }]
  ])("rejects %s", (_label, body) => {
    expect(createFoodLogSchema.safeParse(body).success).toBe(false);
  });
});

describe("delete schemas", () => {
  it("requires a non-blank id", () => {
    expect(deleteFoodLogSchema.safeParse({ logId: "abc" }).success).toBe(true);
    expect(deleteFoodLogSchema.safeParse({ logId: "  " }).success).toBe(false);
    expect(deleteFoodLogSchema.safeParse({}).success).toBe(false);
  });
});

describe("createSavedMealSchema", () => {
  it("keeps the full ingredient objects", () => {
    const ingredient = { food: { ...validEntry }, grams: 50 };
    const result = createSavedMealSchema.parse({ name: " Breakfast bowl ", ingredients: [ingredient] });

    expect(result.name).toBe("Breakfast bowl");
    expect(result.ingredients[0]).toEqual(ingredient);
  });

  it("rejects a meal with no ingredients", () => {
    expect(createSavedMealSchema.safeParse({ name: "Empty", ingredients: [] }).success).toBe(false);
  });
});

describe("custom food schemas", () => {
  const fields = {
    name: "Protein bar",
    brand: " Acme ",
    caloriesPer100g: 400,
    proteinPer100g: 33,
    carbsPer100g: 40,
    fatPer100g: 12
  };

  it("defaults the serving to 100 g", () => {
    expect(createCustomFoodSchema.parse(fields)).toEqual({
      ...fields,
      brand: "Acme",
      defaultServingGrams: 100,
      defaultServingLabel: "100 g"
    });
  });

  it("labels a custom serving by its grams when no label is given", () => {
    const result = createCustomFoodSchema.parse({ ...fields, defaultServingGrams: 60 });

    expect(result.defaultServingLabel).toBe("60 g");
  });

  it("splits the id out for updates", () => {
    const result = updateCustomFoodSchema.parse({ ...fields, id: "food-1" });

    expect(result.id).toBe("food-1");
    expect(result.food.name).toBe("Protein bar");
  });

  it("rejects missing or negative macros", () => {
    expect(createCustomFoodSchema.safeParse({ ...fields, fatPer100g: undefined }).success).toBe(false);
    expect(createCustomFoodSchema.safeParse({ ...fields, carbsPer100g: -1 }).success).toBe(false);
  });
});
