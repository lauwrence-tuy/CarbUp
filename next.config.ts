import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The end-to-end test server builds into its own folder so it can run next
  // to a normal `pnpm dev` without the two clobbering each other's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
