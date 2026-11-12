import { setupServer } from "msw/node";

/**
 * One MSW server for every test that touches outside HTTP (Strava, USDA, Open
 * Food Facts). Tests add handlers with `server.use(...)`. Any request without
 * a handler fails the test, so nothing ever reaches the real network.
 */
export const server = setupServer();

export function listenForRequests() {
  server.listen({ onUnhandledRequest: "error" });
}
