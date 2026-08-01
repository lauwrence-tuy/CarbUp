import Link from "next/link";
import { ArrowLeft, Flame } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { saveUserSettings } from "./actions";
import { SettingsForm } from "@/components/settings/settings-form";
import { redirect } from "next/navigation";

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
        <header className="flex items-center justify-between gap-6 rounded-[28px] border border-white/[0.04] bg-app-card/72 px-5 py-4 shadow-card backdrop-blur lg:px-6">
          <Link
            href={user ? "/dashboard" : "/"}
            className="flex items-center gap-3"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-app-card text-app-green shadow-card">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-[-0.04em] sm:text-xl">
                Carb
                <span className="text-app-green">Up</span>
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/[0.08] px-5 text-sm font-bold text-white transition hover:bg-white/[0.12]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
          </div>
        </header>

        <div className="mt-8">
          <SettingsForm
            action={saveUserSettings}
            initialSettings={user ?? defaultSettings}
            isStravaConnected={Boolean(user)}
          />
        </div>
      </div>
    </main>
  );
}
