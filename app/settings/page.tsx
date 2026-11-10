import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { saveUserSettings } from "./actions";
import { SettingsForm } from "@/components/settings/settings-form";
import { redirect } from "next/navigation";
import { SettingsShell } from "@/components/settings/settings-shell";

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
    <SettingsShell>
      <SettingsForm
        action={saveUserSettings}
        initialSettings={user ?? defaultSettings}
        isStravaConnected={Boolean(user)}
      />
    </SettingsShell>
  );
}
