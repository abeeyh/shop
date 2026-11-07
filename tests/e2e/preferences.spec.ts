import { expect, test } from "@playwright/test";

// #13 e #14: idioma, região e fuso no cabeçalho. RN-14, RN-81, RN-82.
test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "seletores ficam no menu no celular");

  test("RN-82: fuso detectado sozinho na primeira visita e região sugerida pelo fuso", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ timezoneId: "Europe/Berlin", baseURL });
    const page = await context.newPage();
    await page.goto("/en");
    await expect(page.locator("#pref-timezone")).toHaveValue("Europe/Berlin");
    await expect(page.locator("#pref-region")).toHaveValue("EU"); // RN-14: Europa → EU
    await expect(page.getByRole("link", { name: "Gold — EU realms" })).toBeVisible();
    await context.close();
  });

  test("RN-14: trocar a região troca os produtos", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ timezoneId: "America/New_York", baseURL });
    const page = await context.newPage();
    await page.goto("/en/wow/gold");
    await expect(page.locator("#pref-region")).toHaveValue("US");
    await page.locator("#pref-region").selectOption("EU");
    await expect(page.getByRole("link", { name: "Gold — EU realms" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gold — US realms" })).toHaveCount(0);
    await context.close();
  });

  test("RN-81: trocar o idioma mantém a página atual", async ({ page }) => {
    await page.goto("/en/wow/raids");
    await page.locator("#pref-locale").selectOption("de");
    await expect(page).toHaveURL(/\/de\/wow\/raids$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
  });

  test("RN-82: trocar o fuso manualmente fica salvo", async ({ page }) => {
    await page.goto("/en");
    await page.locator("#pref-timezone").selectOption("Asia/Taipei");
    await page.reload();
    await expect(page.locator("#pref-timezone")).toHaveValue("Asia/Taipei");
  });

  test("docs/09 caso 11: cookie de fuso/região inválido é ignorado", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ timezoneId: "America/Chicago", baseURL });
    await context.addCookies([
      { name: "tz", value: "Marte/Olympus", url: baseURL! },
      { name: "region", value: "BR", url: baseURL! },
    ]);
    const page = await context.newPage();
    await page.goto("/en");
    await expect(page.locator("#pref-region")).toHaveValue("US");
    await expect(page.locator("#pref-timezone")).toHaveValue("America/Chicago"); // redetectado
    await context.close();
  });
});

test.describe("celular", () => {
  test.skip(({ isMobile }) => !isMobile, "só no celular");

  test("menu abre com categorias e preferências, fecha ao navegar", async ({ page }) => {
    await page.goto("/pt-br");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    const menu = page.locator("#menu-mobile");
    await expect(menu.getByRole("link", { name: "Raids" })).toBeVisible();
    await expect(menu.getByLabel("Idioma")).toBeVisible();
    await menu.getByRole("link", { name: "Raids" }).click();
    await expect(page).toHaveURL(/\/pt-br\/wow\/raids$/);
    await expect(menu).toBeHidden();
  });
});
