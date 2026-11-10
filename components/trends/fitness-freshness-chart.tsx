import {
  type FitnessFreshnessPoint
} from "@/lib/trends";

export const chartWidth = 900;
export const chartHeight = 420;
export const plotTop = 24;
export const plotBottom = 360;
export const plotHeight = plotBottom - plotTop;

export function FreshnessMetric({
  label,
  value,
  delta,
  color
}: {
  label: string;
  value: number;
  delta: number | null;
  color: string;
}) {
  return (
    <div className="rounded-[22px] bg-black/30 p-5">
      <p className="cu-label">
        {label}
      </p>
      <div className="mt-3 flex items-end gap-2">
        <p className={`text-5xl font-bold tracking-[-0.04em] ${color}`}>
          {value}
        </p>
        {delta == null ? null : (
          <span
            className={`pb-2 text-sm font-bold ${
              delta >= 0 ? "text-cds-support-success" : "text-cds-support-error"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

export function getChartX(index: number, count: number) {
  if (count <= 1) {
    return 0;
  }

  return (index / (count - 1)) * chartWidth;
}

export function formatHoverDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);

  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
    date: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric"
    }).format(date)
  };
}

/** Vertical guide line at the hovered day (inside the stretched SVG; lines scale fine). */
export function FreshnessHoverLine({ index, count }: { index: number; count: number }) {
  const x = getChartX(index, count);

  return (
    <line
      className="pointer-events-none"
      x1={x}
      x2={x}
      y1="0"
      y2={chartHeight - 8}
      stroke="rgba(255,255,255,0.46)"
      strokeWidth="2"
      vectorEffect="non-scaling-stroke"
    />
  );
}

/**
 * Hover readout, drawn as HTML over the chart. The SVG uses
 * preserveAspectRatio="none", which would squash any text drawn inside it.
 */
export function FreshnessHoverTooltip({
  point,
  index,
  count
}: {
  point: FitnessFreshnessPoint;
  index: number;
  count: number;
}) {
  const leftPercent = (getChartX(index, count) / chartWidth) * 100;
  const date = formatHoverDate(point.dateKey);
  const tooltipWidth = 288;

  return (
    <div
      className="pointer-events-none absolute top-2 z-10 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/90 px-4 py-3 shadow-[var(--cu-shadow-card)]"
      style={{
        width: tooltipWidth,
        left: `clamp(0px, calc(${leftPercent}% - ${tooltipWidth / 2}px), calc(100% - ${tooltipWidth}px))`
      }}
    >
      <div className="text-center">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cds-text-helper">
          {date.weekday}
        </p>
        <p className="whitespace-nowrap text-sm font-bold text-white">{date.date}</p>
      </div>
      <HoverValue label="Fitness" value={point.fitness} className="text-cds-interactive" />
      <HoverValue label="Fatigue" value={point.fatigue} className="text-cds-text-secondary" />
      <HoverValue label="Form" value={point.form} className="text-[color:var(--blue)]" />
    </div>
  );
}

function HoverValue({
  label,
  value,
  className
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cds-text-helper">
        {label}
      </p>
      <p className={`cu-mono text-base font-bold ${className}`}>{value}</p>
    </div>
  );
}

export function getLinePoints({
  points,
  metric,
  maxValue
}: {
  points: FitnessFreshnessPoint[];
  metric: "fitness" | "fatigue" | "form";
  maxValue: number;
}) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const x = getChartX(index, points.length);
      const rawValue =
        metric === "form" ? point.form + maxValue * 0.42 : point[metric];
      const domain = metric === "form" ? maxValue * 1.42 : maxValue;
      const y = plotBottom - (Math.max(rawValue, 0) / domain) * plotHeight;

      return `${x.toFixed(1)},${Math.max(plotTop, Math.min(plotBottom, y)).toFixed(1)}`;
    })
    .join(" ");
}

export function getFormZeroY(maxValue: number) {
  return plotBottom - ((maxValue * 0.42) / (maxValue * 1.42)) * plotHeight;
}

export function FreshnessLine({
  points,
  metric,
  maxValue,
  color
}: {
  points: FitnessFreshnessPoint[];
  metric: "fitness" | "fatigue" | "form";
  maxValue: number;
  color: string;
}) {
  return (
    <polyline
      fill="none"
      points={getLinePoints({ points, metric, maxValue })}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="4"
      vectorEffect="non-scaling-stroke"
    />
  );
}

/** Daily activity dots, drawn as HTML over the chart so they stay round. */
export function ActivityDots({ points }: { points: FitnessFreshnessPoint[] }) {
  if (points.length === 0) {
    return null;
  }

  const dayWidth = chartWidth / points.length;

  return (
    <>
      {points.flatMap((point, dayIndex) =>
        point.activities.map((activity, activityIndex) => {
          const x = dayIndex * dayWidth + dayWidth / 2;
          const y = chartHeight - 22 - activityIndex * 12;
          const dotY = Math.max(chartHeight - 70, y);
          const leftPercent = (x / chartWidth) * 100;
          const labelAlign =
            leftPercent < 15
              ? "left-0"
              : leftPercent > 85
                ? "right-0"
                : "left-1/2 -translate-x-1/2";

          return (
            <a
              key={`${point.dateKey}-${activity.stravaActivityId}-${activityIndex}`}
              className="group absolute z-[5] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.16] transition hover:bg-cds-interactive focus-visible:bg-cds-interactive focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus"
              style={{ left: `${leftPercent}%`, top: `${(dotY / chartHeight) * 100}%` }}
              href={`https://www.strava.com/activities/${activity.stravaActivityId}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`${activity.name}, ${activity.type}, load ${activity.load} (opens Strava)`}
            >
              <span
                className={`pointer-events-none absolute bottom-full mb-2 hidden whitespace-nowrap rounded-xl border border-white/10 bg-black/90 px-3 py-2 text-center group-hover:block group-focus-visible:block ${labelAlign}`}
              >
                <span className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cds-text-helper">
                  {point.label}
                </span>
                <span className="block text-xs font-bold text-white">
                  {truncateActivityName(activity.name)}
                </span>
              </span>
            </a>
          );
        })
      )}
    </>
  );
}

export function truncateActivityName(name: string) {
  if (name.length <= 22) {
    return name;
  }

  return `${name.slice(0, 21)}...`;
}

export function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
