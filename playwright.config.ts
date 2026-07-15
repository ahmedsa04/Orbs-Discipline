import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    ...devices["Pixel 7"],
  },
  projects: [
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
        timeout: 120000,
      },
});
