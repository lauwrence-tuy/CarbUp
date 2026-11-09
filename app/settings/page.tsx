import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { saveUserSettings } from "./actions";
import { SettingsForm } from "@/components/settings/settings-form";
import { FloatingActionButton } from "@/components/dashboard/floating-action-button";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

const defaultSettings = {
  maintenanceCalories: 2400,
  goalType: "maintain",
  goalAdjustment: 0,
  everydayActivity: "active",
  weight: 140,
  units: "imperial"
};

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          maintenanceCalories: true,
          goalType: true,
          goalAdjustment: true,
          everydayActivity: true,
          weight: true,
          units: true
        }
      })
    : null;

  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-app-bg text-white">
      <div className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-24 pt-6 sm:px-8 lg:px-10">
        <AppHeader
          isConnected
          showNav={false}
          actions={
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/[0.08] px-5 text-sm font-bold text-white transition hover:bg-white/[0.12]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
          }
        />

        <div className="mt-8">
          <SettingsForm
            action={saveUserSettings}
            initialSettings={user ?? defaultSettings}
            isStravaConnected={Boolean(user)}
          />
        </div>
      </div>
      <FloatingActionButton href="/nutrition" />
    </main>
  );
}
