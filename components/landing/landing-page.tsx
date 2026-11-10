"use client";

import {
  Accordion,
  AccordionItem,
  Button,
  Column,
  Grid,
  InlineNotification,
  Tile
} from "@carbon/react";
import {
  Activity,
  ArrowRight,
  Bicycle,
  ChartLineData,
  Locked,
  Restaurant
} from "@carbon/icons-react";
import { CarbonHeader } from "@/components/carbon/carbon-header";
import { DashboardBody } from "@/components/carbon/dashboard-body";
import { authErrorCopy } from "@/components/carbon/auth-error-copy";
import { resolveBaseCalories } from "@/lib/nutrition-targets";
import type { SampleDay } from "@/lib/sample-day";

type LandingPageProps = {
  authError?: string;
  disconnected?: boolean;
  sample: SampleDay;
};

const steps = [
  {
    title: "Connect Strava",
    body: "Sign in with Strava. CarbUp imports your last six months of activities and the calories you burned."
  },
  {
    title: "Set your base",
    body: "Enter your maintenance calories and pick a goal: maintain, or lose slow, steady, or fast."
  },
  {
    title: "Eat to your target",
    body: "Each day's target is your base plus that day's training. Log food and track carbs, protein and fat."
  }
];

const features = [
  {
    title: "A target that moves with training",
    body: "Rest days stay at maintenance. Big ride days get the fuel they need, automatically.",
    icon: Activity
  },
  {
    title: "Macros sized for endurance",
    body: "Your target splits into carbs, protein and fat, weighted toward carbs.",
    icon: Bicycle
  },
  {
    title: "Fast food logging",
    body: "Search USDA and Open Food Facts, adjust portions, and save meals you repeat.",
    icon: Restaurant
  },
  {
    title: "Training load at a glance",
    body: "A 7-day strip and trends pages show how hard you've gone and how you've fuelled it.",
    icon: ChartLineData
  }
];

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

/** Compact "today" panel next to the headline, built from the sample data. */
function HeroToday({ sample }: { sample: SampleDay }) {
  const today = sample.calendarDays[sample.calendarDays.length - 1];
  const workouts = sample.workoutsByDate[today.key] ?? [];
  const eaten = sample.nutritionTotalsByDate[today.key]?.calories ?? 0;
  const base = resolveBaseCalories(sample.baseCalories);
  const target = base + today.calories + sample.goalAdjustment;

  return (
    <Tile className="!p-6">
      <p className="cu-label">Today</p>
      <p className="cu-figure cu-accent mt-3">{formatNumber(target - eaten)}</p>
      <p className="cu-body-01 text-cds-text-secondary">kcal remaining</p>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-4 border-y border-[color:var(--cds-border-subtle-00)] py-5">
        <div>
          <p className="cu-helper">Base</p>
          <p className="cu-mono mt-1 text-lg">{formatNumber(base)}</p>
        </div>
        <span className="cu-mono pb-0.5 text-lg text-cds-text-helper" aria-hidden="true">+</span>
        <div>
          <p className="cu-helper">Rides</p>
          <p className="cu-mono cu-accent mt-1 text-lg">{formatNumber(today.calories)}</p>
        </div>
        <span className="cu-mono pb-0.5 text-lg text-cds-text-helper" aria-hidden="true">=</span>
        <div>
          <p className="cu-helper">Target</p>
          <p className="cu-mono mt-1 text-lg">{formatNumber(target)}</p>
        </div>
      </div>

      <ul className="mt-2">
        {workouts.map((workout) => (
          <li
            key={workout.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="cu-body-01 truncate">{workout.name}</p>
              <p className="cu-helper">
                {workout.startTime} · {workout.duration}
              </p>
            </div>
            <p className="cu-mono shrink-0">+{formatNumber(workout.calories ?? 0)}</p>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

const faqs = [
  {
    q: "What does CarbUp read from Strava?",
    a: "Your athlete profile and your activities, including private ones, so the calorie numbers are complete. CarbUp only reads; it never posts or changes anything on Strava."
  },
  {
    q: "How is my daily target calculated?",
    a: "Maintenance calories + calories burned in that day's Strava activities + your goal adjustment (0 to −750 kcal). The target then splits into carbs, protein and fat."
  },
  {
    q: "Is my Strava login stored safely?",
    a: "Your Strava access tokens are encrypted before they're saved, and your session cookie is signed and can't be read by scripts in the browser."
  },
  {
    q: "Can I disconnect?",
    a: "Yes. You can disconnect Strava from Settings at any time."
  }
];

export function LandingPage({ authError, disconnected, sample }: LandingPageProps) {
  return (
    <>
      <CarbonHeader isConnected={false} />
      <main id="main-content" className="min-h-screen bg-cds-background">
        {authError || disconnected ? (
          <Grid className="mt-8">
            <Column sm={4} md={8} lg={16}>
              <InlineNotification
                kind={authError ? "error" : "info"}
                lowContrast
                hideCloseButton
                title={authError ? "Strava connection needs attention" : "Strava disconnected"}
                subtitle={
                  authError
                    ? (authErrorCopy[authError] ??
                      "Something went wrong while connecting Strava.")
                    : "Your Strava account is no longer linked to CarbUp."
                }
              />
            </Column>
          </Grid>
        ) : null}

        {/* Hero */}
        <Grid className="items-center py-12 lg:py-20">
          <Column sm={4} md={8} lg={9}>
            <h1 className="cu-display">
              Eat back the calories you <span className="cu-accent">burn on Strava.</span>
            </h1>
            <p className="cu-body-02 mt-6 max-w-[36rem] text-cds-text-secondary">
              CarbUp adds each day&apos;s Strava activity to your maintenance
              calories, so you get one daily target with the carbs to match.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/api/strava/auth" kind="primary" size="lg" renderIcon={ArrowRight}>
                Connect Strava
              </Button>
              <Button href="/sample" kind="tertiary" size="lg" renderIcon={ArrowRight}>
                See sample day
              </Button>
            </div>
            <p className="cu-helper mt-4 flex items-center gap-2">
              <Locked size={16} aria-hidden="true" />
              Read-only Strava access. Tokens are encrypted.
            </p>
          </Column>
          <Column sm={4} md={8} lg={7} className="mt-10 lg:mt-0">
            <HeroToday sample={sample} />
          </Column>
        </Grid>

        {/* Features band */}
        <section className="bg-cds-layer py-12">
          <Grid>
            {features.map((feature) => (
              <Column key={feature.title} sm={4} md={4} lg={4} className="py-4">
                <feature.icon size={24} className="cu-accent" aria-hidden="true" />
                <h2 className="cu-heading-02 mt-4">{feature.title}</h2>
                <p className="cu-body-01 mt-2 text-cds-text-secondary">{feature.body}</p>
              </Column>
            ))}
          </Grid>
        </section>

        {/* Sample dashboard */}
        <section
          id="sample"
          aria-labelledby="sample-heading"
          className="scroll-mt-12 bg-cds-background py-12 lg:py-16"
        >
          <Grid className="mb-6">
            <Column sm={4} md={8} lg={16}>
              <h2 id="sample-heading" className="cu-heading-03">
                Dashboard preview
              </h2>
            </Column>
          </Grid>
          <DashboardBody {...sample} isConnected={false} isSample headingLevel="h2" />
        </section>

        {/* How it works */}
        <Grid className="py-12 lg:py-16">
          <Column sm={4} md={8} lg={16}>
            <h2 className="cu-heading-05">How it works</h2>
          </Column>
          <Column sm={4} md={8} lg={16} className="mt-8">
            <ol className="grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <Tile className="h-full !p-6">
                    <p className="cu-mono cu-accent text-sm">0{index + 1}</p>
                    <h3 className="cu-heading-03 mt-4">{step.title}</h3>
                    <p className="cu-body-01 mt-2 text-cds-text-secondary">{step.body}</p>
                  </Tile>
                </li>
              ))}
            </ol>
          </Column>
        </Grid>

        {/* FAQ */}
        <Grid id="faq" className="pb-12 lg:pb-16">
          <Column sm={4} md={8} lg={16}>
            <h2 className="cu-heading-05">Questions</h2>
          </Column>
          <Column sm={4} md={8} lg={16} className="mt-8">
            <Accordion>
              {faqs.map((faq) => (
                <AccordionItem key={faq.q} title={faq.q}>
                  <p className="cu-body-01">{faq.a}</p>
                </AccordionItem>
              ))}
            </Accordion>
          </Column>
        </Grid>

        <footer className="py-8">
          <Grid>
            <Column sm={4} md={4} lg={8}>
              <p className="cu-helper">CarbUp. Fuel for the work you put in.</p>
            </Column>
            <Column sm={4} md={4} lg={8} className="md:text-right">
              <p className="cu-helper">Activity data from Strava.</p>
            </Column>
          </Grid>
        </footer>
      </main>
    </>
  );
}
