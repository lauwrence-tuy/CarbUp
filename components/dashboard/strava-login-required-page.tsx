import Link from "next/link";
import { ArrowRight, Flame, LockKeyhole, Settings } from "lucide-react";

type StravaLoginRequiredPageProps = {
  pageName: string;
};

const navigationItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Nutrition", href: "/nutrition" },
  { label: "Workouts", href: "/workouts" },
  { label: "Trends", href: "/trends" }
];

export function StravaLoginRequiredPage({
  pageName
}: StravaLoginRequiredPageProps) {
  return (
    <main className="min-h-screen bg-app-bg text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-24 pt-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-6 rounded-[28px] border border-white/[0.04] bg-app-card/72 px-5 py-4 shadow-card backdrop-blur lg:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-app-card text-app-green shadow-card">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <p className="text-lg font-bold tracking-[0] sm:text-xl">
              Carb<span className="text-app-green">Up</span>
            </p>
          </Link>

          <nav
            className="hidden items-center gap-2 rounded-full bg-black/35 p-1 lg:flex"
            aria-label="Login required navigation"
          >
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  item.label === pageName
                    ? "bg-white text-black"
                    : "text-app-secondary hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/api/strava/auth"
              className="hidden min-h-11 items-center gap-2 rounded-full bg-app-green px-5 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5 sm:inline-flex"
            >
              Connect Strava
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/"
              className="flex size-12 items-center justify-center rounded-full bg-app-card text-app-blue transition hover:bg-app-hover"
              aria-label="Settings"
            >
              <Settings className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <section className="grid flex-1 place-items-center py-12">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/[0.04] bg-app-card p-7 text-center shadow-card sm:p-10">
            <span className="mx-auto flex size-16 items-center justify-center rounded-[24px] bg-app-green text-black shadow-glow">
              <LockKeyhole className="size-8" aria-hidden="true" />
            </span>
            <p className="mt-6 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-app-secondary">
              Strava required
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-white sm:text-5xl">
              Connect Strava to open {pageName}.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-app-secondary">
              CarbUp uses your Strava activity history to calculate training
              calories, targets, workouts, and trends.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/api/strava/auth"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-app-green px-6 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5"
              >
                Connect Strava
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/[0.08] px-6 text-sm font-bold text-white transition hover:bg-white/[0.12]"
              >
                Back home
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
