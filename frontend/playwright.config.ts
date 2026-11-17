import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (story 6.4, part 2) against the running Compose stack. No `webServer`:
 * start the stack first with `docker compose up --build -d`, then `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  outputDir: "e2e/test-results",
  retries: 0,
  // The Compose frontend is a dev server: give slow first compiles some room.
  expect: { timeout: 10_000 },
  // One test at a time: the Compose frontend is a dev server, and parallel runs made it flaky.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
