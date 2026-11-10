"use client";

import type { ReactNode } from "react";
import { Column, Grid, Tile } from "@carbon/react";
import { PageShell, PageTitle } from "@/components/carbon/page-shell";

/** Client frame for the Settings info pages: shared header, title and one card. */
export function InfoPageFrame({
  isConnected,
  eyebrow,
  title,
  description,
  backLink,
  children
}: {
  isConnected: boolean;
  eyebrow: string;
  title: string;
  description: string;
  backLink: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageShell isConnected={isConnected}>
      <Grid>
        <Column sm={4} md={8} lg={16}>
          {backLink}
        </Column>
      </Grid>
      <div className="mt-6">
        <PageTitle label={eyebrow} title={title} description={description} />
      </div>
      <Grid className="mt-8">
        <Column sm={4} md={8} lg={16}>
          <Tile className="!p-4 sm:!p-6">
            <div className="grid gap-4">{children}</div>
          </Tile>
        </Column>
      </Grid>
    </PageShell>
  );
}
