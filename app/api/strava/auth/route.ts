import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";

export const runtime = "nodejs";

function redirectWithConfigError(request: NextRequest, error: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("auth_error", error);

  return NextResponse.redirect(url);
}

function isPlaceholder(value: string) {
  return /your_|replace_|example|placeholder/i.test(value);
}

export async function GET(request: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const missingEnv = [
    "STRAVA_CLIENT_ID",
    "STRAVA_CLIENT_SECRET",
    "TOKEN_ENCRYPTION_KEY"
  ].filter((key) => !process.env[key]);
  const redirectUri =
    process.env.STRAVA_REDIRECT_URI ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/strava/callback`;

  if (missingEnv.length > 0 || !clientId) {
    return redirectWithConfigError(request, "missing_strava_config");
  }

  if (isPlaceholder(clientId) || !/^\d+$/.test(clientId)) {
    return redirectWithConfigError(request, "invalid_strava_client_id");
  }

  if (
    isPlaceholder(process.env.STRAVA_CLIENT_SECRET ?? "") ||
    isPlaceholder(process.env.TOKEN_ENCRYPTION_KEY ?? "")
  ) {
    return redirectWithConfigError(request, "invalid_strava_secret_config");
  }

  // OAuth state protects the callback from cross-site request forgery.
  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("strava_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/"
  });

  const url = new URL(STRAVA_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,activity:read_all");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
