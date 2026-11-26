import { describe, expect, it } from "vitest";
import {
  getAiModel,
  isAiConfigured,
  mealCacheKey,
  MealParseError,
  normalizeMealText,
  validateParsedMeal,
  type LlmMeal,
  type LlmMealItem
} from "./meal-parser";

function item(overrides: Partial<LlmMealItem> = {}): LlmMealItem {
  return {
    name: "banana",
    searchTerm: "banana, raw",
    quantity: "1 medium",
    grams: 118,
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    ...overrides
  };
}

function meal(items: LlmMealItem[], overrides: Partial<LlmMeal> = {}): LlmMeal {
  return { title: "Snack", mealHint: null, items, notFood: [], ...overrides };
}

describe("validateParsedMeal", () => {
  it("keeps sensible items", () => {
    expect(validateParsedMeal(meal([item()])).items).toHaveLength(1);
  });

  it.each([
    ["zero grams", { grams: 0 }],
    ["negative grams", { grams: -10 }],
    ["an impossible weight", { grams: 5000 }],
    ["negative macros", { protein: -1 }],
    ["NaN calories", { calories: Number.NaN }],
    ["absurd calories", { calories: 9000 }],
    ["a blank search term", { searchTerm: "  " }]
  ])("drops an item with %s", (_label, overrides) => {
    const result = validateParsedMeal(meal([item(), item({ name: "bad", ...overrides })]));

    expect(result.items.map((entry) => entry.name)).toEqual(["banana"]);
  });

  it("rejects a parse with no usable food", () => {
    expect(() => validateParsedMeal(meal([]))).toThrow(MealParseError);
    expect(() => validateParsedMeal(meal([item({ grams: 0 })]))).toThrow(/No foods/);
  });

  it("drops an item the model repeated word for word", () => {
    const result = validateParsedMeal(
      meal([item(), item({ name: "Banana ", quantity: "1 MEDIUM" }), item({ grams: 236 })])
    );

    expect(result.items.map((entry) => entry.grams)).toEqual([118, 236]);
  });

  it("caps the number of items", () => {
    const many = Array.from({ length: 30 }, (_, i) => item({ name: `food ${i}` }));

    expect(validateParsedMeal(meal(many)).items).toHaveLength(20);
  });

  it("falls back to the first item's name for a blank title", () => {
    expect(validateParsedMeal(meal([item()], { title: " " })).title).toBe("banana");
  });
});

describe("cache keys", () => {
  it("ignore case and extra spaces", () => {
    expect(normalizeMealText("  Two  EGGS\nand toast ")).toBe("two eggs and toast");
    expect(mealCacheKey("m", "Two eggs")).toBe(mealCacheKey("m", " two   eggs "));
  });

  it("change with the model or the text", () => {
    expect(mealCacheKey("a", "eggs")).not.toBe(mealCacheKey("b", "eggs"));
    expect(mealCacheKey("a", "eggs")).not.toBe(mealCacheKey("a", "toast"));
  });
});

describe("configuration", () => {
  it("reads the model and key from the environment", () => {
    const saved = { model: process.env.ANTHROPIC_MODEL, key: process.env.ANTHROPIC_API_KEY };

    process.env.ANTHROPIC_MODEL = "claude-haiku-5-5";
    expect(getAiModel()).toBe("claude-haiku-5-5");
    delete process.env.ANTHROPIC_MODEL;
    expect(getAiModel()).toBe("claude-opus-5-5");

    process.env.ANTHROPIC_API_KEY = " ";
    expect(isAiConfigured()).toBe(false);

    process.env.ANTHROPIC_MODEL = saved.model;
    process.env.ANTHROPIC_API_KEY = saved.key;
    expect(isAiConfigured()).toBe(true);
  });
});
