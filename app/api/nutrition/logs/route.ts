import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const entry = body.entry;
  const dateKey = String(body.dateKey ?? "");

  if (!dateKey || !entry?.name || !entry?.meal) {
    return NextResponse.json({ error: "Invalid food log" }, { status: 400 });
  }

  const row = await prisma.foodLog.create({
    data: {
      userId,
      dateKey,
      meal: String(entry.meal),
      source: String(entry.source ?? "food"),
      foodId: typeof entry.id === "string" ? entry.id : null,
      name: String(entry.name),
      brand: typeof entry.brand === "string" ? entry.brand : null,
      serving: String(entry.serving ?? `${Math.round(Number(entry.grams) || 0)} g`),
      baseGrams: Number(entry.baseGrams) || Number(entry.grams) || 100,
      grams: Number(entry.grams) || 0,
      calories: Math.round(Number(entry.calories) || 0),
      protein: Math.round(Number(entry.protein) || 0),
      carbs: Math.round(Number(entry.carbs) || 0),
      fat: Math.round(Number(entry.fat) || 0),
      itemsJson: entry.items ? JSON.stringify(entry.items) : null
    }
  });

  return NextResponse.json({ id: row.id });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const logId = String(body.logId ?? "");

  if (!logId) {
    return NextResponse.json({ error: "Missing log id" }, { status: 400 });
  }

  await prisma.foodLog.deleteMany({
    where: {
      id: logId,
      userId
    }
  });

  return NextResponse.json({ ok: true });
}
