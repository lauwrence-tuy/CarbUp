import type { Metadata } from "next";
import { SampleDashboard } from "@/components/carbon/sample-dashboard";
import { buildSampleDay } from "@/lib/sample-day";

// Rebuild per request so the sample week is anchored on today's date.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sample dashboard · CarbUp"
};

export default function SampleDashboardPage() {
  return <SampleDashboard sample={buildSampleDay()} />;
}
