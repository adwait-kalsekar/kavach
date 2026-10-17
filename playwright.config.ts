import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: "node apps/api/dist/server.js",
      url: "http://127.0.0.1:8080/readyz",
      env: {
        APP_ENV: "test",
        NODE_ENV: "test",
        PORT: "8080",
        APP_ORIGIN: "http://localhost:3000",
        STORAGE_BACKEND: "sqlite",
        SQLITE_PATH: ".data/e2e.sqlite",
        WEATHER_PROVIDER: "disabled",
      },
      reuseExistingServer: false,
    },
    {
      command: "npm run dev --workspace=web",
      url: "http://localhost:3000",
      reuseExistingServer: false,
    },
  ],
  projects: [
    {
      name: "desktop-proxy",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
    {
      name: "mobile-proxy",
      use: { ...devices["Pixel 7"], baseURL: "http://localhost:3000" },
    },
    {
      name: "built-hono",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:8080" },
    },
  ],
});
