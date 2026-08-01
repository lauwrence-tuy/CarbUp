"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  Flame,
  Link as LinkIcon,
  LogOut,
  Mail,
  Scale,
  Settings,
  Shield,
  Target
} from "lucide-react";
import type { SettingsActionState } from "@/app/settings/actions";

type GoalType = "maintain" | "lose_slow" | "lose_steady" | "lose_fast";

type SettingsFormProps = {
  action: (
    state: SettingsActionState,
    formData: FormData
  ) => Promise<SettingsActionState>;
  initialSettings: {
    maintenanceCalories: number | null;
    goalType: string;
    goalAdjustment: number;
    everydayActivity: string;
    weight: number | null;
    units: string;
  };
  isStravaConnected: boolean;
};

const appVersion = "0.1.0";

const initialActionState: SettingsActionState = {
  status: "idle",
  message: ""
};

const goals: Array<{
  value: GoalType;
  label: string;
  weeklyKg: number;
}> = [
  {
    value: "maintain",
    label: "Maintain",
    weeklyKg: 0
  },
  {
    value: "lose_slow",
    label: "Lose slow",
    weeklyKg: 0.25
  },
  {
    value: "lose_steady",
    label: "Lose steady",
    weeklyKg: 0.5
  },
  {
    value: "lose_fast",
    label: "Lose fast",
    weeklyKg: 0.75
  }
];

const activityOptions = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Mostly seated days",
    multiplier: 13
  },
  {
    value: "light",
    label: "Light",
    description: "Light walking or errands",
    multiplier: 14
  },
  {
    value: "active",
    label: "Active",
    description: "On your feet often",
    multiplier: 16
  },
  {
    value: "very_active",
    label: "Very active",
    description: "Physical job or busy days",
    multiplier: 18
  }
];

const unitOptions = [
  {
    value: "imperial",
    label: "Imperial",
    description: "Pounds",
    unit: "lb"
  },
  {
    value: "metric",
    label: "Metric",
    description: "Kilograms",
    unit: "kg"
  }
];

const settingsLinks = [
  { href: "/settings/help-support", label: "Help & Support" },
  { href: "/settings/send-feedback", label: "Send Feedback" },
  { href: "/settings/privacy-policy", label: "Privacy Policy" },
  { href: "/settings/terms-of-use", label: "Terms of Use" }
];

function Panel({
  title,
  description,
  children,
  className = ""
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[24px] border border-white/[0.05] bg-app-card p-5 shadow-card ${className}`}
    >
      <div>
        <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-app-secondary">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
        {label}
      </span>
      <div className="mt-2 rounded-[16px] border border-white/[0.06] bg-black/24 px-4 py-3">
        {children}
      </div>
    </label>
  );
}

function AppSelect({
  label,
  name,
  options,
  value,
  onChange
}: {
  label: string;
  name: string;
  options: Array<{
    value: string;
    label: string;
    description: string;
  }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative">
      <input name={name} type="hidden" value={value} />
      <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
        {label}
      </span>
      <button
        className="mt-2 flex min-h-[58px] w-full items-center justify-between gap-4 rounded-[16px] border border-white/[0.06] bg-black/24 px-4 py-3 text-left transition hover:border-app-green/35 hover:bg-black/36"
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block truncate text-base font-bold text-white">
            {selected.label}
          </span>
          <span className="mt-0.5 block truncate text-xs font-semibold text-app-muted">
            {selected.description}
          </span>
        </span>
        <ChevronDown
          className={`size-5 shrink-0 text-app-green transition ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#111214] p-1.5 shadow-card">
          {options.map((option) => {
            const selectedOption = option.value === value;

            return (
              <button
                className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left transition ${
                  selectedOption
                    ? "bg-app-green text-black"
                    : "text-white hover:bg-white/[0.08]"
                }`}
                key={option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {option.label}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-xs font-semibold ${
                      selectedOption ? "text-black/65" : "text-app-muted"
                    }`}
                  >
                    {option.description}
                  </span>
                </span>
                {selectedOption ? (
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "white"
}: {
  label: string;
  value: string;
  tone?: "white" | "green" | "blue" | "yellow" | "purple";
}) {
  const toneClass = {
    white: "text-white",
    green: "text-app-green",
    blue: "text-app-blue",
    yellow: "text-app-yellow",
    purple: "text-app-purple"
  }[tone];

  return (
    <div className="rounded-[18px] border border-white/[0.05] bg-black/24 p-4">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold tracking-[-0.04em] ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function getWeightInPounds(weight: number, units: string) {
  return units === "metric" ? weight * 2.2046226218 : weight;
}

function calculateBaseTdee({
  everydayActivity,
  units,
  weight
}: {
  everydayActivity: string;
  units: string;
  weight: number;
}) {
  const selectedActivity =
    activityOptions.find((option) => option.value === everydayActivity) ??
    activityOptions[2];

  return Math.round(getWeightInPounds(weight, units) * selectedActivity.multiplier);
}

function formatWeightInput(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getGoalDescription(weeklyKg: number, units: string) {
  if (weeklyKg === 0) {
    return "Hold current weight";
  }

  if (units === "metric") {
    return `About ${weeklyKg.toLocaleString()} kg per week`;
  }

  return `About ${(weeklyKg * 2.2046226218).toFixed(1)} lb per week`;
}

export function SettingsForm({
  action,
  initialSettings,
  isStravaConnected
}: SettingsFormProps) {
  const initialGoal = goals.some((goal) => goal.value === initialSettings.goalType)
    ? (initialSettings.goalType as GoalType)
    : "maintain";
  const [goalType, setGoalType] = useState<GoalType>(initialGoal);
  const [everydayActivity, setEverydayActivity] = useState(
    initialSettings.everydayActivity || "active"
  );
  const [units, setUnits] = useState(initialSettings.units || "imperial");
  const [weight, setWeight] = useState(String(initialSettings.weight ?? 140));
  const [state, formAction, pending] = useActionState(action, initialActionState);

  const weightNumber = Number(weight) || 0;
  const displayUnit = units === "metric" ? "kg" : "lb";
  const baseTdee =
    weightNumber > 0
      ? calculateBaseTdee({ everydayActivity, units, weight: weightNumber })
      : 0;
  const protein = Math.round(weightNumber * (units === "metric" ? 1.8 : 0.8));
  const fat = Math.round(weightNumber * (units === "metric" ? 1 : 0.45));
  const goalAdjustment = {
    maintain: 0,
    lose_slow: -250,
    lose_steady: -500,
    lose_fast: -750
  }[goalType];
  const calorieBudget = Math.max(baseTdee + goalAdjustment, 0);
  const carbs = Math.max(
    Math.round((calorieBudget - protein * 4 - fat * 9) / 4),
    0
  );
  const canSave = baseTdee >= 1000 && weightNumber > 0;

  function updateUnits(nextUnits: string) {
    if (nextUnits === units) {
      return;
    }

    const currentWeight = Number(weight);

    if (Number.isFinite(currentWeight) && currentWeight > 0) {
      const convertedWeight =
        nextUnits === "metric" ? currentWeight / 2.2046226218 : currentWeight * 2.2046226218;

      setWeight(formatWeightInput(convertedWeight));
    }

    setUnits(nextUnits);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-[28px] border border-white/[0.05] bg-app-card p-5 shadow-card xl:sticky xl:top-6 xl:self-start">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-app-green text-black">
          <Settings className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-6 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-app-secondary">
          Settings
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-none tracking-[-0.04em] text-white">
          Control center
        </h1>
        <p className="mt-4 text-sm leading-6 text-app-secondary">
          Tune your calorie target, macro split, units, and connected services
          from one desktop-friendly view.
        </p>

        <div className="mt-6 grid gap-3">
          <div className="rounded-[18px] border border-white/[0.05] bg-black/24 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-app-green/15 text-app-green">
                  <LinkIcon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Strava</p>
                  <p className="text-xs text-app-secondary">
                    {isStravaConnected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              {isStravaConnected ? (
                <span className="rounded-full bg-app-green/15 px-3 py-1 text-xs font-bold text-app-green">
                  Live
                </span>
              ) : null}
            </div>

            {isStravaConnected ? (
              <form action="/api/strava/disconnect" className="mt-4" method="post">
                <button
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-app-red/12 px-5 text-sm font-bold text-app-red transition hover:bg-app-red hover:text-white"
                  type="submit"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Disconnect Strava
                </button>
              </form>
            ) : (
              <Link
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-app-green px-5 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5"
                href="/api/strava/auth"
              >
                Connect Strava
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>

          <div className="rounded-[18px] border border-white/[0.05] bg-black/24 p-4">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
              Version
            </p>
            <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">
              {appVersion}
            </p>
          </div>
        </div>
      </aside>

      <div className="space-y-5">
        {state.message ? (
          <div
            className={`rounded-[20px] border px-5 py-4 ${
              state.status === "success"
                ? "border-app-green/20 bg-app-green/10 text-app-green"
                : "border-app-red/20 bg-app-red/10 text-app-red"
            }`}
          >
            <p className="text-sm font-bold">{state.message}</p>
          </div>
        ) : null}

        <form action={formAction}>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel
              title="Profile"
              description="Activity level is separate from Strava workouts. Rides are added on top of your target automatically."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <AppSelect
                  label="Activity Level"
                  name="everydayActivity"
                  onChange={setEverydayActivity}
                  options={activityOptions}
                  value={everydayActivity}
                />

                <AppSelect
                  label="Units"
                  name="units"
                  onChange={updateUnits}
                  options={unitOptions}
                  value={units}
                />

                <Field label="Weight">
                  <div className="flex items-center gap-2">
                    <Scale className="size-5 text-app-blue" aria-hidden="true" />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none"
                      inputMode="decimal"
                      name="weight"
                      onChange={(event) => setWeight(event.target.value)}
                      type="number"
                      value={weight}
                    />
                    <span className="text-sm font-semibold text-app-secondary">
                      {displayUnit}
                    </span>
                  </div>
                </Field>

                <Field label="Base TDEE">
                  <div className="flex items-center gap-2">
                    <Flame className="size-5 text-app-green" aria-hidden="true" />
                    <input
                      name="maintenanceCalories"
                      type="hidden"
                      value={baseTdee}
                    />
                    <span className="min-w-0 flex-1 text-base font-bold text-white">
                      {baseTdee > 0 ? baseTdee.toLocaleString() : "--"}
                    </span>
                    <span className="text-sm font-semibold text-app-secondary">
                      kcal
                    </span>
                  </div>
                </Field>
              </div>
            </Panel>

            <Panel title="Your Goal" description="Sets the base calorie adjustment before activity calories are added.">
              <div className="grid gap-3 sm:grid-cols-2">
                {goals.map((goal) => {
                  const selected = goal.value === goalType;

                  return (
                    <label
                      key={goal.value}
                      className={`cursor-pointer rounded-[18px] border p-4 transition hover:bg-app-hover ${
                        selected
                          ? "border-app-green bg-app-green/10"
                          : "border-white/[0.05] bg-black/24"
                      }`}
                    >
                      <input
                        checked={selected}
                        className="sr-only"
                        name="goalType"
                        onChange={() => setGoalType(goal.value)}
                        type="radio"
                        value={goal.value}
                      />
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block text-base font-bold text-white">
                            {goal.label}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-app-secondary">
                            {getGoalDescription(goal.weeklyKg, units)}
                          </span>
                        </span>
                        {selected ? (
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-app-green text-black">
                            <Check className="size-4" aria-hidden="true" />
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Nutrition Preview" className="lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-4">
                <Stat
                  label="Daily Target"
                  value={calorieBudget.toLocaleString()}
                  tone="green"
                />
                <Stat label="Protein" value={`${protein}g`} tone="blue" />
                <Stat label="Carbs" value={`${carbs}g`} tone="yellow" />
                <Stat label="Fat" value={`${fat}g`} tone="purple" />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/[0.05] bg-black/24 p-4">
                <div className="flex items-center gap-3">
                  <Target className="size-5 text-app-green" aria-hidden="true" />
                  <span className="text-sm font-semibold text-app-secondary">
                    {baseTdee.toLocaleString()} base{" "}
                    {goalAdjustment === 0
                      ? "+ 0 goal"
                      : `${goalAdjustment > 0 ? "+" : "-"} ${Math.abs(goalAdjustment).toLocaleString()} goal`}{" "}
                    = {calorieBudget.toLocaleString()} kcal before Strava
                  </span>
                </div>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-app-green px-6 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pending || !canSave}
                  type="submit"
                >
                  {pending ? "Saving" : "Save Settings"}
                </button>
              </div>
            </Panel>
          </div>
        </form>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Panel title="Integrations">
            <div className="grid gap-3">
              <div className="flex min-h-16 items-center justify-between gap-4 rounded-[18px] border border-white/[0.05] bg-black/24 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Activity className="size-5 text-app-orange" aria-hidden="true" />
                  <div>
                    <p className="text-base font-bold text-white">Strava</p>
                    <p className="text-sm text-app-secondary">
                      {isStravaConnected
                        ? "Sync rides and activity calories"
                        : "Connect to import ride calories"}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-app-green">
                  {isStravaConnected ? "Connected" : "Available"}
                </span>
              </div>

              <div className="flex min-h-16 items-center justify-between gap-4 rounded-[18px] border border-white/[0.05] bg-black/24 px-4 py-3 opacity-70">
                <div className="flex items-center gap-3">
                  <Shield className="size-5 text-app-blue" aria-hidden="true" />
                  <div>
                    <p className="text-base font-bold text-white">TrainingPeaks</p>
                    <p className="text-sm text-app-secondary">
                      Calendar import support
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-app-secondary">
                  Coming soon
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Support & Legal">
            <div className="grid gap-3 sm:grid-cols-2">
              {settingsLinks.map((item) => (
                <Link
                  className="group flex min-h-16 items-center justify-between gap-4 rounded-[18px] border border-white/[0.05] bg-black/24 px-4 py-3 transition hover:border-app-green/40 hover:bg-app-hover"
                  href={item.href}
                  key={item.href}
                >
                  <span className="flex items-center gap-3 text-base font-bold text-white">
                    {item.label === "Send Feedback" ? (
                      <Mail className="size-5 text-app-blue" aria-hidden="true" />
                    ) : (
                      <Shield className="size-5 text-app-blue" aria-hidden="true" />
                    )}
                    {item.label}
                  </span>
                  <ChevronRight
                    className="size-5 text-app-secondary transition group-hover:translate-x-0.5 group-hover:text-app-green"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
