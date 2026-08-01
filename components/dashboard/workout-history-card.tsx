import Link from "next/link";
import { Bike } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { SyncStravaButton } from "./sync-strava-button";

export type Workout = {
  id: string;
  slug: string;
  name: string;
  type: string;
  calories: number | null;
  duration: string;
  distance: string;
  startTime: string;
  effort: number;
  badge: "Easy" | "Moderate" | "Hard" | "Very Hard";
};

type WorkoutHistoryCardProps = {
  dateLabel?: string;
  workouts: Workout[];
  totalCalories: number;
  isConnected: boolean;
};

export function WorkoutHistoryCard({
  dateLabel = "Today",
  workouts,
  totalCalories,
  isConnected
}: WorkoutHistoryCardProps) {
  return (
    <article className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-app-hover">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-app-orange text-white">
            <Bike className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
              Workouts
            </h2>
            <p className="mt-1 text-sm text-app-muted">
              {dateLabel} from Strava
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-lg font-bold tracking-[-0.04em] text-app-secondary">
            {totalCalories.toLocaleString()} kcal
          </span>
          {isConnected ? <SyncStravaButton /> : null}
        </div>
      </div>

      {workouts.length > 0 ? (
        <div className="mt-5 divide-y divide-white/[0.06]">
          {workouts.map((ride) => (
            <Link
              key={ride.id}
              href={`/workout/${ride.slug}`}
              className="block py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-start gap-4 rounded-[20px] transition hover:bg-white/[0.04] sm:-mx-3 sm:px-3">
                <span
                  className={`mt-1 h-12 w-1.5 shrink-0 rounded-full ${
                    ride.badge === "Very Hard"
                      ? "bg-app-red"
                      : ride.badge === "Hard"
                        ? "bg-app-orange"
                        : "bg-app-green"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-white">
                        {ride.name}
                      </h3>
                      <p className="mt-1 text-sm text-app-muted">
                        {ride.duration} - {ride.distance} - {ride.startTime}
                      </p>
                    </div>
                    <span className="shrink-0 text-lg font-bold text-white">
                      {ride.calories == null
                        ? "--"
                        : `+${ride.calories.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge label={ride.badge} />
                    <StatusBadge label="Strava" />
                    <span className="text-sm font-semibold text-app-orange">
                      {ride.type}
                    </span>
                    <span className="text-sm font-semibold text-app-muted">
                      load {ride.effort}
                    </span>
                  </div>
                  {ride.calories == null ? (
                    <p className="mt-2 text-sm font-semibold text-app-yellow">
                      Calories unavailable
                    </p>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[24px] bg-black/24 p-6 text-center">
          <p className="text-lg font-bold text-white">
            {isConnected
              ? `No workouts synced for ${dateLabel}`
              : "Connect Strava to sync workouts"}
          </p>
          <p className="mt-2 text-sm text-app-secondary">
            {isConnected
              ? "Use Sync Strava to import recent activities."
              : `After connecting, this card will show ${dateLabel} rides and calories.`}
          </p>
        </div>
      )}
    </article>
  );
}
