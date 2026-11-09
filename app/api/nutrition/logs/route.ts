import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createFoodLogSchema,
  deleteFoodLogSchema
} from "@/lib/api/nutrition-schemas";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, createFoodLogSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const log = parsed.data;
  const row = await prisma.foodLog.create({
    data: { userId, ...log }
  });

  // Best-effort popularity signal for search ranking / the Frequent tab.
  // updateMany is a no-op when the id isn't a real catalog Food (e.g. a
  // synthetic "recent-..." id), and a failure here must not fail the log.
  if (log.foodId) {
    try {
      await prisma.food.updateMany({
        where: { id: log.foodId },
        data: { usageCount: { increment: 1 } }
      });
    } catch {
      // ignore
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/nutrition");

  return NextResponse.json({ id: row.id });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, deleteFoodLogSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  await prisma.foodLog.deleteMany({
    where: {
      id: parsed.data.logId,
      userId
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/nutrition");

  return NextResponse.json({ ok: true });
}
