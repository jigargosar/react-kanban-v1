import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  timeout: 10000,
  expect: { timeout: 3000 },
  workers: 1,
  reporter: [["html", { open: "on-failure" }]],
  use: {
    baseURL: "http://localhost:5173",
    browserName: "chromium",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
