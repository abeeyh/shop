import { expect, test } from "@playwright/test";

// #16: agenda de raids no fuso do cliente. RN-11, RN-16, RN-83.
test.describe("agenda", () => {
  test.skip(({ isMobile }) => isMobile, "seletor de fuso no desktop; o card é o mesmo no celular");

  test("RN-83: horário muda com o fuso escolhido; horário do servidor continua o mesmo", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ timezoneId: "America/New_York", baseURL });
    const page = await context.newPage();
    await page.goto("/en");
    const section = page.locator("section", { has: page.getByRole("heading", { name: "Upcoming raids" }) });
    const firstTime = section.locator("time").first();
    const serverTime = section.locator("time").nth(1);
    await expect(firstTime).not.toHaveText("");
    const before = await firstTime.textContent();
    const serverBefore = await serverTime.textContent();
    await page.locator("#pref-timezone").selectOption("Asia/Tokyo");
    await expect(firstTime).not.toHaveText(before!);
    await expect(serverTime).toHaveText(serverBefore!);
    await context.close();
  });

  test("RN-11/RN-16: horário cheio aparece esgotado; os outros mostram vagas", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ timezoneId: "America/New_York", baseURL });
    const page = await context.newPage();
    await page.goto("/en/wow/raids");
    await expect(page.getByText("Sold out").first()).toBeVisible();
    await expect(page.getByText(/\d+ seats? left/).first()).toBeVisible();
    await context.close();
  });

  test("contagem regressiva anda", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ timezoneId: "America/New_York", baseURL });
    const page = await context.newPage();
    await page.goto("/en");
    const timer = page.getByRole("timer").first();
    const t1 = await timer.textContent();
    await expect(timer).not.toHaveText(t1!, { timeout: 3000 });
    await context.close();
  });

  test("página da raid lista os horários disponíveis", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ timezoneId: "America/New_York", baseURL });
    const page = await context.newPage();
    await page.goto("/en/wow/raids/raid-heroic-us");
    await expect(page.getByRole("heading", { name: "Available times" })).toBeVisible();
    await expect(page.getByRole("timer")).toHaveCount(4);
    await context.close();
  });
});
