import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { listenForRequests, server } from "@/tests/msw/server";
import { STRAVA, stravaTokenResponse } from "@/tests/msw/fixtures";
import {
  exchangeAuthorizationCode,
  refreshStravaTokens,
  shouldRefreshToken,
  tokenExpiresAt
} from "./strava";

beforeAll(listenForRequests);
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("shouldRefreshToken", () => {
  const now = new Date("2026-06-30T12:00:00Z");
  const minutesFromNow = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

  it("keeps a token with more than an hour left", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(shouldRefreshToken(minutesFromNow(61))).toBe(false);
  });

  it("refreshes a token inside the one-hour buffer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(shouldRefreshToken(minutesFromNow(60))).toBe(true);
    expect(shouldRefreshToken(minutesFromNow(5))).toBe(true);
  });

  it("refreshes an already expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(shouldRefreshToken(minutesFromNow(-30))).toBe(true);
  });

  it("flips from keep to refresh as time passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const expiresAt = minutesFromNow(90);

    expect(shouldRefreshToken(expiresAt)).toBe(false);
    vi.advanceTimersByTime(31 * 60_000);
    expect(shouldRefreshToken(expiresAt)).toBe(true);
  });
});

describe("tokenExpiresAt", () => {
  it("converts Strava's unix seconds to a Date", () => {
    expect(tokenExpiresAt(1_782_820_800).toISOString()).toBe("2026-06-30T12:00:00.000Z");
  });
});

describe("Strava token requests", () => {
  it("exchanges an authorization code with the app's client credentials", async () => {
    let body: URLSearchParams | undefined;
    server.use(
      http.post(STRAVA.token, async ({ request }) => {
        body = new URLSearchParams(await request.text());
        return HttpResponse.json(stravaTokenResponse());
      })
    );

    const result = await exchangeAuthorizationCode("auth-code");

    expect(result.access_token).toBe("new-access-token");
    expect(Object.fromEntries(body!)).toEqual({
      client_id: "123456",
      client_secret: "test-strava-client-secret",
      code: "auth-code",
      grant_type: "authorization_code"
    });
  });

  it("sends the refresh token on refresh", async () => {
    let body: URLSearchParams | undefined;
    server.use(
      http.post(STRAVA.token, async ({ request }) => {
        body = new URLSearchParams(await request.text());
        return HttpResponse.json(stravaTokenResponse());
      })
    );

    await refreshStravaTokens("old-refresh-token");

    expect(body?.get("grant_type")).toBe("refresh_token");
    expect(body?.get("refresh_token")).toBe("old-refresh-token");
  });

  it("throws with Strava's status when the request fails", async () => {
    server.use(http.post(STRAVA.token, () => new HttpResponse("bad code", { status: 400 })));

    await expect(exchangeAuthorizationCode("bad")).rejects.toThrow(/400 bad code/);
  });

  it("throws before calling Strava when credentials are missing", async () => {
    vi.stubEnv("STRAVA_CLIENT_SECRET", undefined);

    await expect(refreshStravaTokens("x")).rejects.toThrow(/Missing STRAVA_CLIENT_ID/);
  });
});
