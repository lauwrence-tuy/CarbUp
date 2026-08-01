import { prisma } from "./prisma";
import { decryptToken, encryptToken } from "./token-crypto";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const REFRESH_BUFFER_SECONDS = 60 * 60;

type StravaAthlete = {
  id: number;
  username?: string;
  firstname?: string;
  lastname?: string;
};

type StravaTokenResponse = {
  token_type: "Bearer";
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  athlete?: StravaAthlete;
  scope?: string;
};

type UserTokenFields = {
  id: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
};

function getStravaClientCredentials() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET.");
  }

  return { clientId, clientSecret };
}

async function postTokenRequest(params: Record<string, string>) {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(params)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Strava token request failed: ${response.status} ${body}`);
  }

  return (await response.json()) as StravaTokenResponse;
}

export async function exchangeAuthorizationCode(code: string) {
  const { clientId, clientSecret } = getStravaClientCredentials();

  return postTokenRequest({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code"
  });
}

export async function refreshStravaTokens(refreshToken: string) {
  const { clientId, clientSecret } = getStravaClientCredentials();

  return postTokenRequest({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
}

export function tokenExpiresAt(expiresAtSeconds: number) {
  return new Date(expiresAtSeconds * 1000);
}

export function shouldRefreshToken(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now() + REFRESH_BUFFER_SECONDS * 1000;
}

export async function getFreshStravaAccessToken(
  user: UserTokenFields
) {
  if (!shouldRefreshToken(user.tokenExpiresAt)) {
    return decryptToken(user.accessToken);
  }

  const currentRefreshToken = decryptToken(user.refreshToken);
  const refreshed = await refreshStravaTokens(currentRefreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      accessToken: encryptToken(refreshed.access_token),
      refreshToken: encryptToken(refreshed.refresh_token),
      tokenExpiresAt: tokenExpiresAt(refreshed.expires_at)
    }
  });

  return refreshed.access_token;
}
