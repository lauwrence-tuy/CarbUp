import {
  type FitnessFreshnessPoint
} from "@/lib/trends";

export const chartWidth = 900;
export const chartHeight = 420;
export const plotTop = 24;
export const plotBottom = 360;
export const plotHeight = plotBottom - plotTop;
export const hoverTooltipY = -84;

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
    <div className="rounded-[22px] bg-black/24 p-5">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-muted">
        {label}
      </p>
      <div className="mt-3 flex items-end gap-2">
        <p className={`text-5xl font-bold tracking-[-0.04em] ${color}`}>
          {value}
        </p>
        {delta == null ? null : (
          <span
            className={`pb-2 text-sm font-bold ${
              delta >= 0 ? "text-app-green" : "text-app-red"
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

export function FreshnessHoverOverlay({
  point,
  index,
  count
}: {
  point: FitnessFreshnessPoint;
  index: number;
  count: number;
  maxValue: number;
}) {
  const x = getChartX(index, count);
  const width = 276;
  const tooltipX = Math.max(8, Math.min(chartWidth - width - 8, x - width / 2));
  const date = formatHoverDate(point.dateKey);

  return (
    <g className="pointer-events-none">
      <line
        x1={x}
        x2={x}
        y1="0"
        y2={chartHeight - 8}
        stroke="rgba(255,255,255,0.46)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        fill="rgba(0,0,0,0.86)"
        height="58"
        rx="12"
        stroke="rgba(255,255,255,0.10)"
        width={width}
        x={tooltipX}
        y={hoverTooltipY}
      />
      <text
        fill="var(--text-secondary)"
        fontSize="10"
        fontWeight="800"
        textAnchor="middle"
        x={tooltipX + 34}
        y={hoverTooltipY + 20}
      >
        {date.weekday}
      </text>
      <text
        fill="var(--text-primary)"
        fontSize="12"
        fontWeight="900"
        textAnchor="middle"
        x={tooltipX + 34}
        y={hoverTooltipY + 37}
      >
        {date.date}
      </text>
      <HoverValue
        color="var(--orange)"
        label="Fitness"
        value={point.fitness}
        x={tooltipX + 98}
        y={hoverTooltipY}
      />
      <HoverValue
        color="var(--text-secondary)"
        label="Fatigue"
        value={point.fatigue}
        x={tooltipX + 166}
        y={hoverTooltipY}
      />
      <HoverValue
        color="var(--blue)"
        label="Form"
        value={point.form}
        x={tooltipX + 230}
        y={hoverTooltipY}
      />
    </g>
  );
}

export function HoverValue({
  label,
  value,
  color,
  x,
  y
}: {
  label: string;
  value: number;
  color: string;
  x: number;
  y: number;
}) {
  return (
    <>
      <text
        fill="var(--text-secondary)"
        fontSize="10"
        fontWeight="800"
        textAnchor="middle"
        x={x}
        y={y + 20}
      >
        {label}
      </text>
      <text
        fill={color}
        fontSize="13"
        fontWeight="900"
        textAnchor="middle"
        x={x}
        y={y + 38}
      >
        {value}
      </text>
    </>
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

export function ActivityDots({ points }: { points: FitnessFreshnessPoint[] }) {
  if (points.length === 0) {
    return null;
  }

  const dayWidth = chartWidth / points.length;

  return (
    <g>
      {points.flatMap((point, dayIndex) =>
        point.activities.map((activity, activityIndex) => {
          const x = dayIndex * dayWidth + dayWidth / 2;
          const y = chartHeight - 22 - activityIndex * 12;
          const dotY = Math.max(chartHeight - 70, y);

          return (
            <a
              key={`${point.dateKey}-${activity.stravaActivityId}-${activityIndex}`}
              className="group"
              href={`https://www.strava.com/activities/${activity.stravaActivityId}`}
              target="_blank"
              rel="noreferrer"
            >
              <title>
                {activity.name} - {activity.type} - load {activity.load}
              </title>
              <g
                className="pointer-events-none opacity-0 transition group-hover:opacity-100 group-focus:opacity-100"
                transform={`translate(${Math.max(72, Math.min(chartWidth - 72, x))} ${Math.max(34, dotY - 34)})`}
              >
                <rect
                  fill="rgba(0,0,0,0.86)"
                  height="42"
                  rx="10"
                  stroke="rgba(255,255,255,0.10)"
                  width="144"
                  x="-72"
                  y="-42"
                />
                <text
                  fill="var(--text-secondary)"
                  fontSize="9"
                  fontWeight="700"
                  textAnchor="middle"
                  x="0"
                  y="-25"
                >
                  {point.label}
                </text>
                <text
                  fill="var(--text-primary)"
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="middle"
                  x="0"
                  y="-11"
                >
                  {truncateActivityName(activity.name)}
                </text>
              </g>
              <circle
                cx={x}
                cy={dotY}
                fill="rgba(255,255,255,0.16)"
                r={4}
                className="transition hover:fill-app-green"
              />
            </a>
          );
        })
      )}
    </g>
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
