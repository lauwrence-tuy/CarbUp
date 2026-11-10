"use client";

import Link from "next/link";
import {
  type PointerEvent,
  type WheelEvent,
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { ArrowLeft, Bike } from "lucide-react";
import { Column, Grid, Tile } from "@carbon/react";
import type {
  ActivityChart,
  ActivityVisualData,
  LatLngPoint
} from "@/lib/strava-activity-detail";
import { PageShell, PageTitle, StatTile } from "@/components/carbon/page-shell";
import { SkeletonBlock, SkeletonStat, SkeletonTile } from "@/components/carbon/skeleton";

// Route map colors. Strava-style orange route on a dark slate base, kept
// separate from the app theme so the map reads like a map.
const MAP_COLORS = {
  background: "#0f172a",
  route: "#ff5a1f",
  outline: "#ffffff",
  start: "#22c55e",
  end: "#ff5a1f",
  hover: "#0ea5e9"
} as const;

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 420;
const TILE_SIZE = 256;
const MIN_MAP_ZOOM = 3;
const MAX_MAP_ZOOM = 17;
const MAX_CHART_POINTS = 520;
const MAX_ROUTE_POINTS = 1400;

type ActivityDetailPageProps = {
  activity: {
    name: string;
    type: string;
    dateLabel: string;
    startTime: string;
    calories: number | null;
    durationLabel: string;
    distanceLabel: string;
    effort: number;
  };
  /** Streamed from the server: stats render first, map and charts follow. */
  visualData: Promise<ActivityVisualData | null>;
};

type ProjectedPoint = {
  x: number;
  y: number;
};

type MapTile = {
  key: string;
  href: string;
  x: number;
  y: number;
};

type MapView = {
  center: ProjectedPoint;
  zoom: number;
};

type MapDragState = {
  center: ProjectedPoint;
  pointerId: number;
  startX: number;
  startY: number;
};

type ChartDomain = {
  minX: number;
  maxX: number;
};

function formatElevationValue(value: number | null) {
  return value == null ? "--" : `${Math.round(value).toLocaleString()} ft`;
}

function formatChartValue(value: number | null, digits: number) {
  if (value == null) {
    return "--";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function samplePoints<T>(points: T[], maxPoints: number) {
  if (points.length <= maxPoints) {
    return points;
  }

  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % step === 0);
}

function latLngToWorld(point: LatLngPoint, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = Math.max(Math.min(point.lat, 85.05112878), -85.05112878);
  const sinLat = Math.sin((lat * Math.PI) / 180);

  return {
    x: ((point.lng + 180) / 360) * scale,
    y:
      (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  };
}

function getRouteWorldBounds(route: LatLngPoint[], zoom: number) {
  const worldPoints = route.map((point) => latLngToWorld(point, zoom));
  const xs = worldPoints.map((point) => point.x);
  const ys = worldPoints.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

function chooseZoom(route: LatLngPoint[]) {
  if (route.length < 2) {
    return 11;
  }

  for (let zoom = 14; zoom >= 3; zoom -= 1) {
    const bounds = getRouteWorldBounds(route, zoom);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    if (width <= MAP_WIDTH * 0.74 && height <= MAP_HEIGHT * 0.68) {
      return zoom;
    }
  }

  return 3;
}

function clampZoom(zoom: number) {
  return Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, zoom));
}

function clampMapCenter(center: ProjectedPoint, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const halfHeight = MAP_HEIGHT / 2;

  return {
    x: center.x,
    y: Math.max(halfHeight, Math.min(scale - halfHeight, center.y))
  };
}

function buildRoutePath(points: ProjectedPoint[]) {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    )
    .join(" ");
}

function getChartPath(
  points: ActivityChart["points"],
  width: number,
  height: number
) {
  if (points.length === 0) {
    return "";
  }

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xRange = Math.max(maxX - minX, 1);
  const yRange = Math.max(maxY - minY, 1);
  const padTop = 12;
  const padBottom = 14;
  const chartHeight = height - padTop - padBottom;

  return samplePoints(points, MAX_CHART_POINTS)
    .map((point, index) => {
      const x = ((point.x - minX) / xRange) * width;
      const y = padTop + (1 - (point.y - minY) / yRange) * chartHeight;

      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function getChartDomain(points: ActivityChart["points"]): ChartDomain | null {
  if (points.length === 0) {
    return null;
  }

  return points.reduce<ChartDomain>(
    (domain, point) => ({
      minX: Math.min(domain.minX, point.x),
      maxX: Math.max(domain.maxX, point.x)
    }),
    { minX: points[0].x, maxX: points[0].x }
  );
}

function getPointAtRatio(
  points: ActivityChart["points"],
  ratio: number | null,
  domain: ChartDomain | null
) {
  if (ratio == null || !domain || points.length === 0) {
    return null;
  }

  const { minX, maxX } = domain;
  const targetX = minX + (maxX - minX) * ratio;
  let low = 0;
  let high = points.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (points[middle].x < targetX) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const current = points[low];
  const previous = points[Math.max(0, low - 1)];

  return Math.abs(previous.x - targetX) <= Math.abs(current.x - targetX)
    ? previous
    : current;
}

function getHoverRatio(event: PointerEvent<Element>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;

  return Math.min(Math.max(ratio, 0), 1);
}

export function ActivityDetailPage({
  activity,
  visualData
}: ActivityDetailPageProps) {
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const latestHoverRatioRef = useRef<number | null>(null);
  const handleHoverRatioChange = useCallback((ratio: number | null) => {
    latestHoverRatioRef.current = ratio;

    if (frameRef.current != null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      setHoverRatio(latestHoverRatioRef.current);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <PageShell isConnected>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <Link
            href="/workouts"
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-cds-layer px-4 text-sm font-bold text-cds-text-secondary transition hover:bg-cds-layer-hover hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Workouts
          </Link>
        </Column>
      </Grid>

      <div className="mt-6">
        <PageTitle
          label={activity.type}
          title={activity.name}
          description={`${activity.dateLabel} at ${activity.startTime}`}
        />
      </div>

      <Grid className="mt-8">
        <Column sm={4} md={8} lg={16}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Calories"
              value={
                activity.calories == null
                  ? "—"
                  : activity.calories.toLocaleString("en-US")
              }
              helper="activity burn"
              accent
            />
            <StatTile label="Duration" value={activity.durationLabel} helper="moving time" />
            <StatTile label="Distance" value={activity.distanceLabel} helper="route distance" />
            <Suspense fallback={<SkeletonStat />}>
              <ElevationTile visualData={visualData} effort={activity.effort} />
            </Suspense>
          </div>

          <Suspense fallback={<ActivityVisualsSkeleton />}>
            <ActivityVisuals
              visualData={visualData}
              hoverRatio={hoverRatio}
              onHoverRatioChange={handleHoverRatioChange}
            />
          </Suspense>
        </Column>
      </Grid>
    </PageShell>
  );
}

function ElevationTile({
  visualData,
  effort
}: {
  visualData: Promise<ActivityVisualData | null>;
  effort: number;
}) {
  const data = use(visualData);

  return (
    <StatTile
      label="Elevation"
      value={formatElevationValue(data?.totalElevationFeet ?? null)}
      helper={`effort ${effort}`}
    />
  );
}

/** Route map and metric streams, shown once Strava (or the cache) answers. */
function ActivityVisuals({
  visualData,
  hoverRatio,
  onHoverRatioChange
}: {
  visualData: Promise<ActivityVisualData | null>;
  hoverRatio: number | null;
  onHoverRatioChange: (ratio: number | null) => void;
}) {
  const data = use(visualData);
  const metricCharts = data?.charts ?? [];

  return (
    <>

          <Tile className="mt-4 overflow-hidden !p-0">
            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <div>
                <h2 className="cu-heading-02">Route map</h2>
                <p className="cu-helper mt-1">
                  {data?.route.length
                    ? "Synced from Strava GPS data"
                    : data
                      ? "No route stream available"
                      : "Strava didn’t return this activity’s data. Try again later."}
                </p>
              </div>
            </div>
            <ActivityRouteMap hoverRatio={hoverRatio} route={data?.route ?? []} />
          </Tile>

          <Tile className="mt-4 overflow-hidden !p-0">
            <div className="grid border-b border-[color:var(--cds-border-subtle-00)] px-6 py-4 sm:grid-cols-[160px_minmax(0,1fr)_110px]">
              <div className="cu-label">Metric</div>
              <div className="cu-label hidden sm:block">Activity stream</div>
              <div className="cu-label hidden text-right sm:block">Max / avg</div>
            </div>
            <div className="divide-y divide-[color:var(--cds-border-subtle-00)]">
              {metricCharts.map((chart) => (
                <MetricStreamRow
                  key={chart.label}
                  chart={chart}
                  hoverRatio={hoverRatio}
                  onHoverRatioChange={onHoverRatioChange}
                />
              ))}
            </div>
          </Tile>
    </>
  );
}

function ActivityVisualsSkeleton() {
  return (
    <>
      <SkeletonTile className="mt-4 !p-0">
        <div className="px-6 py-5">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-3 h-3 w-48" />
        </div>
        <div className="aspect-[1200/420] w-full rounded-b-[28px] bg-white/[0.03] motion-safe:animate-pulse" />
      </SkeletonTile>
      <SkeletonTile className="mt-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-center gap-6 py-4">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-10 flex-1 !rounded-xl" />
          </div>
        ))}
      </SkeletonTile>
    </>
  );
}

function ActivityRouteMap({
  hoverRatio,
  route
}: {
  hoverRatio: number | null;
  route: LatLngPoint[];
}) {
  const routeBase = useMemo(() => {
    if (route.length < 2) {
      return null;
    }

    const sampledRoute = samplePoints(route, MAX_ROUTE_POINTS);
    const zoom = chooseZoom(sampledRoute);
    const bounds = getRouteWorldBounds(sampledRoute, zoom);
    const center = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    };

    return {
      initialView: {
        center,
        zoom
      },
      sampledRoute
    };
  }, [route]);

  const [mapView, setMapView] = useState<MapView | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showControlsHint, setShowControlsHint] = useState(true);
  const dragRef = useRef<MapDragState | null>(null);

  useEffect(() => {
    setMapView(routeBase?.initialView ?? null);
    setShowControlsHint(true);
  }, [routeBase]);

  const activeView = mapView ?? routeBase?.initialView ?? null;

  const mapData = useMemo(() => {
    if (!routeBase || !activeView) {
      return null;
    }

    const { sampledRoute } = routeBase;
    const { center, zoom } = activeView;
    const projectedPoints = sampledRoute.map((point) => {
      const world = latLngToWorld(point, zoom);

      return {
        x: world.x - center.x + MAP_WIDTH / 2,
        y: world.y - center.y + MAP_HEIGHT / 2
      };
    });
    const tileStartX = Math.floor((center.x - MAP_WIDTH / 2) / TILE_SIZE);
    const tileEndX = Math.floor((center.x + MAP_WIDTH / 2) / TILE_SIZE);
    const tileStartY = Math.floor((center.y - MAP_HEIGHT / 2) / TILE_SIZE);
    const tileEndY = Math.floor((center.y + MAP_HEIGHT / 2) / TILE_SIZE);
    const tileCount = 2 ** zoom;
    const tiles: MapTile[] = [];

    for (let x = tileStartX; x <= tileEndX; x += 1) {
      for (let y = tileStartY; y <= tileEndY; y += 1) {
        if (y < 0 || y >= tileCount) {
          continue;
        }

        const wrappedX = ((x % tileCount) + tileCount) % tileCount;
        tiles.push({
          key: `${zoom}-${x}-${y}`,
          href: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
          x: x * TILE_SIZE - center.x + MAP_WIDTH / 2,
          y: y * TILE_SIZE - center.y + MAP_HEIGHT / 2
        });
      }
    }

    return {
      end: projectedPoints[projectedPoints.length - 1],
      projectedPoints,
      routePath: buildRoutePath(projectedPoints),
      start: projectedPoints[0],
      tiles
    };
  }, [activeView, routeBase]);

  const handleWheel = useCallback(
    (event: WheelEvent<SVGSVGElement>) => {
      if (!routeBase || !activeView || !event.shiftKey) {
        return;
      }

      event.preventDefault();
      setShowControlsHint(false);

      const nextZoom = clampZoom(
        activeView.zoom + (event.deltaY > 0 ? -1 : 1)
      );

      if (nextZoom === activeView.zoom) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const pointer = {
        x: ((event.clientX - rect.left) / rect.width) * MAP_WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT
      };
      const zoomScale = 2 ** (nextZoom - activeView.zoom);
      const worldUnderPointer = {
        x: activeView.center.x + pointer.x - MAP_WIDTH / 2,
        y: activeView.center.y + pointer.y - MAP_HEIGHT / 2
      };
      const nextCenter = {
        x: worldUnderPointer.x * zoomScale - (pointer.x - MAP_WIDTH / 2),
        y: worldUnderPointer.y * zoomScale - (pointer.y - MAP_HEIGHT / 2)
      };

      setMapView({
        center: clampMapCenter(nextCenter, nextZoom),
        zoom: nextZoom
      });
    },
    [activeView, routeBase]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (!activeView || event.button !== 0) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        center: activeView.center,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY
      };
      setIsDragging(true);
    },
    [activeView]
  );

  const handlePointerMove = useCallback((event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - drag.startX) / rect.width) * MAP_WIDTH;
    const deltaY = ((event.clientY - drag.startY) / rect.height) * MAP_HEIGHT;

    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      setShowControlsHint(false);
    }

    setMapView((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        center: clampMapCenter(
          {
            x: drag.center.x - deltaX,
            y: drag.center.y - deltaY
          },
          current.zoom
        )
      };
    });
  }, []);

  const stopDragging = useCallback((event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsDragging(false);
  }, []);

  if (!mapData) {
    return (
      <div className="flex min-h-[360px] items-center justify-center bg-black/30 p-6 text-center">
        <div>
          <Bike className="mx-auto size-8 text-cds-interactive" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-bold text-white">No GPS map found</h3>
          <p className="mt-2 max-w-md text-sm text-cds-text-secondary">
            Strava did not return route points for this activity.
          </p>
        </div>
      </div>
    );
  }

  const hoverPoint =
    hoverRatio == null
      ? null
      : mapData.projectedPoints[
          Math.min(
            Math.max(
              Math.round(hoverRatio * (mapData.projectedPoints.length - 1)),
              0
            ),
            mapData.projectedPoints.length - 1
          )
        ];

  return (
    <div className="relative bg-black">
      <svg
        className={`block h-[360px] w-full touch-none select-none sm:h-[420px] ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        role="img"
        aria-label="Interactive activity route map. Drag to pan. Hold Shift while scrolling to zoom."
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        onPointerCancel={stopDragging}
        onPointerDown={handlePointerDown}
        onPointerLeave={stopDragging}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onWheel={handleWheel}
      >
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill={MAP_COLORS.background} />
        {mapData.tiles.map((tile) => (
          <image
            key={tile.key}
            href={tile.href}
            height={TILE_SIZE}
            opacity="0.86"
            width={TILE_SIZE}
            x={tile.x}
            y={tile.y}
          />
        ))}
        <path
          d={mapData.routePath}
          fill="none"
          stroke={MAP_COLORS.route}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <path
          d={mapData.routePath}
          fill="none"
          stroke={MAP_COLORS.outline}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
        <circle
          cx={mapData.start.x}
          cy={mapData.start.y}
          fill={MAP_COLORS.start}
          r="9"
          stroke={MAP_COLORS.outline}
          strokeWidth="4"
        />
        <circle
          cx={mapData.end.x}
          cy={mapData.end.y}
          fill={MAP_COLORS.end}
          r="9"
          stroke={MAP_COLORS.outline}
          strokeWidth="4"
        />
        {hoverPoint ? (
          <circle
            cx={hoverPoint.x}
            cy={hoverPoint.y}
            fill={MAP_COLORS.hover}
            r="11"
            stroke={MAP_COLORS.outline}
            strokeWidth="4"
          />
        ) : null}
      </svg>
      <div
        className={`pointer-events-none absolute right-4 top-4 rounded-2xl border border-white/[0.08] bg-black/70 px-4 py-3 text-xs text-white shadow-[var(--cu-shadow-card)] backdrop-blur transition-opacity duration-1000 ease-out ${
          showControlsHint ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="font-bold">Drag to move</p>
        <p className="mt-1 font-bold">
          Shift + scroll to zoom
        </p>
      </div>
    </div>
  );
}

function MetricStreamRow({
  chart,
  hoverRatio,
  onHoverRatioChange
}: {
  chart: ActivityChart;
  hoverRatio: number | null;
  onHoverRatioChange: (ratio: number | null) => void;
}) {
  const width = 760;
  const height = 92;
  const path = useMemo(
    () => getChartPath(chart.points, width, height),
    [chart.points]
  );
  const xDomain = useMemo(() => getChartDomain(chart.points), [chart.points]);
  const point = getPointAtRatio(chart.points, hoverRatio, xDomain);
  const cursorX = hoverRatio == null ? null : hoverRatio * width;
  const displayValue =
    point == null ? chart.maxLabel : formatChartValue(point.y, chart.digits);

  return (
    <div className="grid gap-4 px-5 py-4 sm:grid-cols-[160px_minmax(0,1fr)_110px] sm:items-center">
      <div>
        <h3 className="text-sm font-bold text-white">{chart.label}</h3>
        <p className="mt-1 text-xs text-cds-text-helper">
          Max {chart.maxLabel}
          <br />
          Avg {chart.averageLabel}
        </p>
      </div>
      <div className="min-h-[92px] rounded-2xl bg-black/24">
        {chart.points.length > 0 ? (
          <svg
            className="block h-[92px] w-full cursor-crosshair"
            onPointerLeave={() => onHoverRatioChange(null)}
            onPointerMove={(event) => onHoverRatioChange(getHoverRatio(event))}
            preserveAspectRatio="none"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
          >
            <line
              x1="0"
              x2={width}
              y1={height - 14}
              y2={height - 14}
              stroke="rgba(255,255,255,0.08)"
            />
            <path
              d={path}
              fill="none"
              stroke={chart.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            {cursorX == null ? null : (
              <line
                x1={cursorX}
                x2={cursorX}
                y1="0"
                y2={height}
                stroke="#0ea5e9"
                strokeOpacity="0.75"
                strokeWidth="2"
              />
            )}
          </svg>
        ) : (
          <div className="flex h-[76px] items-center justify-center text-xs font-bold uppercase tracking-[0.14em] text-cds-text-helper">
            No stream
          </div>
        )}
      </div>
      <div className="text-left sm:text-right">
        <p className="text-lg font-bold text-white">
          {chart.points.length > 0 ? displayValue : "--"}
        </p>
        <p className="text-xs font-bold text-cds-text-helper">{chart.unit}</p>
      </div>
    </div>
  );
}
