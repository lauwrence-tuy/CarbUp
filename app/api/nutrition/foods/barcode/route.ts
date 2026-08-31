import { NextRequest, NextResponse } from "next/server";
import { lookupFoodByBarcode } from "@/lib/food-catalog";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";

  if (!/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  try {
    const food = await lookupFoodByBarcode({ code, userId });

    if (!food) {
      return NextResponse.json({ food: null }, { status: 404 });
    }

    return NextResponse.json({ food });
  } catch (error) {
    console.error("Barcode lookup failed", error);

    return NextResponse.json({ error: "Barcode lookup failed" }, { status: 502 });
  }
}
