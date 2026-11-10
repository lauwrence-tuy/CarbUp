"use client";

import { Button, Column, Grid } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import type { SampleDay } from "@/lib/sample-day";
import { CarbonHeader } from "./carbon-header";
import { DashboardBody } from "./dashboard-body";

/** The dashboard filled with sample data, for visitors who haven't connected Strava. */
export function SampleDashboard({ sample }: { sample: SampleDay }) {
  return (
    <>
      <CarbonHeader isConnected={false} />
      <main id="main-content" className="min-h-screen bg-cds-background pb-16 pt-8">
        <Grid className="mb-8">
          <Column sm={4} md={8} lg={16}>
            <div
              role="status"
              className="cu-banner flex flex-wrap items-center justify-between gap-4 px-5 py-4"
            >
              <p className="cu-body-01">
                <span className="font-semibold">You&apos;re viewing sample data.</span>{" "}
                <span className="text-cds-text-secondary">
                  Connect Strava to see your own targets, workouts and macros.
                </span>
              </p>
              <Button href="/api/strava/auth" kind="tertiary" size="sm" renderIcon={ArrowRight}>
                Connect Strava
              </Button>
            </div>
          </Column>
        </Grid>
        <DashboardBody {...sample} isConnected={false} isSample />
      </main>
    </>
  );
}
