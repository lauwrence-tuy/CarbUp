const STREAM_KEYS = [
  "time",
  "distance",
  "latlng",
  "altitude",
  "velocity_smooth",
  "heartrate",
  "cadence",
  "watts",
  "temp"
].join(",");

type Stream<T> = {
  data?: T[];
};

type StravaStreamResponse = {
  distance?: Stream<number>;
  latlng?: Stream<[number, number]>;
  altitude?: Stream<number>;
  velocity_smooth?: Stream<number>;
  heartrate?: Stream<number>;
  cadence?: Stream<number>;
  watts?: Stream<number>;
  temp?: Stream<number>;
};

type StravaActivityDetail = {
  distance?: number;
  total_elevation_gain?: number;
  average_speed?: number;
  max_speed?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  max_watts?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  max_cadence?: number;
  map?: {
    polyline?: string;
    summary_polyline?: string;
  };
};

export type LatLngPoint = {
  lat: number;
  lng: number;
};

export type ActivityChart = {
  label: string;
  unit: string;
  color: string;
  digits: number;
  points: Array<{
    x: number;
    y: number;
  }>;
  maxLabel: string;
  averageLabel: string;
};

export type ActivityVisualData = {
  route: LatLngPoint[];
  charts: ActivityChart[];
  totalDistanceMiles: number | null;
  totalElevationFeet: number | null;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function metersToMiles(meters: number) {
  return meters / 1609.344;
}

function metersToFeet(meters: number) {
  return meters * 3.28084;
}

function metersPerSecondToMilesPerHour(value: number) {
  return value * 2.236936;
}

function celsiusToFahrenheit(value: number) {
  return value * 1.8 + 32;
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function decodePolyline(polyline: string) {
  const points: LatLngPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < polyline.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = polyline.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;

    do {
      byte = polyline.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 100000, lng: lng / 100000 });
  }

  return points;
}

async function fetchActivityDetail(accessToken: string, stravaActivityId: string) {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${stravaActivityId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as StravaActivityDetail;
}

async function fetchActivityStreams(accessToken: string, stravaActivityId: string) {
  const url = new URL(
    `https://www.strava.com/api/v3/activities/${stravaActivityId}/streams`
  );
  url.searchParams.set("keys", STREAM_KEYS);
  url.searchParams.set("key_by_type", "true");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as StravaStreamResponse;
}

function buildPoints({
  values,
  distanceMeters,
  totalDistanceMeters,
  convert
}: {
  values?: number[];
  distanceMeters?: number[];
  totalDistanceMeters: number | null;
  convert: (value: number) => number;
}) {
  if (!values || values.length === 0) {
    return [];
  }

  return values
    .map((value, index) => {
      if (!isFiniteNumber(value)) {
        return null;
      }

      const distance =
        distanceMeters && distanceMeters.length === values.length
          ? distanceMeters[index]
          : totalDistanceMeters && values.length > 1
            ? (index / (values.length - 1)) * totalDistanceMeters
            : index;

      return {
        x: totalDistanceMeters ? metersToMiles(distance) : index,
        y: convert(value)
      };
    })
    .filter((point): point is { x: number; y: number } => Boolean(point));
}

function buildChart({
  label,
  unit,
  color,
  values,
  distanceMeters,
  totalDistanceMeters,
  convert,
  digits = 0
}: {
  label: string;
  unit: string;
  color: string;
  values?: number[];
  distanceMeters?: number[];
  totalDistanceMeters: number | null;
  convert: (value: number) => number;
  digits?: number;
}) {
  const points = buildPoints({
    values,
    distanceMeters,
    totalDistanceMeters,
    convert
  });
  const yValues = points.map((point) => point.y);
  const max = yValues.length > 0 ? Math.max(...yValues) : null;
  const avg = average(yValues);

  return {
    label,
    unit,
    color,
    digits,
    points,
    maxLabel: max == null ? "--" : formatNumber(max, digits),
    averageLabel: avg == null ? "--" : formatNumber(avg, digits)
  };
}

export async function getStravaActivityVisualData({
  accessToken,
  stravaActivityId,
  fallbackDistanceMeters
}: {
  accessToken: string;
  stravaActivityId: string;
  fallbackDistanceMeters: number | null;
}) {
  const [detail, streams] = await Promise.all([
    fetchActivityDetail(accessToken, stravaActivityId),
    fetchActivityStreams(accessToken, stravaActivityId)
  ]);
  const totalDistanceMeters =
    streams?.distance?.data?.at(-1) ??
    detail?.distance ??
    fallbackDistanceMeters ??
    null;
  const route =
    streams?.latlng?.data
      ?.filter(
        (point) =>
          Array.isArray(point) &&
          isFiniteNumber(point[0]) &&
          isFiniteNumber(point[1])
      )
      .map(([lat, lng]) => ({ lat, lng })) ??
    (detail?.map?.polyline || detail?.map?.summary_polyline
      ? decodePolyline(detail.map.polyline ?? detail.map.summary_polyline ?? "")
      : []);

  const charts = [
    buildChart({
      label: "Elevation",
      unit: "ft",
      color: "#d8dee6",
      values: streams?.altitude?.data,
      distanceMeters: streams?.distance?.data,
      totalDistanceMeters,
      convert: metersToFeet
    }),
    buildChart({
      label: "Speed",
      unit: "mi/h",
      color: "#38bdf8",
      values: streams?.velocity_smooth?.data,
      distanceMeters: streams?.distance?.data,
      totalDistanceMeters,
      convert: metersPerSecondToMilesPerHour,
      digits: 1
    }),
    buildChart({
      label: "Power",
      unit: "W",
      color: "#8b5cf6",
      values: streams?.watts?.data,
      distanceMeters: streams?.distance?.data,
      totalDistanceMeters,
      convert: (value) => value
    }),
    buildChart({
      label: "Heart Rate",
      unit: "bpm",
      color: "#ff3d71",
      values: streams?.heartrate?.data,
      distanceMeters: streams?.distance?.data,
      totalDistanceMeters,
      convert: (value) => value
    }),
    buildChart({
      label: "Cadence",
      unit: "rpm",
      color: "#ff38ff",
      values: streams?.cadence?.data,
      distanceMeters: streams?.distance?.data,
      totalDistanceMeters,
      convert: (value) => value
    }),
    buildChart({
      label: "Temperature",
      unit: "F",
      color: "#d7be66",
      values: streams?.temp?.data,
      distanceMeters: streams?.distance?.data,
      totalDistanceMeters,
      convert: celsiusToFahrenheit
    })
  ];

  return {
    route,
    charts,
    totalDistanceMiles: totalDistanceMeters
      ? metersToMiles(totalDistanceMeters)
      : null,
    totalElevationFeet: detail?.total_elevation_gain
      ? metersToFeet(detail.total_elevation_gain)
      : null
  } satisfies ActivityVisualData;
}
