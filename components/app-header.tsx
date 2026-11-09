import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Flame, Settings } from "lucide-react";

export const appSections = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Nutrition", href: "/nutrition" },
  { label: "Workouts", href: "/workouts" },
  { label: "Trends", href: "/trends" }
] as const;

export type AppSection = (typeof appSections)[number]["label"];

type AppHeaderProps = {
  isConnected: boolean;
  /** The section to highlight in the nav. */
  active?: AppSection;
  /** Hide the section nav (e.g. on Settings). */
  showNav?: boolean;
  /** Replaces the default right-hand buttons (Connect Strava + Settings). */
  actions?: ReactNode;
};

/** The logo / section nav / settings bar at the top of every page. */
export function AppHeader({
  isConnected,
  active,
  showNav = true,
  actions
}: AppHeaderProps) {
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

      {showNav ? (
        <nav
          className="hidden items-center gap-2 rounded-full bg-black/35 p-1 lg:flex"
          aria-label="Main navigation"
        >
          {appSections.map((section) => (
            <Link
              key={section.label}
              href={section.href}
              aria-current={section.label === active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                section.label === active
                  ? "bg-white text-black"
                  : "text-app-secondary hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {section.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="flex items-center gap-3">
        {actions ?? (
          <>
            {!isConnected ? <ConnectStravaLink /> : null}
            <SettingsLink isConnected={isConnected} />
          </>
        )}
      </div>
    </header>
  );
}

export function ConnectStravaLink({
  href = "/api/strava/auth",
  label = "Connect Strava",
  className = "sm:inline-flex"
}: {
  href?: string;
  label?: string;
  /** Breakpoint at which the button appears. */
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`hidden min-h-11 items-center gap-2 rounded-full bg-app-green px-5 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5 ${className}`}
    >
      {label}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

export function SettingsLink({ isConnected }: { isConnected: boolean }) {
  return (
    <Link
      href={isConnected ? "/settings" : "/"}
      className="flex size-12 items-center justify-center rounded-full bg-app-card text-app-blue transition hover:bg-app-hover"
      aria-label="Settings"
    >
      <Settings className="size-5" aria-hidden="true" />
    </Link>
  );
}
