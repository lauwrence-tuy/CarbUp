import { describe, expect, it } from "vitest";
import * as savedMeals from "@/app/api/nutrition/saved-meals/route";
import * as foods from "@/app/api/nutrition/foods/route";
import { prisma } from "@/lib/prisma";
import { createUser, request, signInAs } from "./helpers/factories";

const meal = {
  name: "Oat bowl",
  ingredients: [
    { food: { id: "f1", name: "Oats" }, grams: 60 },
    { food: { id: "f2", name: "Banana" }, grams: 120 }
  ]
};

const customFood = {
  name: "Homemade granola",
  brand: "My kitchen",
  caloriesPer100g: 450,
  proteinPer100g: 12,
  carbsPer100g: 55,
  fatPer100g: 20,
  defaultServingGrams: 45,
  defaultServingLabel: "1/2 cup"
};

describe("/api/nutrition/saved-meals", () => {
  const save = (body: unknown) =>
    savedMeals.POST(request("/api/nutrition/saved-meals", { method: "POST", body }));
  const remove = (body: unknown) =>
    savedMeals.DELETE(request("/api/nutrition/saved-meals", { method: "DELETE", body }));

  it("saves a meal with its ingredients", async () => {
    const user = await createUser();
    signInAs(user.id);

    const { id } = await (await save(meal)).json();
    const row = await prisma.savedMeal.findUniqueOrThrow({ where: { id } });

    expect(row).toMatchObject({ userId: user.id, name: "Oat bowl" });
    expect(JSON.parse(row.ingredientsJson)).toEqual(meal.ingredients);
  });

  it("rejects a meal with no ingredients", async () => {
    const user = await createUser();
    signInAs(user.id);

    expect((await save({ name: "Empty", ingredients: [] })).status).toBe(400);
  });

  it("deletes only the user's own meal", async () => {
    const owner = await createUser();
    signInAs(owner.id);
    const { id } = await (await save(meal)).json();

    const other = await createUser();
    signInAs(other.id);
    await remove({ mealId: id });
    expect(await prisma.savedMeal.count()).toBe(1);

    signInAs(owner.id);
    await remove({ mealId: id });
    expect(await prisma.savedMeal.count()).toBe(0);
  });

  it("requires a session", async () => {
    expect((await save(meal)).status).toBe(401);
    expect((await remove({ mealId: "x" })).status).toBe(401);
  });
});

describe("/api/nutrition/foods (custom foods)", () => {
  const create = (body: unknown) => foods.POST(request("/api/nutrition/foods", { method: "POST", body }));
  const update = (body: unknown) => foods.PATCH(request("/api/nutrition/foods", { method: "PATCH", body }));
  const remove = (body: unknown) => foods.DELETE(request("/api/nutrition/foods", { method: "DELETE", body }));

  it("creates a private food with its serving and a 100 g serving", async () => {
    const user = await createUser();
    signInAs(user.id);

    const { food } = await (await create(customFood)).json();
    const row = await prisma.food.findUniqueOrThrow({
      where: { id: food.id },
      include: { servings: true }
    });

    expect(row).toMatchObject({ source: "custom", createdBy: user.id, verified: false });
    expect(row.servings.map((s) => [s.label, s.grams, s.isDefault]).sort()).toEqual([
      ["1/2 cup", 45, true],
      ["100 g", 100, false]
    ]);
  });

  it("creates a single 100 g serving when no serving is given", async () => {
    const user = await createUser();
    signInAs(user.id);
    const per100g = { ...customFood, defaultServingGrams: undefined, defaultServingLabel: undefined };

    const { food } = await (await create(per100g)).json();

    expect(await prisma.foodServing.count({ where: { foodId: food.id } })).toBe(1);
  });

  it("updates the owner's food", async () => {
    const user = await createUser();
    signInAs(user.id);
    const { food } = await (await create(customFood)).json();

    const response = await update({ ...customFood, id: food.id, caloriesPer100g: 470 });

    expect(response.status).toBe(200);
    expect((await response.json()).food.per100g.calories).toBe(470);
  });

  it("returns 404 when editing someone else's food, and leaves it unchanged", async () => {
    const owner = await createUser();
    signInAs(owner.id);
    const { food } = await (await create(customFood)).json();

    signInAs((await createUser()).id);
    const response = await update({ ...customFood, id: food.id, caloriesPer100g: 1 });

    expect(response.status).toBe(404);
    expect((await prisma.food.findUniqueOrThrow({ where: { id: food.id } })).caloriesPer100g).toBe(450);
  });

  it("deletes only the owner's food", async () => {
    const owner = await createUser();
    signInAs(owner.id);
    const { food } = await (await create(customFood)).json();

    signInAs((await createUser()).id);
    await remove({ id: food.id });
    expect(await prisma.food.count()).toBe(1);

    signInAs(owner.id);
    await remove({ id: food.id });
    expect(await prisma.food.count()).toBe(0);
  });

  it("rejects negative macros and requires a session", async () => {
    expect((await create(customFood)).status).toBe(401);

    signInAs((await createUser()).id);
    expect((await create({ ...customFood, fatPer100g: -1 })).status).toBe(400);
  });
});
