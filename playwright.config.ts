import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3101);
const baseURL = `http://127.0.0.1:${port}`;
const databasePath = resolve(tmpdir(), `tinynotes-playwright-${process.pid}.db`);

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
    command: `bun run db:migrate && bun run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      DB_PATH: databasePath,
      AUTH_SECRET: "tinynotes-playwright-test-secret-at-least-32-characters",
      APP_URL: baseURL,
      NODE_ENV: "development",
    },
  },
});
