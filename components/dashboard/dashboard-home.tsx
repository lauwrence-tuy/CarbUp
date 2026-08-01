import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Flame,
  Gauge,
  Info,
  Settings,
  Sparkles,
  Target,
  Zap
} from "lucide-react";
import { DailyCalorieCard } from "./daily-calorie-card";
import { FloatingActionButton } from "./floating-action-button";
import { MetricCard } from "./metric-card";
import { WeeklyCalendar } from "./weekly-calendar";
import { WorkoutHistoryCard } from "./workout-history-card";

type DashboardHomeProps = {
  isConnected?: boolean;
  authStatus?: "connected";
  authError?: string;
};

const authErrorCopy: Record<string, string> = {
  access_denied: "Strava connection was canceled.",
  invalid_state: "The Strava login session expired. Try connecting again.",
  missing_activity_scope: "Activity read permission is required to import rides.",
  missing_athlete: "Strava did not return an athlete profile.",
  token_exchange_failed: "Strava token exchange failed. Check your app settings.",
  missing_strava_config: "Add your Strava OAuth values to .env before connecting.",
  invalid_strava_client_id:
    "STRAVA_CLIENT_ID must be the numeric Client ID from your Strava API app, not the placeholder text.",
  invalid_strava_secret_config:
    "Replace STRAVA_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY placeholder values in .env before connecting."
};

const demoWorkouts = [
  {
    id: "demo-1",
    slug: "z2-endurance-ride",
    name: "Z2 Endurance Ride",
    type: "Ride",
    calories: 1540,
    duration: "142 min",
    distance: "42.8 mi",
    startTime: "7:12 AM",
    effort: 98,
    badge: "Hard" as const
  },
  {
    id: "demo-2",
    slug: "hill-repeats",
    name: "Hill Repeats",
    type: "Ride",
    calories: 303,
    duration: "31 min",
    distance: "8.4 mi",
    startTime: "5:48 PM",
    effort: 112,
    badge: "Very Hard" as const
  }
];

const demoCalendarDays = [
  { key: "demo-tue", day: "Tue", date: 16, calories: 0, load: 0, activityCount: 0, isToday: false },
  { key: "demo-wed", day: "Wed", date: 17, calories: 420, load: 42, activityCount: 1, isToday: false },
  { key: "demo-thu", day: "Thu", date: 18, calories: 0, load: 0, activityCount: 0, isToday: false },
  { key: "demo-fri", day: "Fri", date: 19, calories: 1843, load: 210, activityCount: 2, isToday: true },
  { key: "demo-sat", day: "Sat", date: 20, calories: 0, load: 0, activityCount: 0, isToday: false },
  { key: "demo-sun", day: "Sun", date: 21, calories: 0, load: 0, activityCount: 0, isToday: false },
  { key: "demo-mon", day: "Mon", date: 22, calories: 0, load: 0, activityCount: 0, isToday: false }
];

const demoNutrition = {
  eatenCalories: 1285,
  remainingCalories: 2655,
  macros: {
    protein: 72,
    carbs: 168,
    fat: 36
  }
};

const demoEfficiencyBuckets = [
  {
    date: "Jul 2",
    workouts: 3,
    calories: "1.2k kcal",
    detail: "3h 21m - 10.9 mi"
  },
  {
    date: "Jul 9",
    workouts: 4,
    calories: "1.6k kcal",
    detail: "4h 0m - 13.1 mi"
  },
  {
    date: "Jul 16",
    workouts: 3,
    calories: "4.2k kcal",
    detail: "7h 14m - 123.7 mi"
  },
  {
    date: "Jul 23",
    workouts: 4,
    calories: "6.4k kcal",
    detail: "10h 39m - 190.6 mi"
  }
];

function DemoEfficiencyCard() {
  return (
    <section className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card">
      <div className="flex items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ffdd00] text-black">
          <Gauge className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
            Efficiency
          </h2>
          <p className="mt-1 text-sm text-app-muted">
            Past 4 weeks, one week per bucket
          </p>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-x-7 gap-y-8 sm:grid-cols-4">
        {demoEfficiencyBuckets.map((bucket) => (
          <div key={bucket.date}>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-app-muted">
              {bucket.date}
            </p>
            <p className="mt-5 text-2xl font-bold tracking-[-0.03em] text-white">
              {bucket.workouts}
            </p>
            <p className="mt-1 text-sm text-white">workouts</p>
            <p className="mt-5 text-sm font-bold text-[#ffdd00]">
              {bucket.calories}
            </p>
            <p className="mt-1 text-xs text-app-muted">{bucket.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardHome({
  isConnected = false,
  authStatus,
  authError
}: DashboardHomeProps) {
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

          <nav
            className="hidden items-center gap-2 rounded-full bg-black/35 p-1 lg:flex"
            aria-label="Landing navigation"
          >
            {[
              {
                label: "Dashboard",
                href: isConnected ? "/dashboard" : "/"
              },
              {
                label: "Nutrition",
                href: isConnected ? "/nutrition" : "/"
              },
              {
                label: "Workouts",
                href: isConnected ? "/workouts" : "/"
              },
              {
                label: "Trends",
                href: isConnected ? "/trends" : "/"
              }
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-bold text-app-secondary transition hover:bg-white/[0.08] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={isConnected ? "/dashboard" : "/api/strava/auth"}
              className="hidden min-h-11 items-center gap-2 rounded-full bg-app-green px-5 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5 lg:inline-flex"
            >
              {isConnected ? "Dashboard" : "Connect Strava"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <button
              className="flex size-12 items-center justify-center rounded-full bg-app-card text-app-blue transition hover:bg-app-hover"
              type="button"
              aria-label="Calorie target details"
            >
              <Info className="size-5" aria-hidden="true" />
            </button>
            <Link
              href={isConnected ? "/settings" : "/"}
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
                ? "Your tokens were saved server-side. The next step is syncing today's activities."
                : authErrorCopy[authError ?? ""] ??
                  "Something went wrong while connecting Strava."}
            </p>
          </section>
        ) : null}

        <section
          id="dashboard"
          className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)] xl:grid-cols-[minmax(0,1.22fr)_minmax(450px,0.78fr)]"
        >
          <div className="rounded-[32px] border border-white/[0.04] bg-app-card p-6 shadow-card lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-app-secondary">
                  Today - Friday 19
                </p>
                <h1 className="mt-3 max-w-2xl text-5xl font-bold leading-[0.96] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                  Eat back your{" "}
                  <span className="text-app-green">ride calories</span>.
                </h1>
              </div>
              <div className="rounded-[24px] bg-black/28 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Zap
                    className="size-5 fill-app-green text-app-green"
                    aria-hidden="true"
                  />
                  Very hard training day
                </div>
                <p className="mt-1 text-sm text-app-secondary">
                  Goal mode - Maintain
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] bg-black/28 p-5">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-app-secondary">
                  Base calories
                </p>
                <p className="mt-3 text-4xl font-bold tracking-[-0.04em] text-white">
                  2,400
                </p>
                <p className="mt-1 text-sm text-app-muted">maintenance kcal</p>
              </div>
              <div className="rounded-[28px] bg-black/28 p-5">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-app-secondary">
                  Exercise calories
                </p>
                <p className="mt-3 text-4xl font-bold tracking-[-0.04em] text-app-green">
                  +1,540
                </p>
                <p className="mt-1 text-sm text-app-muted">from Strava rides</p>
              </div>
              <div className="rounded-[28px] bg-app-green p-5 text-black">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-black/65">
                  Today&apos;s target
                </p>
                <p className="mt-3 text-4xl font-bold tracking-[-0.04em]">
                  3,940
                </p>
                <p className="mt-1 text-sm font-semibold text-black/65">
                  kcal to fuel recovery
                </p>
              </div>
            </div>

            <div
              id="nutrition"
              className="mt-7 rounded-[28px] border border-white/[0.04] bg-black/24 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-app-green/12 text-app-green">
                    <Sparkles className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-white">
                      Base Calories + Exercise Calories = Today&apos;s Target
                    </p>
                    <p className="mt-1 text-sm text-app-secondary">
                      Import rides and the nutrition target moves with your
                      training load.
                    </p>
                  </div>
                </div>
                <Link
                  href="/api/strava/auth"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black transition hover:-translate-y-0.5"
                >
                  Sync Strava
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <DailyCalorieCard
              baseCalories={2400}
              exerciseCalories={1540}
              goalAdjustment={0}
              eatenCalories={demoNutrition.eatenCalories}
              eatenMacros={demoNutrition.macros}
            />
            <section className="rounded-[28px] border border-white/[0.04] bg-app-card p-5 shadow-card">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                    Calendar
                  </h2>
                  <p className="mt-1 text-sm text-app-muted">
                    Training load by day
                  </p>
                </div>
                <span className="rounded-full bg-app-green/15 px-3 py-1 text-xs font-bold text-app-green">
                  Active
                </span>
              </div>
              <WeeklyCalendar days={demoCalendarDays} />
            </section>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Base"
            value="2,400"
            detail="maintenance kcal"
            icon={Target}
            tone="green"
          />
          <MetricCard
            label="Ride burn"
            value="+1,540"
            detail="Strava kcal"
            icon={Activity}
            tone="orange"
          />
          <MetricCard
            label="Remaining"
            value={demoNutrition.remainingCalories.toLocaleString()}
            detail={`${demoNutrition.eatenCalories.toLocaleString()} kcal eaten`}
            icon={Flame}
            tone="blue"
          />
        </section>

        <section
          id="trends"
          className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
        >
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1">
            <DemoEfficiencyCard />
          </div>
          <div id="workouts">
            <WorkoutHistoryCard
              workouts={demoWorkouts}
              totalCalories={1843}
              isConnected={false}
            />
          </div>
        </section>
      </div>
      <FloatingActionButton />
    </main>
  );
}
