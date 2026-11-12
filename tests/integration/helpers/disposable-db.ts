/**
 * The integration tests wipe every table, so only ever point them at a
 * throwaway database: a local host, or a database whose name says "test".
 */
export function assertDisposable(url: string) {
  const { hostname, pathname } = new URL(url);
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);

  if (!isLocal && !/test/i.test(pathname)) {
    throw new Error(
      `Refusing to run integration tests against ${hostname}${pathname}: use a local or *test* database.`
    );
  }
}
