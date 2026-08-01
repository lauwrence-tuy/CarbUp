import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUserId,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME
} from "@/lib/session";
import { getFreshStravaAccessToken } from "@/lib/strava";

export const runtime = "nodejs";

const STRAVA_DEAUTHORIZE_URL = "https://www.strava.com/oauth/deauthorize";

async function revokeStravaAccess(userId: string) {
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
    return;
  }

  const accessToken = await getFreshStravaAccessToken(user);

  const response = await fetch(STRAVA_DEAUTHORIZE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Strava deauthorize failed: ${response.status} ${body}`);
  }
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (userId) {
    try {
      await revokeStravaAccess(userId);
    } catch (error) {
      console.error(error);
    }

    await prisma.user.deleteMany({
      where: { id: userId }
    });
  }

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("disconnected", "strava");
  redirectUrl.searchParams.delete("auth_error");
  redirectUrl.searchParams.delete("connected");

  const response = NextResponse.redirect(redirectUrl, {
    status: 303
  });

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0
  });
  response.cookies.delete("strava_oauth_state");

  return response;
}
