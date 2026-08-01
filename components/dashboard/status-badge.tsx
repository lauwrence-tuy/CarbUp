type StatusBadgeProps = {
  label:
    | "Easy"
    | "Moderate"
    | "Hard"
    | "Very Hard"
    | "Strava"
    | "Ready"
    | "Active"
    | "Complete";
};

const badgeStyles: Record<StatusBadgeProps["label"], string> = {
  Easy: "bg-app-green/15 text-app-green",
  Moderate: "bg-app-yellow/15 text-app-yellow",
  Hard: "bg-app-orange/15 text-app-orange",
  "Very Hard": "bg-app-red/15 text-app-red",
  Strava: "bg-white/10 text-app-secondary",
  Ready: "bg-white/10 text-app-secondary",
  Active: "bg-app-blue/15 text-app-blue",
  Complete: "bg-app-green/15 text-app-green"
};

export function StatusBadge({ label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-bold tracking-wide ${badgeStyles[label]}`}
    >
      {label}
    </span>
  );
}
