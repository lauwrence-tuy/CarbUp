import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { projectFood } from "@/lib/food-catalog";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type CustomFoodInput = {
  name?: unknown;
  brand?: unknown;
  caloriesPer100g?: unknown;
  proteinPer100g?: unknown;
  carbsPer100g?: unknown;
  fatPer100g?: unknown;
  defaultServingGrams?: unknown;
  defaultServingLabel?: unknown;
};

function nonNegative(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseCustomFood(body: CustomFoodInput) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const calories = nonNegative(body.caloriesPer100g);
  const protein = nonNegative(body.proteinPer100g);
  const carbs = nonNegative(body.carbsPer100g);
  const fat = nonNegative(body.fatPer100g);

  if (!name || calories == null || protein == null || carbs == null || fat == null) {
    return null;
  }

  const servingGrams = nonNegative(body.defaultServingGrams);

  return {
    name,
    brand:
      typeof body.brand === "string" && body.brand.trim()
        ? body.brand.trim()
        : null,
    caloriesPer100g: calories,
    proteinPer100g: protein,
    carbsPer100g: carbs,
    fatPer100g: fat,
    defaultServingGrams: servingGrams && servingGrams > 0 ? servingGrams : 100,
    defaultServingLabel:
      typeof body.defaultServingLabel === "string" &&
      body.defaultServingLabel.trim()
        ? body.defaultServingLabel.trim()
        : servingGrams && servingGrams > 0
          ? `${servingGrams} g`
          : "100 g"
  };
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseCustomFood(await request.json());

  if (!parsed) {
    return NextResponse.json({ error: "Invalid food" }, { status: 400 });
  }

  const food = await prisma.food.create({
    data: {
      source: "custom",
      createdBy: userId,
      verified: false,
      ...parsed,
      servings: {
        create:
          parsed.defaultServingGrams === 100
            ? [{ label: "100 g", grams: 100, isDefault: true }]
            : [
                {
                  label: parsed.defaultServingLabel,
                  grams: parsed.defaultServingGrams,
                  isDefault: true
                },
                { label: "100 g", grams: 100, isDefault: false }
              ]
      }
    },
    include: { servings: true }
  });

  revalidatePath("/nutrition");

  return NextResponse.json({ food: projectFood(food) });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "";
  const parsed = parseCustomFood(body);

  if (!id || !parsed) {
    return NextResponse.json({ error: "Invalid food" }, { status: 400 });
  }

  const updated = await prisma.food.updateMany({
    where: { id, createdBy: userId, source: "custom" },
    data: parsed
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const food = await prisma.food.findUnique({
    where: { id },
    include: { servings: true }
  });

  revalidatePath("/nutrition");

  return NextResponse.json({ food: food ? projectFood(food) : null });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "";

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.food.deleteMany({
    where: { id, createdBy: userId, source: "custom" }
  });

  revalidatePath("/nutrition");

  return NextResponse.json({ ok: true });
}
