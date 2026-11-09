type ProgressBarProps = {
  value: number;
  color?: "green" | "blue" | "yellow" | "orange" | "purple" | "red";
  height?: "thin" | "base";
  trackClassName?: string;
};

const colorClass = {
  green: "bg-app-green",
  blue: "bg-app-blue",
  yellow: "bg-app-yellow",
  orange: "bg-app-orange",
  purple: "bg-app-purple",
  red: "bg-app-red"
};

export function ProgressBar({
  value,
  color = "green",
  height = "thin",
  trackClassName = ""
}: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(value, 100));

  return (
    <div
      className={`overflow-hidden rounded-full bg-white/[0.07] ${
        height === "base" ? "h-3" : "h-2"
      } ${trackClassName}`}
    >
      <div
        className={`h-full origin-left rounded-full transition-[width] duration-700 ease-out ${colorClass[color]}`}
        style={{
          width: `${safeValue}%`
        }}
      />
    </div>
  );
}
