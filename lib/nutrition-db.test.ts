import { describe, expect, it } from "vitest";
import { foodLogRowToEntry, groupFoodLogsByDate, savedMealRowToRecord } from "./nutrition-db";

const row = {
  id: "log_1",
  foodId: null,
  name: "Oats",
  brand: null,
  serving: "40 g",
  baseGrams: 100,
  grams: 40,
  calories: 156,
  protein: 7,
  carbs: 27,
  fat: 3,
  itemsJson: null,
  meal: "Breakfast",
  source: "food"
};

describe("foodLogRowToEntry", () => {
  it("maps a database row to a diary entry", () => {
    expect(foodLogRowToEntry(row)).toMatchObject({
      id: "log_1",
      logId: "log_1",
      brand: "Saved food",
      items: undefined,
      meal: "Breakfast"
    });
  });

  it("keeps the catalog food id and parses meal items", () => {
    const entry = foodLogRowToEntry({
      ...row,
      foodId: "food_9",
      itemsJson: JSON.stringify([{ name: "Banana" }])
    });

    expect(entry.id).toBe("food_9");
    expect(entry.items).toEqual([{ name: "Banana" }]);
  });

  it("ignores corrupt item JSON", () => {
    expect(foodLogRowToEntry({ ...row, itemsJson: "{oops" }).items).toBeUndefined();
  });
});

describe("groupFoodLogsByDate", () => {
  it("groups entries by day, keeping order", () => {
    const grouped = groupFoodLogsByDate([
      { ...row, id: "a", dateKey: "2026-06-30" },
      { ...row, id: "b", dateKey: "2026-07-01" },
      { ...row, id: "c", dateKey: "2026-06-30" }
    ]);

    expect(Object.keys(grouped)).toEqual(["2026-06-30", "2026-07-01"]);
    expect(grouped["2026-06-30"].map((e) => e.logId)).toEqual(["a", "c"]);
  });
});

describe("savedMealRowToRecord", () => {
  it("parses ingredients, defaulting to none", () => {
    expect(savedMealRowToRecord({ id: "m", name: "Bowl", ingredientsJson: "[]" }).ingredients).toEqual([]);
    expect(savedMealRowToRecord({ id: "m", name: "Bowl", ingredientsJson: "bad" }).ingredients).toEqual([]);
  });
});
