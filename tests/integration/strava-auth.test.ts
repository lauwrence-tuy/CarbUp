import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as startAuth } from "@/app/api/strava/auth/route";
import { GET as callback } from "@/app/api/strava/callback/route";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { decryptToken } from "@/lib/token-crypto";
import { server } from "@/tests/msw/server";
import { STRAVA, stravaActivitiesHandler, stravaActivity, stravaTokenResponse } from "@/tests/msw/fixtures";
import { request } from "./helpers/factories";
import { cookieJar } from "./helpers/next-headers";

afterEach(() => {
  vi.unstubAllEnvs();
});

function redirectTarget(response: Response) {
  return new URL(response.headers.get("location")!);
}

describe("GET /api/strava/auth", () => {
  it("redirects to Strava with the app's client id, scopes and a state cookie", async () => {
    const response = await startAuth(request("/api/strava/auth"));
    const target = redirectTarget(response);

    expect(target.origin + target.pathname).toBe("https://www.strava.com/oauth/authorize");
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      client_id: "123456",
      redirect_uri: "http://localhost:3000/api/strava/callback",
      response_type: "code",
      scope: "read,activity:read_all"
    });
    expect(target.searchParams.get("state")).toBe(cookieJar.get("strava_oauth_state"));
  });

  it("sends the user home with an error when Strava is not configured", async () => {
    vi.stubEnv("STRAVA_CLIENT_SECRET", undefined);

    const target = redirectTarget(await startAuth(request("/api/strava/auth")));

    expect(target.pathname).toBe("/");
    expect(target.searchParams.get("auth_error")).toBe("missing_strava_config");
  });

  it("catches a placeholder client id or secret left from .env.example", async () => {
    vi.stubEnv("STRAVA_CLIENT_ID", "your_numeric_strava_client_id");
    expect(redirectTarget(await startAuth(request("/api/strava/auth"))).searchParams.get("auth_error")).toBe(
      "invalid_strava_client_id"
    );

    vi.stubEnv("STRAVA_CLIENT_ID", "123456");
    vi.stubEnv("STRAVA_CLIENT_SECRET", "your_strava_client_secret");
    expect(redirectTarget(await startAuth(request("/api/strava/auth"))).searchParams.get("auth_error")).toBe(
      "invalid_strava_secret_config"
    );
  });
});

describe("GET /api/strava/callback", () => {
  const state = "state-123";
  const callbackFor = (params: Record<string, string>) =>
    callback(request(`/api/strava/callback?${new URLSearchParams(params)}`));
  const validParams = { code: "auth-code", state, scope: "read,activity:read_all" };

  function mockStravaLogin(activities = [stravaActivity({ id: 1, calories: 700 })]) {
    server.use(
      http.post(STRAVA.token, () => HttpResponse.json(stravaTokenResponse())),
      stravaActivitiesHandler(activities)
    );
  }

  it("creates the user with encrypted tokens, syncs activities and signs them in", async () => {
    cookieJar.set("strava_oauth_state", state);
    mockStravaLogin();

    const response = await callbackFor(validParams);
    const target = redirectTarget(response);
    const user = await prisma.user.findUniqueOrThrow({ where: { stravaId: "987654" } });

    expect(target.pathname + target.search).toBe("/dashboard?connected=strava");
    expect(user.accessToken).not.toContain("new-access-token");
    expect(decryptToken(user.accessToken)).toBe("new-access-token");
    expect(decryptToken(user.refreshToken)).toBe("new-refresh-token");
    expect(await prisma.activity.count({ where: { userId: user.id } })).toBe(1);

    const session = response.cookies.get(SESSION_COOKIE_NAME);
    expect(verifySessionToken(session!.value)?.userId).toBe(user.id);
    expect(session).toMatchObject({ httpOnly: true, sameSite: "lax" });
  });

  it("updates tokens for a returning athlete instead of creating a second user", async () => {
    cookieJar.set("strava_oauth_state", state);
    mockStravaLogin();
    await callbackFor(validParams);

    server.use(
      http.post(STRAVA.token, () =>
        HttpResponse.json(stravaTokenResponse({ access_token: "second-access-token" }))
      )
    );
    await callbackFor(validParams);

    const users = await prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(decryptToken(users[0].accessToken)).toBe("second-access-token");
  });

  it("rejects a callback whose state does not match the cookie (CSRF)", async () => {
    cookieJar.set("strava_oauth_state", "a-different-state");

    const target = redirectTarget(await callbackFor(validParams));

    expect(target.searchParams.get("auth_error")).toBe("invalid_state");
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a login without activity access", async () => {
    cookieJar.set("strava_oauth_state", state);

    const target = redirectTarget(await callbackFor({ ...validParams, scope: "read" }));

    expect(target.searchParams.get("auth_error")).toBe("missing_activity_scope");
  });

  it("passes on an error Strava reported (user pressed Cancel)", async () => {
    const target = redirectTarget(await callbackFor({ error: "access_denied" }));

    expect(target.searchParams.get("auth_error")).toBe("access_denied");
  });

  it("reports a failed token exchange and creates no user", async () => {
    cookieJar.set("strava_oauth_state", state);
    server.use(http.post(STRAVA.token, () => new HttpResponse("invalid code", { status: 400 })));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const target = redirectTarget(await callbackFor(validParams));

    expect(target.searchParams.get("auth_error")).toBe("token_exchange_failed");
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a token response without an athlete", async () => {
    cookieJar.set("strava_oauth_state", state);
    server.use(http.post(STRAVA.token, () => HttpResponse.json(stravaTokenResponse({ athlete: undefined }))));

    expect(redirectTarget(await callbackFor(validParams)).searchParams.get("auth_error")).toBe("missing_athlete");
  });

  it("still signs the user in when the first activity sync fails", async () => {
    cookieJar.set("strava_oauth_state", state);
    server.use(
      http.post(STRAVA.token, () => HttpResponse.json(stravaTokenResponse())),
      http.get(STRAVA.activities, () => new HttpResponse(null, { status: 503 }))
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await callbackFor(validParams);

    expect(redirectTarget(response).pathname).toBe("/dashboard");
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBeTruthy();
  });
});
