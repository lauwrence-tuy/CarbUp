"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, InlineLoading, ProgressBar, Tag, Tile } from "@carbon/react";
import { Sparkles } from "lucide-react";
import type { CoachMessage } from "@/lib/ai/fueling-coach";
import { DAY_TYPE_LABELS, formatMinutes, type FuelingPlan } from "@/lib/fueling";

type CoachResponse = {
  coach: CoachMessage;
  source: "ai" | "template";
  notice?: string;
  disclaimer: string;
};

type FuelingCoachCardProps = {
  plan: FuelingPlan;
  dateKey: string;
  /** Sample mode: show the targets but don't call the coach. */
  isSample?: boolean;
};

function Stat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div>
      <p className="cu-helper">{label}</p>
      <p className="cu-mono mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="cu-helper mt-0.5">{helper}</p>
    </div>
  );
}

/**
 * The day's training-based fueling targets, with an optional plain-language
 * explanation from the coach. The numbers come from lib/fueling; the coach
 * only explains them.
 */
export function FuelingCoachCard({ plan, dateKey, isSample = false }: FuelingCoachCardProps) {
  const [answer, setAnswer] = useState<CoachResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { carbs, protein, recovery, duringRide } = plan;

  async function explain() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/fueling-coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dateKey })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Couldn't load the coach.");
        return;
      }

      setAnswer(data as CoachResponse);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Tile className="mt-4 !p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="cu-heading-02">Fueling coach</h2>
          <p className="cu-helper mt-1">
            {plan.trainingMinutes > 0
              ? `${formatMinutes(plan.trainingMinutes)} of training · targets scale with your weight`
              : "No training logged · targets scale with your weight"}
          </p>
        </div>
        <Tag type={plan.dayType === "rest" ? "cool-gray" : "blue"} size="md">
          {DAY_TYPE_LABELS[plan.dayType]}
        </Tag>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <Stat
          label="Carb target"
          value={`${carbs.targetG} g`}
          helper={`${carbs.perKgMin}–${carbs.perKgMax} g/kg · ${carbs.minG}–${carbs.maxG} g`}
        />
        <Stat
          label="Protein target"
          value={`${protein.targetG} g`}
          helper={`${protein.perKg} g/kg · ${protein.eatenG} g logged`}
        />
        <ProgressBar
          className="cu-bar-carbs self-center"
          label={plan.isToday ? `${carbs.remainingG} g carbs to go` : "Carbs eaten"}
          helperText={`${carbs.eatenG} of ${carbs.targetG} g`}
          value={Math.min((carbs.eatenG / Math.max(carbs.targetG, 1)) * 100, 100)}
        />
      </div>

      {recovery || duringRide ? (
        <ul className="mt-5 space-y-2 border-t border-[color:var(--cds-border-subtle-00)] pt-4 text-sm text-cds-text-secondary">
          {recovery ? (
            <li>
              <span className="font-bold text-white">Recovery:</span> about {recovery.carbsG} g carbs and{" "}
              {recovery.proteinG} g protein within an hour of finishing.
            </li>
          ) : null}
          {duringRide ? (
            <li>
              <span className="font-bold text-white">On the bike:</span> {duringRide.carbsPerHourMin}–
              {duringRide.carbsPerHourMax} g carbs per hour on rides like{" "}
              {plan.isToday ? "today's" : "this day's"} {formatMinutes(duringRide.rideMinutes)}.
            </li>
          ) : null}
        </ul>
      ) : null}

      {plan.weightIsDefault && !isSample ? (
        <p className="cu-helper mt-4">
          These targets assume {plan.weightKg} kg.{" "}
          <Link href="/settings" className="text-cds-interactive underline">
            Set your weight
          </Link>{" "}
          to fit them to you.
        </p>
      ) : null}

      {answer ? (
        <div className="mt-5 rounded-2xl bg-black/30 p-4" aria-live="polite">
          <p className="font-bold text-white">{answer.coach.headline}</p>
          <p className="cu-body-01 mt-2 text-cds-text-secondary">{answer.coach.advice}</p>
          {answer.coach.actions.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white">
              {answer.coach.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : null}
          {answer.notice ? <p className="cu-helper mt-3">{answer.notice}</p> : null}
          <p className="cu-helper mt-3">
            {answer.source === "ai" ? "Explained by Claude from your numbers. " : ""}
            {answer.disclaimer}
          </p>
        </div>
      ) : null}

      {!isSample && !answer ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {isLoading ? (
            <InlineLoading description="Asking the coach…" />
          ) : (
            <Button kind="tertiary" size="md" onClick={explain}>
              <Sparkles className="mr-2 size-4" aria-hidden="true" />
              Explain my day
            </Button>
          )}
          {error ? <p className="cu-helper text-cds-text-error">{error}</p> : null}
        </div>
      ) : null}
    </Tile>
  );
}
