import { defineConfig } from "@playwright/test";

// When E2E_EXTERNAL=1, assume a dev server is already running (e.g. on
// E2E_BASE_URL, default http://localhost:3217) and don't spawn one. This lets
// the smoke test run against any live demo-mode server without port conflicts.
const external = process.env.E2E_EXTERNAL === "1";
const baseURL = process.env.E2E_BASE_URL || (external ? "http://localhost:3217" : "http://localhost:3000");

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
  },
  ...(external
    ? {}
    : {
        webServer: {
          command:
            "E2E_DEMO_MODE=true SESSION_SECRET=e2e-local-session-secret-only-2026-32chars npx next dev -H 0.0.0.0 -p 3000",
          port: 3000,
          timeout: 30_000,
          reuseExistingServer: true,
        },
      }),
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
