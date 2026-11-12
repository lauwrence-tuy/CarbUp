import { describe, expect, it } from "vitest";
import { frequentFoodsFromLogs, recentFoodsFromLogs } from "./food-catalog";

type Log = Parameters<typeof recentFoodsFromLogs>[0][number];

function log(name: string, overrides: Partial<Log> = {}): Log {
  return {
    foodId: null,
    name,
    brand: null,
    serving: "",
    baseGrams: 100,
    grams: 50,
    calories: 200,
    protein: 10,
    carbs: 20,
    fat: 8,
    source: "food",
    ...overrides
  };
}

// Callers pass logs oldest-first.
describe("recentFoodsFromLogs", () => {
  it("lists distinct foods, newest first, skipping whole meals", () => {
    const foods = recentFoodsFromLogs([
      log("Oats"),
      log("Banana"),
      log("Lunch bowl", { source: "meal" }),
      log("oats")
    ]);

    expect(foods.map((f) => f.name)).toEqual(["oats", "Banana"]);
  });

  it("works out per-100 g values from the logged portion", () => {
    const [food] = recentFoodsFromLogs([log("Oats", { grams: 50, calories: 200, protein: 10 })]);

    expect(food).toMatchObject({
      id: "recent-oats|",
      brand: "Recent",
      serving: "50 g",
      per100g: { calories: 400, protein: 20 },
      servings: [
        { label: "50 g", grams: 50, isDefault: true },
        { label: "100 g", grams: 100, isDefault: false }
      ]
    });
  });

  it("keeps the catalog id when the log came from the catalog", () => {
    expect(recentFoodsFromLogs([log("Oats", { foodId: "food_1" })])[0].id).toBe("food_1");
  });

  it("stops at 20 foods", () => {
    const logs = Array.from({ length: 25 }, (_, i) => log(`Food ${i}`));

    expect(recentFoodsFromLogs(logs)).toHaveLength(20);
  });
});

describe("frequentFoodsFromLogs", () => {
  it("orders by how often a food was logged, ties going to the most recent", () => {
    const foods = frequentFoodsFromLogs([
      log("Oats"),
      log("Banana"),
      log("Rice"),
      log("Banana"),
      log("Lunch bowl", { source: "meal" }),
      log("Eggs")
    ]);

    expect(foods.map((f) => f.name)).toEqual(["Banana", "Eggs", "Rice", "Oats"]);
  });

  it("uses each food's latest portion", () => {
    const [food] = frequentFoodsFromLogs([
      log("Oats", { grams: 40, serving: "40 g" }),
      log("Oats", { grams: 80, serving: "80 g" })
    ]);

    expect(food.serving).toBe("80 g");
  });
});
