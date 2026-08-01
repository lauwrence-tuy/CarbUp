import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { getFreshStravaAccessToken } from "@/lib/strava";
import { syncRecentStravaActivities } from "@/lib/strava-activities";

export const runtime = "nodejs";

export async function POST() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Connect Strava before syncing activities." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true
    }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  try {
    const accessToken = await getFreshStravaAccessToken(user);
    const synced = await syncRecentStravaActivities({ accessToken, userId });

    revalidatePath("/dashboard");
    revalidatePath("/trends");
    revalidatePath("/workouts");

    return NextResponse.json({
      synced
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unable to sync Strava activities." },
      { status: 500 }
    );
  }
}
