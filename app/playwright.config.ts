import { defineConfig, devices } from "@playwright/test";

// Phase 10 §29 — a real, in-repo E2E harness. Runs against `expo start
// --web` (a dev server, so `__DEV__` is true and the debug scenario menu
// on MainMenuScreen is reachable — the same reason it's safe: a release
// bundle never runs this way). Uses the sandbox's pre-installed Chromium
// rather than downloading a browser (see AGENTS.md / the env's Playwright
// note) — a version mismatch between @playwright/test and the
// pre-installed build means launching via executablePath, not a managed
// install.
const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 8091;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: "/opt/pw-browsers/chromium",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `CI=1 npx expo start --web --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI_FRESH_SERVER,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
