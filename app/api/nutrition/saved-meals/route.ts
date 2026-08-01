import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];

  if (!name || ingredients.length === 0) {
    return NextResponse.json({ error: "Invalid meal" }, { status: 400 });
  }

  const meal = await prisma.savedMeal.create({
    data: {
      userId,
      name,
      ingredientsJson: JSON.stringify(ingredients)
    }
  });

  return NextResponse.json({ id: meal.id });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const mealId = String(body.mealId ?? "");

  if (!mealId) {
    return NextResponse.json({ error: "Missing meal id" }, { status: 400 });
  }

  await prisma.savedMeal.deleteMany({
    where: {
      id: mealId,
      userId
    }
  });

  return NextResponse.json({ ok: true });
}
