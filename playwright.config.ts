import { defineConfig, devices } from "@playwright/test";

const playwrightPort = Number(process.env.PLAYWRIGHT_PORT ?? 3010);
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: playwrightBaseUrl,
    trace: "on-first-retry"
  },
  webServer: {
    command: `PORT=${playwrightPort} npm run start`,
    url: playwrightBaseUrl,
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] }
    }
  ]
});
