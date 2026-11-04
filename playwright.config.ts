import { defineConfig, devices } from "@playwright/test";

// Supabase settings and test-user credentials for budgi-dev come from .env
try {
  process.loadEnvFile(".env");
} catch {
  // No .env (e.g. CI); variables must come from the environment
}

const PORT = 3100;
const AUTH_FILE = "tests/e2e/.auth/user-a.json";

export default defineConfig({
  testDir: "./tests/e2e",
  // Tests share test user A, so they run one at a time
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
      dependencies: ["setup"],
    },
    {
      // Smallest width with the sidebar (DESIGN.md 1.15); layout and accessibility only
      name: "tablet",
      testMatch: /(responsive|accessibility)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 }, storageState: AUTH_FILE },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], storageState: AUTH_FILE },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
