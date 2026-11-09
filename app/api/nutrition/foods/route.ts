import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createCustomFoodSchema,
  deleteCustomFoodSchema,
  updateCustomFoodSchema
} from "@/lib/api/nutrition-schemas";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { projectFood } from "@/lib/food-catalog";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(request, createCustomFoodSchema);

  if (!body.ok) {
    return body.response;
  }

  const parsed = body.data;

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

  const body = await parseJsonBody(request, updateCustomFoodSchema);

  if (!body.ok) {
    return body.response;
  }

  const { id, food: changes } = body.data;
  const updated = await prisma.food.updateMany({
    where: { id, createdBy: userId, source: "custom" },
    data: changes
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

  const body = await parseJsonBody(request, deleteCustomFoodSchema);

  if (!body.ok) {
    return body.response;
  }

  await prisma.food.deleteMany({
    where: { id: body.data.id, createdBy: userId, source: "custom" }
  });

  revalidatePath("/nutrition");

  return NextResponse.json({ ok: true });
}
