"use client";

import type { ReactNode } from "react";
import { Column, Grid } from "@carbon/react";
import { PageShell, PageTitle } from "@/components/carbon/page-shell";

/** Settings page frame: shared header and title around the settings form. */
export function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <PageShell isConnected>
      <PageTitle
        label="Settings"
        title="Control center"
        description="Your calorie target, macro split, units and connected services."
      />
      <Grid className="mt-8">
        <Column sm={4} md={8} lg={16}>
          {children}
        </Column>
      </Grid>
    </PageShell>
  );
}
