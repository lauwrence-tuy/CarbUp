import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getCurrentUserId } from "@/lib/session";

type LandingPageProps = {
  searchParams: Promise<{
    connected?: string;
    disconnected?: string;
    auth_error?: string;
  }>;
};

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const params = await searchParams;
  const userId = await getCurrentUserId();

  return (
    <DashboardHome
      isConnected={Boolean(userId)}
      authStatus={params.connected === "strava" ? "connected" : undefined}
      authError={params.disconnected === "strava" ? undefined : params.auth_error}
    />
  );
}
