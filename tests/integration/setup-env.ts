import { inject } from "vitest";

// Runs before any test file imports Prisma, so the client connects to the
// test database instead of the one in .env.
process.env.DATABASE_URL = inject("databaseUrl");
