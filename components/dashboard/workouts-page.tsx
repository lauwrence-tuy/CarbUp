"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bike,
  CalendarDays,
  Clock3,
  Flame,
  Gauge,
  ListFilter,
  Route,
  Search,
  Settings,
  Timer
} from "lucide-react";
import { MetricCard } from "./metric-card";
import { FloatingActionButton } from "./floating-action-button";
import { StatusBadge } from "./status-badge";
import { SyncStravaButton } from "./sync-strava-button";

export type WorkoutListItem = {
  id: string;
  slug: string;
  name: string;
  type: string;
  dateKey: string;
  dateLabel: string;
  startTime: string;
  calories: number | null;
  durationMinutes: number;
  durationLabel: string;
  distanceMiles: number | null;
  distanceLabel: string;
  effort: number;
  badge: "Easy" | "Moderate" | "Hard" | "Very Hard";
};

type WorkoutsPageProps = {
  workouts: WorkoutListItem[];
  isConnected: boolean;
};

const rangeOptions = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "All", days: null }
];

function getBadgeColor(badge: WorkoutListItem["badge"]) {
  if (badge === "Very Hard") {
    return "bg-app-red";
  }

  if (badge === "Hard") {
    return "bg-app-orange";
  }

  return "bg-app-green";
}

function formatDistanceValue(miles: number) {
  return `${miles.toFixed(miles >= 100 ? 0 : 1)} mi`;
}

function formatDurationValue(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${Math.round(minutes)} min`;
}

export function WorkoutsPage({ workouts, isConnected }: WorkoutsPageProps) {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedRange, setSelectedRange] = useState<number | null>(30);

  const types = useMemo(
    () => ["All", ...Array.from(new Set(workouts.map((item) => item.type))).sort()],
    [workouts]
  );
  const filteredWorkouts = useMemo(() => {
    const latestDate = workouts[0]?.dateKey
      ? new Date(`${workouts[0].dateKey}T12:00:00`)
      : new Date();
    const rangeStart = selectedRange
      ? new Date(latestDate.getTime() - (selectedRange - 1) * 86400000)
      : null;
    const normalizedQuery = query.trim().toLowerCase();

    return workouts.filter((workout) => {
      const workoutDate = new Date(`${workout.dateKey}T12:00:00`);
      const matchesRange = !rangeStart || workoutDate >= rangeStart;
      const matchesType =
        selectedType === "All" || workout.type === selectedType;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${workout.name} ${workout.type} ${workout.dateLabel}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesRange && matchesType && matchesQuery;
    });
  }, [query, selectedRange, selectedType, workouts]);

  const totalCalories = filteredWorkouts.reduce(
    (total, workout) => total + (workout.calories ?? 0),
    0
  );
  const totalMinutes = filteredWorkouts.reduce(
    (total, workout) => total + workout.durationMinutes,
    0
  );
  const totalDistance = filteredWorkouts.reduce(
    (total, workout) => total + (workout.distanceMiles ?? 0),
    0
  );
  const averageEffort =
    filteredWorkouts.length > 0
      ? Math.round(
          filteredWorkouts.reduce((total, workout) => total + workout.effort, 0) /
            filteredWorkouts.length
        )
      : 0;
  const averageCalories =
    filteredWorkouts.length > 0
      ? Math.round(totalCalories / filteredWorkouts.length)
      : 0;

  return (
    <main className="min-h-screen bg-app-bg text-white">
      <div className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-24 pt-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-6 rounded-[28px] border border-white/[0.04] bg-app-card/72 px-5 py-4 shadow-card backdrop-blur lg:px-6">
          <Link
            href={isConnected ? "/dashboard" : "/"}
            className="flex items-center gap-3"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-app-card text-app-green shadow-card">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <p className="text-lg font-bold tracking-[-0.04em] sm:text-xl">
              Carb<span className="text-app-green">Up</span>
            </p>
          </Link>

          <nav
            className="hidden items-center gap-2 rounded-full bg-black/35 p-1 lg:flex"
            aria-label="Workouts navigation"
          >
            {[
                {
                  label: "Dashboard",
                  href: isConnected ? "/dashboard" : "/",
                  active: false
                },
                {
                  label: "Nutrition",
                  href: isConnected ? "/nutrition" : "/",
                  active: false
                },
                {
                  label: "Workouts",
                  href: isConnected ? "/workouts" : "/",
                  active: true
                },
                {
                  label: "Trends",
                  href: isConnected ? "/trends" : "/",
                  active: false
                }
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  item.active
                    ? "bg-white text-black"
                    : "text-app-secondary hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {!isConnected ? (
              <Link
                href="/api/strava/auth"
                className="hidden min-h-11 items-center gap-2 rounded-full bg-app-green px-5 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5 sm:inline-flex"
              >
                Connect Strava
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
            <Link
              href="/settings"
              className="flex size-12 items-center justify-center rounded-full bg-app-card text-app-blue transition hover:bg-app-hover"
              aria-label="Settings"
            >
              <Settings className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold leading-none text-white sm:text-5xl">
                Activity log
              </h1>
              <p className="mt-3 max-w-2xl text-base text-app-secondary">
                Inspect synced Strava sessions, spot standout calorie burns, and
                compare effort across your recent training.
              </p>
            </div>
            {isConnected ? <SyncStravaButton /> : null}
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Calories"
            value={totalCalories.toLocaleString()}
            detail={`${averageCalories.toLocaleString()} kcal per workout`}
            icon={Flame}
            tone="green"
          />
          <MetricCard
            label="Workouts"
            value={filteredWorkouts.length.toLocaleString()}
            detail={`${types.length - 1} activity types synced`}
            icon={CalendarDays}
            tone="blue"
          />
          <MetricCard
            label="Duration"
            value={formatDurationValue(totalMinutes)}
            detail="moving time"
            icon={Timer}
            tone="purple"
          />
          <MetricCard
            label="Distance"
            value={formatDistanceValue(totalDistance)}
            detail={`avg effort ${averageEffort}`}
            icon={Route}
            tone="orange"
          />
        </section>

        <section className="mt-6 rounded-[28px] border border-white/[0.04] bg-app-card p-5 shadow-card">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-app-blue text-black">
                <ListFilter className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                  Filters
                </h2>
                <p className="mt-1 text-sm text-app-muted">
                  {filteredWorkouts.length} of {workouts.length} workouts
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[720px]">
              <label className="relative block">
                <span className="sr-only">Search workouts</span>
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-app-muted"
                  aria-hidden="true"
                />
                <input
                  className="min-h-12 w-full rounded-full border border-white/[0.06] bg-black/28 py-2 pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-app-muted focus:border-app-green/60"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search workouts"
                  type="search"
                  value={query}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {rangeOptions.map((option) => (
                  <button
                    key={option.label}
                    className={`min-h-11 rounded-full px-4 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-app-green/70 focus-visible:ring-offset-2 focus-visible:ring-offset-app-card ${
                      selectedRange === option.days
                        ? "bg-white text-black"
                        : "bg-black/28 text-app-secondary hover:bg-white/[0.08] hover:text-white"
                    }`}
                    type="button"
                    onClick={() => setSelectedRange(option.days)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 py-4">
            {types.map((type) => (
              <button
                key={type}
                className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-app-green/70 focus-visible:ring-offset-2 focus-visible:ring-offset-app-card ${
                  selectedType === type
                    ? "bg-app-green text-black shadow-glow"
                    : "bg-black/28 text-app-secondary hover:bg-white/[0.08] hover:text-white"
                }`}
                type="button"
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          {filteredWorkouts.length > 0 ? (
            <div className="grid gap-4">
              {filteredWorkouts.map((workout) => (
                <Link
                  key={workout.id}
                  href={`/workout/${workout.slug}`}
                  className="rounded-[28px] border border-white/[0.04] bg-app-card p-5 shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-app-hover"
                >
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex min-w-0 gap-4">
                      <span
                        className={`mt-1 h-24 w-1.5 shrink-0 rounded-full ${getBadgeColor(
                          workout.badge
                        )}`}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge label={workout.badge} />
                          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-app-secondary">
                            {workout.type}
                          </span>
                        </div>
                        <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-white">
                          {workout.name}
                        </h2>
                        <p className="mt-2 text-sm font-semibold text-app-muted">
                          {workout.dateLabel} at {workout.startTime}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
                      <WorkoutStat
                        icon={Flame}
                        label="Calories"
                        value={
                          workout.calories == null
                            ? "--"
                            : workout.calories.toLocaleString()
                        }
                      />
                      <WorkoutStat
                        icon={Clock3}
                        label="Time"
                        value={workout.durationLabel}
                      />
                      <WorkoutStat
                        icon={Route}
                        label="Distance"
                        value={workout.distanceLabel}
                      />
                      <WorkoutStat
                        icon={Gauge}
                        label="Effort"
                        value={String(workout.effort)}
                      />
                      <span className="sr-only">Open activity detail</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/[0.04] bg-app-card p-8 text-center shadow-card">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-app-orange text-white">
                <Bike className="size-7" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-2xl font-bold text-white">
                {isConnected ? "No workouts match this view" : "Connect Strava"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-app-secondary">
                {isConnected
                  ? "Try a wider date range or clear the search to see more synced activity."
                  : "Once Strava is connected, this page becomes your searchable activity log."}
              </p>
            </div>
          )}
        </section>
      </div>
      {isConnected ? <FloatingActionButton href="/nutrition" /> : null}
    </main>
  );
}

function WorkoutStat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] bg-black/24 p-4">
      <div className="flex items-center gap-2 text-app-muted">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>
      <p className="mt-3 text-lg font-bold text-white">{value}</p>
    </div>
  );
}
