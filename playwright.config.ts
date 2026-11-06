import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";
const databasePath = join(tmpdir(), `tinynotes-playwright-${process.pid}.db`);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run db:migrate && bun run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      DB_PATH: databasePath,
      AUTH_SECRET: "playwright-test-secret-that-is-long-enough-32-chars",
      APP_URL: baseURL,
    },
  },
});
