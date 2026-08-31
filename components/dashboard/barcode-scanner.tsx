"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Barcode, Camera, X } from "lucide-react";
import type { CatalogFood } from "./nutrition-diary-storage";

type BarcodeScannerProps = {
  onFoodFound: (food: CatalogFood) => void;
};

// BarcodeDetector isn't in the TS DOM lib yet. Minimal shape for what we use.
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector ?? null
  );
}

const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

export function BarcodeScanner({ onFoodFound }: BarcodeScannerProps) {
  const [open, setOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const detectorSupported = getBarcodeDetector() !== null;

  const lookup = useCallback(
    async (code: string) => {
      const clean = code.trim();

      if (!/^\d{6,14}$/.test(clean)) {
        setStatus("That doesn't look like a barcode.");
        return false;
      }

      setIsLooking(true);
      setStatus("Looking up product...");

      try {
        const response = await fetch(
          `/api/nutrition/foods/barcode?code=${encodeURIComponent(clean)}`
        );

        if (response.status === 404) {
          setStatus(`No product found for ${clean}.`);
          return false;
        }

        if (!response.ok) {
          throw new Error(String(response.status));
        }

        const data = (await response.json()) as { food: CatalogFood | null };

        if (!data.food) {
          setStatus(`No product found for ${clean}.`);
          return false;
        }

        onFoodFound(data.food);
        setStatus(`Added ${data.food.name} to the picker.`);
        return true;
      } catch {
        setStatus("Lookup failed. Try again or search by name.");
        return false;
      } finally {
        setIsLooking(false);
      }
    },
    [onFoodFound]
  );

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    const DetectorCtor = getBarcodeDetector();

    if (!DetectorCtor) {
      setStatus("This browser can't scan. Enter the number below instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setStatus("Point the camera at a barcode.");

      const detector = new DetectorCtor({ formats: BARCODE_FORMATS });

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) {
          return;
        }

        try {
          const results = await detector.detect(videoRef.current);
          const hit = results.find((result) => /^\d{6,14}$/.test(result.rawValue));

          if (hit) {
            stopCamera();
            await lookup(hit.rawValue);
            return;
          }
        } catch {
          // transient decode error -- keep scanning
        }

        scanTimerRef.current = window.setTimeout(() => void tick(), 400);
      };

      void tick();
    } catch {
      setStatus("Couldn't open the camera. Enter the number below instead.");
      stopCamera();
    }
  }, [lookup, stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setStatus(null);
    }

    return () => stopCamera();
  }, [open, stopCamera]);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black/28 px-4 text-xs font-bold text-app-secondary transition hover:bg-app-green/10 hover:text-app-green"
      >
        <Barcode className="size-4" aria-hidden="true" />
        {open ? "Hide scanner" : "Scan a barcode"}
      </button>

      {open ? (
        <div className="mt-3 rounded-[20px] bg-black/24 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-app-secondary">
              Barcode
            </p>
            <button
              type="button"
              aria-label="Close scanner"
              onClick={() => setOpen(false)}
              className="flex size-8 items-center justify-center rounded-full bg-white/[0.06] text-app-muted transition hover:text-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {detectorSupported ? (
            <div className="mt-3">
              {cameraActive ? (
                <video
                  ref={videoRef}
                  className="aspect-video w-full rounded-[14px] bg-black object-cover"
                  muted
                  playsInline
                />
              ) : (
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-app-green px-4 text-sm font-bold text-black transition hover:-translate-y-0.5"
                >
                  <Camera className="size-4" aria-hidden="true" />
                  Start camera
                </button>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold text-app-muted">
              This browser can&apos;t use the camera scanner. Type the number
              from the package instead.
            </p>
          )}

          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void lookup(manualCode);
            }}
          >
            <input
              className="min-h-11 flex-1 rounded-full border border-white/[0.06] bg-black/28 px-4 text-sm font-semibold text-white outline-none placeholder:text-app-muted focus:border-app-green/60"
              inputMode="numeric"
              placeholder="Enter barcode digits"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
            />
            <button
              type="submit"
              disabled={isLooking}
              className="min-h-11 rounded-full bg-white px-4 text-sm font-bold text-black transition hover:bg-app-green disabled:opacity-50"
            >
              Look up
            </button>
          </form>

          {status ? (
            <p className="mt-3 text-xs font-semibold text-app-secondary">
              {status}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
