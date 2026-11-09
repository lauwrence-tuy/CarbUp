"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, InlineLoading } from "@carbon/react";
import { Renew } from "@carbon/icons-react";

export function CarbonSyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function syncActivities() {
    setStatus("loading");
    const response = await fetch("/api/strava/sync", { method: "POST" });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("idle");
    router.refresh();
  }

  if (status === "loading") {
    return <InlineLoading description="Syncing" />;
  }

  return (
    <div className="flex items-center gap-3">
      {status === "error" ? (
        <span className="cu-helper !text-cds-support-error">Sync failed</span>
      ) : null}
      <Button kind="tertiary" size="sm" renderIcon={Renew} onClick={syncActivities}>
        Sync Strava
      </Button>
    </div>
  );
}
