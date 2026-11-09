import Link from "next/link";
import { ArrowRight, Flame, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", active: false },
  { label: "Nutrition", href: "/nutrition", active: true },
  { label: "Workouts", href: "/workouts", active: false },
  { label: "Trends", href: "/trends", active: false }
];

export function NutritionHeader({ isConnected }: { isConnected: boolean }) {
  return (
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
        aria-label="Nutrition navigation"
      >
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={isConnected ? item.href : "/"}
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
  );
}
