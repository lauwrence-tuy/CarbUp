import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { assertDisposable } from "../integration/helpers/disposable-db";
import { E2E_DB_PORT, E2E_ENV, E2E_PORT } from "./env";

/**
 * Starts the app for Playwright against a throwaway Postgres: an embedded
 * one on E2E_DB_PORT, or E2E_DATABASE_URL when set (CI). Runs `next dev` on
 * port 3100 with its own build folder, and cleans up on exit.
 */
async function main() {
  let embedded: EmbeddedPostgres | undefined;
  let dataDir: string | undefined;

  if (!process.env.E2E_DATABASE_URL) {
    dataDir = await mkdtemp(join(tmpdir(), "carbup-e2e-pg-"));
    embedded = new EmbeddedPostgres({
      databaseDir: dataDir,
      port: E2E_DB_PORT,
      user: "postgres",
      password: "postgres",
      persistent: false,
      onLog: () => {}
    });
    await embedded.initialise();
    await embedded.start();
    await embedded.createDatabase("carbup_e2e");
  }

  assertDisposable(E2E_ENV.DATABASE_URL);
  execFileSync(resolve("node_modules/.bin/prisma"), ["migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: E2E_ENV.DATABASE_URL },
    stdio: "inherit"
  });

  const command = process.env.E2E_NEXT_COMMAND === "start" ? ["start"] : ["dev"];
  const next = spawn(resolve("node_modules/.bin/next"), [...command, "-p", String(E2E_PORT)], {
    stdio: "inherit",
    env: { ...process.env, ...E2E_ENV, NEXT_DIST_DIR: ".next-e2e" }
  });

  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    next.kill("SIGTERM");
    await embedded?.stop();
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  next.on("exit", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
