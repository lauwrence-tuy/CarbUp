import { BarChart3 } from "lucide-react";
import type { CalendarDay } from "./weekly-calendar";

type TrainingLoadCardProps = {
  load: number;
  status: string;
  days: CalendarDay[];
};

export function TrainingLoadCard({ load, status, days }: TrainingLoadCardProps) {
  const maxLoad = Math.max(...days.map((day) => day.load), 1);

  return (
    <article className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-app-hover">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-app-green text-black">
            <BarChart3 className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
              Training load
            </h2>
            <p className="mt-1 text-sm text-app-muted">Today indicator</p>
          </div>
        </div>
        <span className="rounded-full bg-app-green/15 px-3 py-1 text-xs font-bold text-app-green">
          {status}
        </span>
      </div>
      <p className="mt-7 text-5xl font-bold tracking-[-0.04em] text-white">
        {load}
      </p>
      <p className="mt-1 text-base text-app-secondary">
        synced activity load
      </p>
      <div className="mt-6 flex items-end gap-2">
        {days.map((day) => (
          <div key={day.key} className="flex flex-1 flex-col items-center gap-2">
            <span
              className={`w-full rounded-full ${
                day.isToday ? "bg-app-green" : "bg-white/[0.10]"
              }`}
              style={{
                height: Math.max(18, Math.round((day.load / maxLoad) * 64))
              }}
            />
            <span className="text-[0.65rem] font-bold uppercase tracking-wide text-app-muted">
              {day.day}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
