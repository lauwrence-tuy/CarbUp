import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    // `next dev` writes to its own folder. When dev and `next build` shared
    // `.next`, a build run while dev was up replaced dev's server chunks with
    // production ones: pages 404'd, and the server HTML was rendered without
    // Next's dev-only segment wrappers. That shifted every React `useId`, so
    // Carbon ids (tag-id-…, progress-bar-…) failed to hydrate.
    //
    // NEXT_DIST_DIR overrides both: the end-to-end test server uses
    // `.next-e2e` so it can run next to a normal `pnpm dev`.
    distDir:
      process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next")
  };
}
