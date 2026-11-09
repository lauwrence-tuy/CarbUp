import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { buildSampleDay } from "@/lib/sample-day";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{
    disconnected?: string;
    auth_error?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const userId = await getCurrentUserId();

  // Connected users go straight to their dashboard, unless a Strava error
  // needs to be shown here.
  if (userId && !params.auth_error) {
    redirect("/dashboard");
  }

  const disconnected = params.disconnected === "strava";

  return (
    <LandingPage
      authError={disconnected ? undefined : params.auth_error}
      disconnected={disconnected}
      sample={buildSampleDay()}
    />
  );
}
