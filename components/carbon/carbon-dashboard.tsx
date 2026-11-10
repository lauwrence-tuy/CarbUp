"use client";

import { Column, Grid, InlineNotification } from "@carbon/react";
import { CarbonHeader } from "./carbon-header";
import { DashboardBody, type DashboardBodyProps } from "./dashboard-body";
import { authErrorCopy } from "./auth-error-copy";

type CarbonDashboardProps = Omit<DashboardBodyProps, "isSample"> & {
  authStatus?: "connected";
  authError?: string;
};

export function CarbonDashboard({
  authStatus,
  authError,
  ...bodyProps
}: CarbonDashboardProps) {
  return (
    <>
      <CarbonHeader isConnected={bodyProps.isConnected} />
      <main id="main-content" className="min-h-screen bg-cds-background pb-16 pt-8">
        {authStatus === "connected" || authError ? (
          <Grid className="mb-6">
            <Column sm={4} md={8} lg={16}>
              <InlineNotification
                kind={authStatus === "connected" ? "success" : "error"}
                lowContrast
                hideCloseButton
                title={
                  authStatus === "connected"
                    ? "Strava connected"
                    : "Strava connection needs attention"
                }
                subtitle={
                  authStatus === "connected"
                    ? "Use Sync Strava on the workouts list to import recent activities."
                    : (authErrorCopy[authError ?? ""] ??
                      "Something went wrong while connecting Strava.")
                }
              />
            </Column>
          </Grid>
        ) : null}
        <DashboardBody {...bodyProps} />
      </main>
    </>
  );
}
