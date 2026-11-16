#!/bin/sh
# Vercel runs `pnpm vercel-build` instead of `pnpm build` when this script exists.
#
# Production deploys apply pending Prisma migrations before building, so new
# code never goes live against an old schema; if a migration fails, the build
# fails and the current deployment keeps serving. Preview and development
# builds never migrate, whatever database they point at.
#
# Migrations use DIRECT_URL (Neon's non-pooled connection string): Prisma
# Migrate takes an advisory lock that the PgBouncer pooler doesn't support.
set -eu

if [ "${VERCEL_ENV:-}" = "production" ]; then
  if [ -z "${DIRECT_URL:-}" ]; then
    echo "DIRECT_URL is not set for Production. Add the Neon direct (non-pooled) connection string in Vercel." >&2
    exit 1
  fi

  echo "Applying Prisma migrations to the production database..."
  DATABASE_URL="$DIRECT_URL" prisma migrate deploy
else
  echo "VERCEL_ENV=${VERCEL_ENV:-unset}: skipping migrations."
fi

next build
