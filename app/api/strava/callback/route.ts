import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncRecentStravaActivities } from "@/lib/strava-activities";
import { exchangeAuthorizationCode, tokenExpiresAt } from "@/lib/strava";
import { encryptToken } from "@/lib/token-crypto";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME
} from "@/lib/session";

export const runtime = "nodejs";

const REQUIRED_ACTIVITY_SCOPES = new Set(["activity:read", "activity:read_all"]);

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("auth_error", error);

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const grantedScope = searchParams.get("scope") ?? "";
  const cookieStore = await cookies();
  const storedState = cookieStore.get("strava_oauth_state")?.value;

  if (error) {
    return redirectWithError(request, error);
  }

  if (!code || !state || !storedState || state !== storedState) {
    return redirectWithError(request, "invalid_state");
  }

  const grantedScopes = new Set(grantedScope.split(/[,\s]+/).filter(Boolean));
  const hasActivityScope = [...REQUIRED_ACTIVITY_SCOPES].some((scope) =>
    grantedScopes.has(scope)
  );

  if (!hasActivityScope) {
    return redirectWithError(request, "missing_activity_scope");
  }

  try {
    const tokenResponse = await exchangeAuthorizationCode(code);

    if (!tokenResponse.athlete?.id) {
      return redirectWithError(request, "missing_athlete");
    }

    const user = await prisma.user.upsert({
      where: {
        stravaId: String(tokenResponse.athlete.id)
      },
      update: {
        accessToken: encryptToken(tokenResponse.access_token),
        refreshToken: encryptToken(tokenResponse.refresh_token),
        tokenExpiresAt: tokenExpiresAt(tokenResponse.expires_at)
      },
      create: {
        stravaId: String(tokenResponse.athlete.id),
        accessToken: encryptToken(tokenResponse.access_token),
        refreshToken: encryptToken(tokenResponse.refresh_token),
        tokenExpiresAt: tokenExpiresAt(tokenResponse.expires_at)
      }
    });

    const response = NextResponse.redirect(
      new URL("/dashboard?connected=strava", request.url)
    );

    try {
      await syncRecentStravaActivities({
        accessToken: tokenResponse.access_token,
        userId: user.id
      });
    } catch (syncError) {
      console.error(syncError);
    }

    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken(user.id),
      getSessionCookieOptions()
    );
    response.cookies.delete("strava_oauth_state");

    return response;
  } catch (oauthError) {
    console.error(oauthError);
    return redirectWithError(request, "token_exchange_failed");
  }
}
