"use client";

import { Button, Column, Grid } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { CarbonHeader } from "@/components/carbon/carbon-header";

type StravaLoginRequiredPageProps = {
  pageName: "Dashboard" | "Nutrition" | "Workouts" | "Trends";
};

export function StravaLoginRequiredPage({
  pageName
}: StravaLoginRequiredPageProps) {
  return (
    <>
      <CarbonHeader isConnected={false} />
      <main id="main-content" className="min-h-screen bg-cds-background">
        <Grid className="py-16 lg:py-24">
          <Column sm={4} md={6} lg={10}>
            <p className="cu-label">Strava required</p>
            <h1 className="cu-display mt-4">Connect Strava to open {pageName}.</h1>
            <p className="cu-body-02 mt-6 max-w-[40rem] text-cds-text-secondary">
              CarbUp uses your Strava activity history to calculate training
              calories, targets, workouts, and trends.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button href="/api/strava/auth" kind="primary" size="lg" renderIcon={ArrowRight}>
                Connect Strava
              </Button>
              <Button href="/" kind="tertiary" size="lg">
                Back home
              </Button>
            </div>
          </Column>
        </Grid>
      </main>
    </>
  );
}
