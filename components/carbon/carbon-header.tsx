"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Column, Grid } from "@carbon/react";
import { ArrowRight, Flame, Menu, Settings, X } from "lucide-react";

const sections = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Nutrition", href: "/nutrition" },
  { label: "Workouts", href: "/workouts" },
  { label: "Trends", href: "/trends" }
];

type CarbonHeaderProps = {
  isConnected: boolean;
};

/** The original CarbUp header: a floating rounded bar, aligned to the page grid. */
export function CarbonHeader({ isConnected }: CarbonHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <Grid className="relative z-20 pt-6">
      <Column sm={4} md={8} lg={16}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded-full focus:bg-cds-interactive focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-black"
        >
          Skip to main content
        </a>
        <header className="flex items-center justify-between gap-4 rounded-[28px] border border-white/[0.04] bg-cds-layer px-4 py-3 shadow-[var(--cu-shadow-card)] sm:px-5 sm:py-4 lg:px-6">
          <Link
            href={isConnected ? "/dashboard" : "/"}
            className="flex items-center gap-3 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cds-focus"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-cds-interactive sm:size-11">
              <Flame className="size-5 sm:size-6" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-[-0.04em] sm:text-xl">
              Carb<span className="text-cds-interactive">Up</span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-2 rounded-full bg-black/35 p-1 lg:flex"
            aria-label="Main navigation"
          >
            {sections.map((section) => (
              <NavLink
                key={section.href}
                {...section}
                isActive={pathname.startsWith(section.href)}
              />
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {isConnected ? (
              <Link
                href="/settings"
                aria-label="Settings"
                className="flex size-11 items-center justify-center rounded-full bg-black/30 text-cds-text-secondary transition hover:bg-cds-layer-hover hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus"
              >
                <Settings className="size-5" aria-hidden="true" />
              </Link>
            ) : (
              // Plain <a>: a Next <Link> to an API route fires a client fetch first,
              // which hits /api/strava/auth twice and can mismatch the OAuth state.
              <a
                href="/api/strava/auth"
                aria-label="Connect Strava"
                className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-cds-interactive px-4 text-sm font-bold text-black shadow-[var(--cu-shadow-glow)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-5"
              >
                <span className="sm:hidden">Connect</span>
                <span className="hidden sm:inline">Connect Strava</span>
                <ArrowRight className="hidden size-4 sm:block" aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex size-11 items-center justify-center rounded-full bg-black/30 text-white transition hover:bg-cds-layer-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus lg:hidden"
            >
              {menuOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        {menuOpen ? (
          <nav
            id="mobile-nav"
            aria-label="Main navigation"
            className="absolute inset-x-4 mt-2 flex flex-col gap-1 rounded-[24px] border border-white/[0.06] bg-cds-layer p-2 shadow-[var(--cu-shadow-card)] md:inset-x-8 lg:hidden"
          >
            {sections.map((section) => (
              <NavLink
                key={section.href}
                {...section}
                isActive={pathname.startsWith(section.href)}
                block
              />
            ))}
          </nav>
        ) : null}
      </Column>
    </Grid>
  );
}

function NavLink({
  label,
  href,
  isActive,
  block = false
}: {
  label: string;
  href: string;
  isActive: boolean;
  block?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus ${
        block ? "py-3" : ""
      } ${
        isActive
          ? "bg-white text-black"
          : "text-cds-text-secondary hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
