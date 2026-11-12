import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { listenForRequests, server } from "@/tests/msw/server";
import { STRAVA } from "@/tests/msw/fixtures";
import { getStravaActivityVisualData } from "./strava-activity-detail";

beforeAll(listenForRequests);
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function mockStrava({
  detail = {},
  streams = {},
  detailStatus = 200,
  streamsStatus = 200
}: {
  detail?: Record<string, unknown>;
  streams?: Record<string, unknown>;
  detailStatus?: number;
  streamsStatus?: number;
}) {
  const seen: { auth?: string | null; keys?: string | null } = {};
  server.use(
    http.get(STRAVA.streams, ({ request }) => {
      seen.keys = new URL(request.url).searchParams.get("keys");
      return streamsStatus === 200
        ? HttpResponse.json(streams)
        : new HttpResponse(null, { status: streamsStatus });
    }),
    http.get(STRAVA.activity, ({ request }) => {
      seen.auth = request.headers.get("authorization");
      return detailStatus === 200
        ? HttpResponse.json(detail)
        : new HttpResponse(null, { status: detailStatus });
    })
  );

  return seen;
}

const load = () =>
  getStravaActivityVisualData({
    accessToken: "access-token",
    stravaActivityId: "42",
    fallbackDistanceMeters: null
  });

describe("getStravaActivityVisualData", () => {
  it("builds the route and charts from streams, in imperial units", async () => {
    const seen = mockStrava({
      detail: { distance: 1609.344, total_elevation_gain: 100 },
      streams: {
        distance: { data: [0, 804.672, 1609.344] },
        latlng: { data: [[37.1, -122.1], [37.2, -122.2], [37.3, -122.3]] },
        altitude: { data: [0, 10, 20] },
        velocity_smooth: { data: [5, 10, 15] },
        heartrate: { data: [120, 140, 160] },
        temp: { data: [0, 10, 20] }
      }
    });

    const data = await load();

    expect(seen.auth).toBe("Bearer access-token");
    expect(seen.keys).toContain("latlng");
    expect(data.route).toEqual([
      { lat: 37.1, lng: -122.1 },
      { lat: 37.2, lng: -122.2 },
      { lat: 37.3, lng: -122.3 }
    ]);
    expect(data.totalDistanceMiles).toBeCloseTo(1, 5);
    expect(data.totalElevationFeet).toBeCloseTo(328.084, 3);

    const chart = (label: string) => data.charts.find((c) => c.label === label)!;
    expect(chart("Elevation").points.map((p) => p.x)).toEqual([0, 0.5, 1]);
    expect(chart("Elevation").maxLabel).toBe("66");
    expect(chart("Speed").averageLabel).toBe("22.4");
    expect(chart("Heart Rate")).toMatchObject({ maxLabel: "160", averageLabel: "140" });
    expect(chart("Temperature").maxLabel).toBe("68");
    expect(chart("Power")).toMatchObject({ points: [], maxLabel: "--", averageLabel: "--" });
  });

  it("decodes the map polyline when there are no GPS streams", async () => {
    // Google's documented example polyline.
    mockStrava({
      detail: { map: { summary_polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" } },
      streamsStatus: 404
    });

    const data = await load();

    expect(data.route).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 }
    ]);
  });

  it("spreads points over the total distance when there is no distance stream", async () => {
    mockStrava({
      detail: { distance: 3218.688 },
      streams: { heartrate: { data: [100, 110, 120] } }
    });

    const data = await load();

    expect(data.charts.find((c) => c.label === "Heart Rate")!.points.map((p) => p.x)).toEqual([
      0, 1, 2
    ]);
  });

  it("thins long streams but keeps the final point", async () => {
    const samples = 5000;
    mockStrava({
      detail: {},
      streams: {
        distance: { data: Array.from({ length: samples }, (_, i) => i) },
        latlng: { data: Array.from({ length: samples }, (_, i) => [37 + i / 1e5, -122]) },
        heartrate: { data: Array.from({ length: samples }, (_, i) => 100 + (i % 50)) }
      }
    });

    const data = await load();
    const heartRate = data.charts.find((c) => c.label === "Heart Rate")!;

    expect(heartRate.points.length).toBeLessThanOrEqual(1001);
    expect(heartRate.points.at(-1)!.x).toBeCloseTo(4999 / 1609.344, 3);
    expect(data.route.length).toBeLessThanOrEqual(1401);
    expect(data.route.at(-1)!.lat).toBeCloseTo(37.04999, 5);
  });

  it("throws when Strava fails, so the failure is never cached", async () => {
    mockStrava({ detailStatus: 401 });

    await expect(load()).rejects.toThrow(/could not be loaded/);
  });
});
