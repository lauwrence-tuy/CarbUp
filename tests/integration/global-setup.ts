import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import type { TestProject } from "vitest/node";
import { assertDisposable } from "./helpers/disposable-db";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

function getFreePort() {
  return new Promise<number>((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() =>
        typeof address === "object" && address ? resolvePort(address.port) : reject(new Error("No port"))
      );
    });
  });
}

/**
 * Starts a real Postgres for the integration tests and applies the Prisma
 * migrations. Set TEST_DATABASE_URL to use an existing server instead (CI uses
 * a Postgres service container); otherwise an embedded Postgres 17 is started
 * in a temp directory and removed afterwards.
 */
export default async function setup(project: TestProject) {
  let databaseUrl = process.env.TEST_DATABASE_URL;
  let embedded: EmbeddedPostgres | undefined;
  let dataDir: string | undefined;

  if (!databaseUrl) {
    dataDir = await mkdtemp(join(tmpdir(), "carbup-test-pg-"));
    const port = await getFreePort();
    embedded = new EmbeddedPostgres({
      databaseDir: dataDir,
      port,
      user: "postgres",
      password: "postgres",
      persistent: false,
      onLog: () => {}
    });
    await embedded.initialise();
    await embedded.start();
    await embedded.createDatabase("carbup_test");
    databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/carbup_test`;
  }

  assertDisposable(databaseUrl);

  execFileSync(resolve("node_modules/.bin/prisma"), ["migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe"
  });

  project.provide("databaseUrl", databaseUrl);

  return async () => {
    await embedded?.stop();

    if (dataDir) {
      await rm(dataDir, { recursive: true, force: true });
    }
  };
}
