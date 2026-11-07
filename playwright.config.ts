import { defineConfig, devices } from "@playwright/test";

import { E2E_IPN_SECRET } from "./tests/e2e/constants";

const PORT = Number(process.env.E2E_PORT ?? 3100);

// docs/13 §8: E2E em 390×844 (celular) e 1440×900 (desktop), contra o build de produção (standalone).
// PW_CHANNEL=chrome usa o Chrome instalado na máquina (sem baixar o Chromium do Playwright).
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts", // conta de admin do E2E recriada a cada rodada
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  // suíte em paralelo contra um único servidor: sob carga as actions passam de 5 s (padrão do Playwright)
  expect: { timeout: 10_000 },
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
    env: {
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      RATE_LIMIT_REQUESTS_PER_MIN: "100000",
      // suíte em paralelo no Docker local passa de 150 ms às vezes: o disjuntor bloquearia login/checkout
      VALKEY_COMMAND_TIMEOUT_MS: "1000",
      NOWPAYMENTS_IPN_SECRET: E2E_IPN_SECRET, // verifica o IPN; sem API key o checkout fica bloqueado
    },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
