import { describe, expect, it } from "vitest";
import { revalidatePath } from "next/cache";
import { DELETE, POST } from "@/app/api/nutrition/logs/route";
import { prisma } from "@/lib/prisma";
import { createCatalogFood, createUser, request, signInAs } from "./helpers/factories";

const entry = {
  name: "Rolled oats",
  meal: "Breakfast",
  grams: 40,
  baseGrams: 100,
  calories: 155.6,
  protein: 6.8,
  carbs: 26.5,
  fat: 2.8
};

const postLog = (body: unknown) => POST(request("/api/nutrition/logs", { method: "POST", body }));
const deleteLog = (body: unknown) => DELETE(request("/api/nutrition/logs", { method: "DELETE", body }));

describe("POST /api/nutrition/logs", () => {
  it("rejects a request without a session", async () => {
    const response = await postLog({ dateKey: "2026-06-30", entry });

    expect(response.status).toBe(401);
    expect(await prisma.foodLog.count()).toBe(0);
  });

  it("rejects an invalid body with the field errors", async () => {
    const user = await createUser();
    signInAs(user.id);

    const response = await postLog({ dateKey: "06/30/2026", entry: { ...entry, meal: "Brunch" } });

    expect(response.status).toBe(400);
    expect(await prisma.foodLog.count()).toBe(0);
  });

  it("saves the entry for the signed-in user with rounded macros", async () => {
    const user = await createUser();
    signInAs(user.id);

    const response = await postLog({ dateKey: "2026-06-30", entry });
    const { id } = await response.json();

    expect(response.status).toBe(200);
    expect(await prisma.foodLog.findUniqueOrThrow({ where: { id } })).toMatchObject({
      userId: user.id,
      dateKey: "2026-06-30",
      meal: "Breakfast",
      serving: "40 g",
      calories: 156,
      protein: 7,
      carbs: 27,
      fat: 3
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("counts a use of the catalog food for search ranking", async () => {
    const user = await createUser();
    const food = await createCatalogFood();
    signInAs(user.id);

    await postLog({ dateKey: "2026-06-30", entry: { ...entry, id: food.id } });
    await postLog({ dateKey: "2026-07-01", entry: { ...entry, id: food.id } });

    expect((await prisma.food.findUniqueOrThrow({ where: { id: food.id } })).usageCount).toBe(2);
  });

  it("still saves when the food id is not a catalog food", async () => {
    const user = await createUser();
    signInAs(user.id);

    const response = await postLog({ dateKey: "2026-06-30", entry: { ...entry, id: "recent-123" } });

    expect(response.status).toBe(200);
    expect(await prisma.foodLog.count()).toBe(1);
  });
});

describe("DELETE /api/nutrition/logs", () => {
  it("deletes the user's own entry", async () => {
    const user = await createUser();
    signInAs(user.id);
    const { id } = await (await postLog({ dateKey: "2026-06-30", entry })).json();

    const response = await deleteLog({ logId: id });

    expect(response.status).toBe(200);
    expect(await prisma.foodLog.count()).toBe(0);
  });

  it("never deletes another user's entry", async () => {
    const owner = await createUser();
    signInAs(owner.id);
    const { id } = await (await postLog({ dateKey: "2026-06-30", entry })).json();

    const intruder = await createUser();
    signInAs(intruder.id);
    const response = await deleteLog({ logId: id });

    expect(response.status).toBe(200);
    expect(await prisma.foodLog.count()).toBe(1);
  });

  it("rejects a request without a session", async () => {
    expect((await deleteLog({ logId: "x" })).status).toBe(401);
  });
});
