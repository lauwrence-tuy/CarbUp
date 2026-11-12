import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { POST as sync } from "@/app/api/strava/sync/route";
import { POST as disconnect } from "@/app/api/strava/disconnect/route";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { decryptToken, encryptToken } from "@/lib/token-crypto";
import { server } from "@/tests/msw/server";
import { STRAVA, stravaActivitiesHandler, stravaActivity, stravaTokenResponse } from "@/tests/msw/fixtures";
import { createUser, request, signInAs } from "./helpers/factories";

const DAY_MS = 24 * 60 * 60 * 1000;
const runSync = () => sync();

describe("POST /api/strava/sync", () => {
  it("requires a session", async () => {
    expect((await runSync()).status).toBe(401);
  });

  it("returns 404 when the session's user no longer exists", async () => {
    const user = await createUser();
    signInAs(user.id);
    await prisma.user.delete({ where: { id: user.id } });

    expect((await runSync()).status).toBe(404);
  });

  it("stores new activities, fetching detail only for those without calories", async () => {
    const user = await createUser();
    signInAs(user.id);
    const detailRequests: string[] = [];
    let authorization: string | null = null;
    server.use(
      stravaActivitiesHandler(
        [
          stravaActivity({ id: 1, calories: 650, suffer_score: 80 }),
          stravaActivity({ id: 2, name: "Evening Run", sport_type: "Run" })
        ],
        (req) => {
          authorization = req.headers.get("authorization");
        }
      ),
      http.get(STRAVA.activity, ({ params }) => {
        detailRequests.push(String(params.id));
        return HttpResponse.json(stravaActivity({ id: 2, name: "Evening Run", sport_type: "Run", calories: 480 }));
      })
    );

    const response = await runSync();

    expect(await response.json()).toEqual({ synced: 2 });
    expect(authorization).toBe("Bearer stored-access-token");
    expect(detailRequests).toEqual(["2"]);
    expect(
      await prisma.activity.findMany({
        where: { userId: user.id },
        orderBy: { stravaActivityId: "asc" },
        select: { stravaActivityId: true, type: true, calories: true, sufferScore: true }
      })
    ).toEqual([
      { stravaActivityId: "1", type: "Ride", calories: 650, sufferScore: 80 },
      { stravaActivityId: "2", type: "Run", calories: 480, sufferScore: null }
    ]);
  });

  it("is idempotent: syncing the same activities twice stores them once", async () => {
    const user = await createUser();
    signInAs(user.id);
    server.use(stravaActivitiesHandler([stravaActivity({ id: 7, calories: 300 })]));

    await runSync();
    await runSync();

    expect(await prisma.activity.count()).toBe(1);
  });

  it("applies renames from Strava without wiping stored calories", async () => {
    const user = await createUser();
    signInAs(user.id);
    server.use(stravaActivitiesHandler([stravaActivity({ id: 9, calories: 900 })]));
    await runSync();

    // Strava's summary has no calories, but the activity was renamed.
    server.use(stravaActivitiesHandler([stravaActivity({ id: 9, name: "Renamed ride" })]));
    await runSync();

    expect(await prisma.activity.findFirstOrThrow()).toMatchObject({ name: "Renamed ride", calories: 900 });
  });

  it("only asks Strava for the last week before the newest stored activity", async () => {
    const user = await createUser();
    signInAs(user.id);
    const newest = new Date(Date.now() - 3 * DAY_MS);
    await prisma.activity.create({
      data: {
        userId: user.id,
        stravaActivityId: "100",
        name: "Old ride",
        type: "Ride",
        startDate: newest,
        calories: 500
      }
    });
    let after = 0;
    server.use(
      stravaActivitiesHandler([], (req) => {
        after = Number(new URL(req.url).searchParams.get("after"));
      })
    );

    await runSync();

    expect(after).toBe(Math.floor(newest.getTime() / 1000) - 7 * 24 * 60 * 60);
  });

  it("refreshes an expiring token first and saves the new tokens encrypted", async () => {
    const user = await createUser({ tokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    signInAs(user.id);
    let refreshTokenSent: string | null = null;
    let authorization: string | null = null;
    server.use(
      http.post(STRAVA.token, async ({ request: req }) => {
        refreshTokenSent = new URLSearchParams(await req.text()).get("refresh_token");
        return HttpResponse.json(stravaTokenResponse({ access_token: "refreshed-token", refresh_token: "rotated-refresh" }));
      }),
      stravaActivitiesHandler([], (req) => {
        authorization = req.headers.get("authorization");
      })
    );

    expect((await runSync()).status).toBe(200);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshTokenSent).toBe("stored-refresh-token");
    expect(authorization).toBe("Bearer refreshed-token");
    expect(decryptToken(updated.accessToken)).toBe("refreshed-token");
    expect(decryptToken(updated.refreshToken)).toBe("rotated-refresh");
    expect(updated.tokenExpiresAt.getTime()).toBeGreaterThan(Date.now() + 5 * 60 * 60 * 1000);
  });

  it("stops calling the detail endpoint once Strava rate-limits, keeping the summaries", async () => {
    const user = await createUser();
    signInAs(user.id);
    let detailCalls = 0;
    server.use(
      stravaActivitiesHandler([stravaActivity({ id: 21 }), stravaActivity({ id: 22 })]),
      http.get(STRAVA.activity, () => {
        detailCalls += 1;
        return new HttpResponse(null, { status: 429 });
      })
    );

    await runSync();

    expect(detailCalls).toBeLessThanOrEqual(2);
    expect(await prisma.activity.count()).toBe(2);
  });

  it("stays under Strava's rate limit, then fetches the rest on the next sync", async () => {
    const user = await createUser();
    signInAs(user.id);
    const limit = 30;
    let used = 0;
    let throttled = 0;
    const summaries = Array.from({ length: 40 }, (_, i) =>
      stravaActivity({ id: 500 + i, start_date: new Date(Date.now() - (i + 1) * DAY_MS).toISOString() })
    );
    const rateLimitHeaders = () => ({
      "x-ratelimit-usage": `${used},${used}`,
      "x-ratelimit-limit": `${limit},1000`
    });
    server.use(
      http.get(STRAVA.activities, ({ request: req }) => {
        used += 1;
        const after = Number(new URL(req.url).searchParams.get("after")) * 1000;
        const page = Number(new URL(req.url).searchParams.get("page"));
        const hits = summaries.filter((a) => Date.parse(a.start_date) > after);
        return HttpResponse.json(page === 1 ? hits : [], { headers: rateLimitHeaders() });
      }),
      http.get(STRAVA.activity, ({ params }) => {
        used += 1;
        if (used > limit) {
          throttled += 1;
          return new HttpResponse(null, { status: 429 });
        }
        const summary = summaries.find((a) => a.id === Number(params.id));
        return HttpResponse.json({ ...summary, calories: 600 }, { headers: rateLimitHeaders() });
      })
    );
    const withCalories = () => prisma.activity.count({ where: { calories: { not: null } } });

    expect((await runSync()).status).toBe(200);
    expect(throttled).toBe(0);
    expect(used).toBeLessThanOrEqual(limit - 5);
    expect(await prisma.activity.count()).toBe(40);
    const afterFirst = await withCalories();
    expect(afterFirst).toBeLessThan(40);

    // A new 15-minute window: the next sync fetches only what is still missing.
    used = 0;
    expect((await runSync()).status).toBe(200);
    expect(throttled).toBe(0);
    expect(used).toBe(1 + (40 - afterFirst));
    expect(await withCalories()).toBe(40);
  }, 30_000);

  it("reports a Strava outage as a 500 without storing anything", async () => {
    const user = await createUser();
    signInAs(user.id);
    server.use(http.get(STRAVA.activities, () => new HttpResponse("down", { status: 503 })));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await runSync();

    expect(response.status).toBe(500);
    expect(await prisma.activity.count()).toBe(0);
  });
});

describe("POST /api/strava/disconnect", () => {
  const runDisconnect = () => disconnect(request("/api/strava/disconnect?connected=strava", { method: "POST" }));

  async function userWithData() {
    const user = await createUser({ accessToken: encryptToken("token-to-revoke") });
    await prisma.activity.create({
      data: { userId: user.id, stravaActivityId: "1", name: "Ride", type: "Ride", startDate: new Date() }
    });
    await prisma.foodLog.create({
      data: {
        userId: user.id,
        dateKey: "2026-06-30",
        meal: "Lunch",
        name: "Soup",
        serving: "1 bowl",
        baseGrams: 300,
        grams: 300,
        calories: 250,
        protein: 10,
        carbs: 30,
        fat: 8
      }
    });
    signInAs(user.id);
    return user;
  }

  it("revokes Strava access, deletes the user's data and clears the session", async () => {
    await userWithData();
    let revokedWith: string | null = null;
    server.use(
      http.post(STRAVA.deauthorize, ({ request: req }) => {
        revokedWith = req.headers.get("authorization");
        return HttpResponse.json({});
      })
    );

    const response = await runDisconnect();
    const target = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(target.pathname + target.search).toBe("/?disconnected=strava");
    expect(revokedWith).toBe("Bearer token-to-revoke");
    expect([await prisma.user.count(), await prisma.activity.count(), await prisma.foodLog.count()]).toEqual([0, 0, 0]);
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toMatchObject({ value: "", maxAge: 0 });
  });

  it("still deletes the data when Strava's revoke call fails", async () => {
    await userWithData();
    server.use(http.post(STRAVA.deauthorize, () => new HttpResponse(null, { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await runDisconnect();

    expect(await prisma.user.count()).toBe(0);
  });

  it("only clears the cookie when nobody is signed in", async () => {
    const other = await createUser();

    const response = await runDisconnect();

    expect(response.status).toBe(303);
    expect(await prisma.user.findUnique({ where: { id: other.id } })).not.toBeNull();
  });
});
