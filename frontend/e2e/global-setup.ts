import type { FullConfig } from "@playwright/test";

/** Fail once, with a clear message, when the app is not running (no `webServer` here). */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000";
  try {
    await fetch(baseURL, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    throw new Error(
      `Cannot reach ${baseURL}. Start the stack first: docker compose up --build -d ` +
        `(or set E2E_BASE_URL). Cause: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
