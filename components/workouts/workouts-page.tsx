"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Column,
  Grid,
  Search,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  Tile
} from "@carbon/react";
import type { EffortBadge } from "@/lib/workout-metrics";
import { CarbonSyncButton } from "@/components/carbon/sync-button";
import {
  effortTagType,
  PageShell,
  PageTitle,
  PillGroup,
  StatTile
} from "@/components/carbon/page-shell";

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
  badge: EffortBadge;
};

type WorkoutsPageProps = {
  workouts: WorkoutListItem[];
  isConnected: boolean;
};

const rangeOptions: { label: string; value: number | null }[] = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
  { label: "All", value: null }
];

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
      const matchesType = selectedType === "All" || workout.type === selectedType;
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
    filteredWorkouts.length > 0 ? Math.round(totalCalories / filteredWorkouts.length) : 0;

  return (
    <PageShell isConnected={isConnected}>
      <PageTitle
        label="Workouts"
        title="Activity log"
        description="Every synced Strava session, with calories, time, distance and effort."
        actions={isConnected ? <CarbonSyncButton /> : null}
      />

      <Grid className="mt-8">
        <Column sm={4} md={8} lg={16}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Calories"
              value={totalCalories.toLocaleString("en-US")}
              helper={`${averageCalories.toLocaleString("en-US")} kcal per workout`}
              accent
            />
            <StatTile
              label="Workouts"
              value={filteredWorkouts.length.toLocaleString("en-US")}
              helper={`${types.length - 1} activity types`}
            />
            <StatTile
              label="Moving time"
              value={formatDurationValue(totalMinutes)}
              helper="total"
            />
            <StatTile
              label="Distance"
              value={formatDistanceValue(totalDistance)}
              helper={`average effort ${averageEffort}`}
            />
          </div>

          {/* Filters */}
          <Tile className="mt-4 !p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="cu-heading-02">Filters</h2>
                <p className="cu-helper mt-1">
                  {filteredWorkouts.length} of {workouts.length} workouts
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:min-w-[560px]">
                <div className="flex-1">
                  <Search
                    id="workout-search"
                    labelText="Search workouts"
                    placeholder="Search workouts"
                    size="lg"
                    value={query}
                    onChange={(event) =>
                      setQuery((event.target as HTMLInputElement).value)
                    }
                    closeButtonLabelText="Clear search"
                  />
                </div>
                <PillGroup
                  label="Date range"
                  options={rangeOptions}
                  value={selectedRange}
                  onChange={setSelectedRange}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Activity type">
              {types.map((type) => {
                const isSelected = selectedType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedType(type)}
                    className={`min-h-10 rounded-full px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus ${
                      isSelected
                        ? "bg-cds-interactive text-black shadow-[var(--cu-shadow-glow)]"
                        : "bg-black/30 text-cds-text-secondary hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </Tile>

          {/* List */}
          <Tile className="mt-4 !p-6">
            <h2 className="cu-heading-02">Activities</h2>
            {filteredWorkouts.length > 0 ? (
              <StructuredListWrapper aria-label="Activities" className="!mb-0 mt-4">
                <StructuredListHead>
                  <StructuredListRow head>
                    <StructuredListCell head>Workout</StructuredListCell>
                    <StructuredListCell head>Intensity</StructuredListCell>
                    <StructuredListCell head className="hidden md:table-cell">
                      Time
                    </StructuredListCell>
                    <StructuredListCell head className="hidden md:table-cell">
                      Distance
                    </StructuredListCell>
                    <StructuredListCell head className="hidden lg:table-cell">
                      Load
                    </StructuredListCell>
                    <StructuredListCell head className="text-right">
                      kcal
                    </StructuredListCell>
                  </StructuredListRow>
                </StructuredListHead>
                <StructuredListBody>
                  {filteredWorkouts.map((workout) => (
                    <StructuredListRow key={workout.id}>
                      <StructuredListCell>
                        <Link
                          href={`/workout/${workout.slug}`}
                          className="font-semibold text-white hover:text-cds-interactive hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus"
                        >
                          {workout.name}
                        </Link>
                        <span className="cu-helper mt-1 block">
                          {workout.type} · {workout.dateLabel}, {workout.startTime}
                          <span className="md:hidden">
                            {" "}· {workout.durationLabel} · {workout.distanceLabel}
                          </span>
                        </span>
                      </StructuredListCell>
                      <StructuredListCell>
                        <Tag type={effortTagType[workout.badge]} size="sm">
                          {workout.badge}
                        </Tag>
                      </StructuredListCell>
                      <StructuredListCell className="cu-mono hidden md:table-cell">
                        {workout.durationLabel}
                      </StructuredListCell>
                      <StructuredListCell className="cu-mono hidden md:table-cell">
                        {workout.distanceLabel}
                      </StructuredListCell>
                      <StructuredListCell className="cu-mono hidden lg:table-cell">
                        {workout.effort}
                      </StructuredListCell>
                      <StructuredListCell className="cu-mono text-right">
                        {workout.calories == null
                          ? "—"
                          : `+${workout.calories.toLocaleString("en-US")}`}
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            ) : (
              <div className="mt-4 rounded-[22px] bg-black/30 p-8 text-center">
                <p className="cu-heading-03">
                  {isConnected ? "No workouts match this view" : "Connect Strava"}
                </p>
                <p className="cu-body-01 mx-auto mt-2 max-w-md text-cds-text-secondary">
                  {isConnected
                    ? "Try a wider date range or clear the search to see more synced activity."
                    : "Once Strava is connected, this page becomes your searchable activity log."}
                </p>
              </div>
            )}
          </Tile>
        </Column>
      </Grid>
    </PageShell>
  );
}
