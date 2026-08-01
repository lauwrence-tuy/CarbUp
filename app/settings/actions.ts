"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export type SettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const goalAdjustments: Record<string, number> = {
  maintain: 0,
  lose_slow: -250,
  lose_steady: -500,
  lose_fast: -750
};

const activityLevels = new Set(["sedentary", "light", "active", "very_active"]);
const unitOptions = new Set(["imperial", "metric"]);
const tdeeMultipliers: Record<string, number> = {
  sedentary: 13,
  light: 14,
  active: 16,
  very_active: 18
};

function calculateBaseTdee({
  everydayActivity,
  units,
  weight
}: {
  everydayActivity: string;
  units: string;
  weight: number;
}) {
  const weightInPounds = units === "metric" ? weight * 2.2046226218 : weight;

  return Math.round(weightInPounds * tdeeMultipliers[everydayActivity]);
}

export async function saveUserSettings(
  _previousState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      status: "error",
      message: "Connect Strava before saving calorie settings."
    };
  }

  const goalType = String(formData.get("goalType") ?? "maintain");
  const everydayActivity = String(formData.get("everydayActivity") ?? "active");
  const units = String(formData.get("units") ?? "imperial");
  const weight = Number(formData.get("weight") ?? 0);

  if (!(goalType in goalAdjustments)) {
    return {
      status: "error",
      message: "Choose maintain, lose slow, lose steady, or lose fast."
    };
  }

  if (!activityLevels.has(everydayActivity)) {
    return {
      status: "error",
      message: "Choose a valid activity level."
    };
  }

  if (!unitOptions.has(units)) {
    return {
      status: "error",
      message: "Choose imperial or metric units."
    };
  }

  if (!Number.isFinite(weight) || weight <= 0 || weight > 800) {
    return {
      status: "error",
      message: "Enter a valid weight."
    };
  }

  const maintenanceCalories = calculateBaseTdee({
    everydayActivity,
    units,
    weight
  });

  if (maintenanceCalories < 1000 || maintenanceCalories > 6000) {
    return {
      status: "error",
      message:
        "Your calculated Base TDEE needs to land between 1,000 and 6,000 kcal."
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      maintenanceCalories,
      goalType,
      goalAdjustment: goalAdjustments[goalType],
      everydayActivity,
      units,
      weight
    }
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Settings saved. Your target formula is ready for Strava activity calories."
  };
}
