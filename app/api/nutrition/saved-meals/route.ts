import { NextRequest, NextResponse } from "next/server";
import {
  createSavedMealSchema,
  deleteSavedMealSchema
} from "@/lib/api/nutrition-schemas";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, createSavedMealSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const meal = await prisma.savedMeal.create({
    data: {
      userId,
      name: parsed.data.name,
      ingredientsJson: JSON.stringify(parsed.data.ingredients)
    }
  });

  return NextResponse.json({ id: meal.id });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, deleteSavedMealSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  await prisma.savedMeal.deleteMany({
    where: {
      id: parsed.data.mealId,
      userId
    }
  });

  return NextResponse.json({ ok: true });
}
