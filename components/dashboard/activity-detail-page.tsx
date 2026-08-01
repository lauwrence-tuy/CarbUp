"use client";

import Link from "next/link";
import {
  type PointerEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ArrowLeft,
  Bike,
  Flame,
  MapPinned,
  Mountain,
  Route,
  Settings,
  Timer
} from "lucide-react";
import type {
  ActivityChart,
  ActivityVisualData,
  LatLngPoint
} from "@/lib/strava-activity-detail";
import { MetricCard } from "./metric-card";

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
  visualData: ActivityVisualData | null;
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

function formatDistanceValue(value: number | null) {
  return value == null ? "--" : `${value.toFixed(value >= 100 ? 0 : 1)} mi`;
}

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
  const metricCharts = visualData?.charts ?? [];

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
    <main className="min-h-screen bg-app-bg text-white">
      <div className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-24 pt-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-6 rounded-[28px] border border-white/[0.04] bg-app-card/72 px-5 py-4 shadow-card backdrop-blur lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-app-card text-app-green shadow-card">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <p className="text-lg font-bold tracking-[-0.04em] sm:text-xl">
              Carb<span className="text-app-green">Up</span>
            </p>
          </Link>

          <nav
            className="hidden items-center gap-2 rounded-full bg-black/35 p-1 lg:flex"
            aria-label="Activity detail navigation"
          >
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Nutrition", href: "/nutrition" },
              { label: "Workouts", href: "/workouts" },
              { label: "Trends", href: "/trends" }
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  item.label === "Workouts"
                    ? "bg-white text-black"
                    : "text-app-secondary hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/settings"
            className="flex size-12 items-center justify-center rounded-full bg-app-card text-app-blue transition hover:bg-app-hover"
            aria-label="Settings"
          >
            <Settings className="size-5" aria-hidden="true" />
          </Link>
        </header>

        <section className="mt-8">
          <Link
            href="/workouts"
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-app-card px-4 text-sm font-bold text-app-secondary transition hover:bg-app-hover hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Workouts
          </Link>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-app-secondary">
                {activity.type}
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-none tracking-[-0.04em] text-white sm:text-6xl">
                {activity.name}
              </h1>
              <p className="mt-3 text-base font-semibold text-app-muted">
                {activity.dateLabel} at {activity.startTime}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Calories"
            value={
              activity.calories == null
                ? "--"
                : activity.calories.toLocaleString()
            }
            detail="activity burn"
            icon={Flame}
            tone="green"
          />
          <MetricCard
            label="Duration"
            value={activity.durationLabel}
            detail="moving time"
            icon={Timer}
            tone="blue"
          />
          <MetricCard
            label="Distance"
            value={
              visualData?.totalDistanceMiles != null
                ? formatDistanceValue(visualData.totalDistanceMiles)
                : activity.distanceLabel
            }
            detail="route distance"
            icon={Route}
            tone="orange"
          />
          <MetricCard
            label="Elevation"
            value={formatElevationValue(visualData?.totalElevationFeet ?? null)}
            detail={`effort ${activity.effort}`}
            icon={Mountain}
            tone="purple"
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.04] bg-app-card shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-app-green text-black">
                <MapPinned className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                  Route map
                </h2>
                <p className="mt-1 text-sm text-app-muted">
                  {visualData?.route.length
                    ? "Synced from Strava GPS data"
                    : "No route stream available"}
                </p>
              </div>
            </div>
          </div>
          <ActivityRouteMap
            hoverRatio={hoverRatio}
            route={visualData?.route ?? []}
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.04] bg-app-card shadow-card">
          <div className="grid border-b border-white/[0.06] bg-black/20 px-5 py-4 sm:grid-cols-[160px_minmax(0,1fr)_110px]">
            <div className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-app-secondary">
              Metric
            </div>
            <div className="hidden text-[0.72rem] font-bold uppercase tracking-[0.16em] text-app-secondary sm:block">
              Activity stream
            </div>
            <div className="hidden text-right text-[0.72rem] font-bold uppercase tracking-[0.16em] text-app-secondary sm:block">
              Max / avg
            </div>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {metricCharts.map((chart) => (
              <MetricStreamRow
                key={chart.label}
                chart={chart}
                hoverRatio={hoverRatio}
                onHoverRatioChange={handleHoverRatioChange}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
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
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-app-orange text-white">
            <Bike className="size-7" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-xl font-bold text-white">No GPS map found</h3>
          <p className="mt-2 max-w-md text-sm text-app-secondary">
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
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#0f172a" />
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
          stroke="#ff5a1f"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <path
          d={mapData.routePath}
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
        <circle
          cx={mapData.start.x}
          cy={mapData.start.y}
          fill="#22c55e"
          r="9"
          stroke="#ffffff"
          strokeWidth="4"
        />
        <circle
          cx={mapData.end.x}
          cy={mapData.end.y}
          fill="#ff5a1f"
          r="9"
          stroke="#ffffff"
          strokeWidth="4"
        />
        {hoverPoint ? (
          <circle
            cx={hoverPoint.x}
            cy={hoverPoint.y}
            fill="#0ea5e9"
            r="11"
            stroke="#ffffff"
            strokeWidth="4"
          />
        ) : null}
      </svg>
      <div
        className={`pointer-events-none absolute right-4 top-4 rounded-2xl border border-white/[0.08] bg-black/70 px-4 py-3 text-xs text-white shadow-card backdrop-blur transition-opacity duration-1000 ease-out ${
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
        <p className="mt-1 text-xs text-app-muted">
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
          <div className="flex h-[76px] items-center justify-center text-xs font-bold uppercase tracking-[0.14em] text-app-muted">
            No stream
          </div>
        )}
      </div>
      <div className="text-left sm:text-right">
        <p className="text-lg font-bold text-white">
          {chart.points.length > 0 ? displayValue : "--"}
        </p>
        <p className="text-xs font-bold text-app-muted">{chart.unit}</p>
      </div>
    </div>
  );
}
