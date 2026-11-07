import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

// docs/13 §8: E2E em 390×844 (celular) e 1440×900 (desktop), contra o build de produção (standalone).
// PW_CHANNEL=chrome usa o Chrome instalado na máquina (sem baixar o Chromium do Playwright).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: process.env.PW_CHANNEL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "node scripts/serve-standalone.mjs",
    url: `http://127.0.0.1:${PORT}/api/health`,
    env: { PORT: String(PORT), HOSTNAME: "127.0.0.1" },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
