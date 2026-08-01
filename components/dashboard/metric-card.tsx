import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "green" | "orange" | "blue" | "purple";
};

const toneStyles = {
  green: "bg-app-green text-black",
  orange: "bg-app-orange text-white",
  blue: "bg-app-blue text-black",
  purple: "bg-app-purple text-white"
};

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "green"
}: MetricCardProps) {
  return (
    <article className="rounded-[28px] border border-white/[0.04] bg-app-card p-5 shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-app-hover">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-11 items-center justify-center rounded-2xl ${toneStyles[tone]}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-app-secondary">
          {label}
        </span>
      </div>
      <p className="mt-5 text-3xl font-bold tracking-[-0.04em] text-white">
        {value}
      </p>
      <p className="mt-1 text-sm text-app-muted">{detail}</p>
    </article>
  );
}
