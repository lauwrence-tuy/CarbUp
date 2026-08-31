import { NextRequest, NextResponse } from "next/server";
import { searchFoodCatalog } from "@/lib/food-catalog";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));

  if (query.length < 2) {
    return NextResponse.json({ foods: [] });
  }

  try {
    const { foods, usedExternal } = await searchFoodCatalog({
      query,
      userId,
      limit: Number.isFinite(limitParam) ? limitParam : undefined
    });

    return NextResponse.json({ foods, usedExternal });
  } catch (error) {
    console.error("Food search failed", error);

    return NextResponse.json(
      { error: "Food search failed", foods: [] },
      { status: 502 }
    );
  }
}
