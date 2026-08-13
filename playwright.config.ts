import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "E2E_DEMO_MODE=true SESSION_SECRET=e2e-local-session-secret-only-2026-32chars npx next start -H 0.0.0.0 -p 3000",
    port: 3000,
    timeout: 30_000,
    reuseExistingServer: true,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});
