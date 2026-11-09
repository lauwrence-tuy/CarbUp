"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function SyncStravaButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function syncActivities() {
    setStatus("loading");
    const response = await fetch("/api/strava/sync", {
      method: "POST"
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {status === "error" ? (
        <span className="text-xs font-bold text-app-red">Sync failed</span>
      ) : null}
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-app-green px-4 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
        disabled={status === "loading"}
        onClick={syncActivities}
        type="button"
      >
        <RefreshCw
          className={`size-4 ${status === "loading" ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        {status === "loading" ? "Syncing" : "Sync Strava"}
      </button>
    </div>
  );
}
