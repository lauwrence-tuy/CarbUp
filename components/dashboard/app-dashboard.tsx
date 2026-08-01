"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Flame,
  Settings,
  Utensils
} from "lucide-react";
import { SyncedDashboardSummary } from "./synced-dashboard-nutrition";
import type { NutritionTotals } from "./nutrition-diary-storage";
import { WeeklyCalendar, type CalendarDay } from "./weekly-calendar";
import { WorkoutHistoryCard, type Workout } from "./workout-history-card";

type AppDashboardProps = {
  isConnected: boolean;
  authStatus?: "connected";
  authError?: string;
  baseCalories: number;
  activityCalories: number;
  goalAdjustment: number;
  workouts: Workout[];
  workoutsByDate: Record<string, Workout[]>;
  nutritionTotalsByDate: Record<string, NutritionTotals>;
  trainingLoad: number;
  calendarDays: CalendarDay[];
};

const authErrorCopy: Record<string, string> = {
  access_denied: "Strava connection was canceled.",
  invalid_state: "The Strava login session expired. Try connecting again.",
  missing_activity_scope: "Activity read permission is required to import rides.",
  missing_athlete: "Strava did not return an athlete profile.",
  token_exchange_failed: "Strava token exchange failed. Check your app settings.",
  missing_strava_config: "Add your Strava OAuth values to .env before connecting.",
  invalid_strava_client_id:
    "STRAVA_CLIENT_ID must be the numeric Client ID from your Strava API app.",
  invalid_strava_secret_config:
    "Replace STRAVA_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY placeholder values in .env."
};
export function AppDashboard({
  isConnected,
  authStatus,
  authError,
  baseCalories,
  activityCalories,
  goalAdjustment,
  workouts,
  workoutsByDate,
  nutritionTotalsByDate,
  trainingLoad,
  calendarDays
}: AppDashboardProps) {
  const todayDateKey = calendarDays.find((day) => day.isToday)?.key;
  const [selectedDateKey, setSelectedDateKey] = useState(
    todayDateKey ?? calendarDays[calendarDays.length - 1]?.key ?? ""
  );
  const selectedDay =
    calendarDays.find((day) => day.key === selectedDateKey) ??
    calendarDays.find((day) => day.isToday) ??
    calendarDays[calendarDays.length - 1];
  const selectedWorkouts = useMemo(
    () => (selectedDateKey ? (workoutsByDate[selectedDateKey] ?? []) : workouts),
    [selectedDateKey, workouts, workoutsByDate]
  );
  const selectedActivityCalories = selectedDay?.calories ?? activityCalories;
  const selectedTrainingLoad = selectedDay?.load ?? trainingLoad;
  const selectedNutritionTotals = nutritionTotalsByDate[selectedDateKey] ?? {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  };
  const selectedDateLabel = selectedDay
    ? selectedDay.isToday
      ? "Today"
      : formatDashboardDateLabel(selectedDay.key)
    : "Today";
  const selectedDateContextLabel = selectedDay
    ? formatDashboardFullDateLabel(selectedDay.key)
    : selectedDateLabel;
  const loadStatus =
    selectedTrainingLoad >= 600
      ? "High"
      : selectedTrainingLoad >= 300
        ? "Moderate"
        : selectedTrainingLoad > 0
          ? "Easy"
          : "Rest";

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
            <div>
              <p className="text-lg font-bold tracking-[-0.04em] sm:text-xl">
                Carb
                <span className="text-app-green">Up</span>
              </p>
            </div>
          </Link>

          {isConnected ? (
            <nav
              className="hidden items-center gap-2 rounded-full bg-black/35 p-1 lg:flex"
              aria-label="Dashboard navigation"
            >
              {[
                { label: "Dashboard", href: "/dashboard", active: true },
                { label: "Nutrition", href: "/nutrition", active: false },
                { label: "Workouts", href: "/workouts", active: false },
                { label: "Trends", href: "/trends", active: false }
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
          ) : null}

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

        {authStatus === "connected" || authError ? (
          <section
            className={`mt-5 rounded-[24px] border p-5 shadow-card ${
              authStatus === "connected"
                ? "border-app-green/20 bg-app-green/10"
                : "border-app-red/20 bg-app-red/10"
            }`}
          >
            <p
              className={`text-sm font-bold ${
                authStatus === "connected" ? "text-app-green" : "text-app-red"
              }`}
            >
              {authStatus === "connected"
                ? "Strava connected"
                : "Strava connection needs attention"}
            </p>
            <p className="mt-1 text-sm text-app-secondary">
              {authStatus === "connected"
                ? "Use Sync Strava on the workouts card to import recent activities."
                : authErrorCopy[authError ?? ""] ??
                  "Something went wrong while connecting Strava."}
            </p>
          </section>
        ) : null}

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold leading-none text-white sm:text-5xl">
                {selectedDateLabel}
              </h1>
              <p className="mt-3 text-base text-app-secondary">
                Fuel, workouts, and training load for {selectedDateContextLabel}.
              </p>
            </div>
          </div>
        </section>

        <div id="nutrition" className="mt-6">
          <SyncedDashboardSummary
            baseCalories={baseCalories}
            activityCalories={selectedActivityCalories}
            dateKey={selectedDateKey}
            dateLabel={selectedDateLabel}
            goalAdjustment={goalAdjustment}
            totals={selectedNutritionTotals}
          />
        </div>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(380px,0.88fr)]">
          <div id="trends">
              <DashboardTrainingPanel
                dateLabel={selectedDateLabel}
                load={selectedTrainingLoad}
                onSelectDate={setSelectedDateKey}
                selectedDateKey={selectedDateKey}
                status={loadStatus}
                days={calendarDays}
              />
          </div>

          <div className="space-y-5">
            <div id="workouts">
              <WorkoutHistoryCard
                dateLabel={selectedDateLabel}
                workouts={selectedWorkouts}
                totalCalories={selectedActivityCalories}
                isConnected={isConnected}
              />
            </div>
            <QuickActions />
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardTrainingPanel({
  dateLabel,
  load,
  onSelectDate,
  selectedDateKey,
  status,
  days
}: {
  dateLabel: string;
  load: number;
  onSelectDate: (dateKey: string) => void;
  selectedDateKey: string;
  status: string;
  days: CalendarDay[];
}) {
  const maxLoad = Math.max(...days.map((day) => day.load), 1);

  return (
    <section className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-app-green text-black">
            <BarChart3 className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
              7-day training
            </h2>
            <p className="mt-1 text-sm text-app-muted">
              Calendar and load
            </p>
          </div>
        </div>
        <span className="rounded-full bg-app-green/15 px-3 py-1 text-xs font-bold text-app-green">
          {status}
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
            {dateLabel} load
          </p>
          <p className="mt-2 text-5xl font-bold leading-none text-white">
            {load}
          </p>
        </div>
        <Link
          href="/trends"
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-app-green px-4 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5"
        >
          Trends
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 flex items-end gap-2">
        {days.map((day) => (
          <button
            key={day.key}
            className="flex flex-1 flex-col items-center gap-2 transition hover:-translate-y-0.5"
            onClick={() => onSelectDate(day.key)}
            type="button"
            aria-label={`Show ${formatDashboardDateLabel(day.key)}`}
          >
            <span
              className={`w-full rounded-full ${
                day.key === selectedDateKey ? "bg-app-green" : "bg-white/[0.10]"
              }`}
              style={{
                height: Math.max(16, Math.round((day.load / maxLoad) * 58))
              }}
            />
            <span className="text-[0.65rem] font-bold uppercase tracking-wide text-app-muted">
              {day.day}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        <WeeklyCalendar
          days={days}
          onSelectDate={onSelectDate}
          selectedDateKey={selectedDateKey}
        />
      </div>
    </section>
  );
}

function formatDashboardDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateKey}T12:00:00`));
}

function formatDashboardFullDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateKey}T12:00:00`));
}

function QuickActions() {
  return (
    <section className="rounded-[28px] border border-white/[0.04] bg-app-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
            Quick actions
          </h2>
          <p className="mt-1 text-sm text-app-muted">
            Jump to the next task
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
        <QuickAction href="/nutrition" icon={Utensils} label="Log food" />
        <QuickAction href="/workouts" icon={CalendarDays} label="Workouts" />
        <QuickAction href="/settings" icon={Settings} label="Settings" />
      </div>
    </section>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label
}: {
  href: string;
  icon: typeof Utensils;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center justify-between gap-3 rounded-full bg-black/28 px-4 text-sm font-bold text-white transition hover:bg-white hover:text-black"
    >
      <span className="flex items-center gap-3">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
