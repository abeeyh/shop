import { expect, test } from "@playwright/test";
import { openPreferences } from "./helpers";

// #13 e #14: idioma e fuso no cabeçalho. RN-81, RN-82. #92: loja só US (RN-14), sem seletor de região.
test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "o globo é o mesmo no celular (teste abaixo)");

  test("RN-82: fuso detectado sozinho na 1ª visita; RN-14: só US, mesmo vindo da Europa", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ timezoneId: "Europe/Berlin", baseURL });
    const page = await context.newPage();
    await page.goto("/en");
    await expect(page.locator("#pref-timezone")).toHaveValue("Europe/Berlin");
    await expect(page.locator("#pref-region")).toHaveCount(0); // #92: não há escolha de região
    await expect(page.getByRole("link", { name: "Gold — US realms" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gold — EU realms" })).toHaveCount(0);
    await context.close();
  });

  test("RN-81: trocar o idioma mantém a página atual", async ({ page }) => {
    await page.goto("/en/wow/raids");
    await openPreferences(page);
    await page.locator("#pref-locale").selectOption("de");
    await expect(page).toHaveURL(/\/de\/wow\/raids$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
  });

  test("RN-82: trocar o fuso manualmente fica salvo", async ({ page }) => {
    await page.goto("/en");
    await openPreferences(page);
    await expect(page.locator("#pref-timezone")).toBeEnabled(); // detecção automática gravou
    const saved = page.waitForResponse((r) => r.request().method() === "POST");
    await page.locator("#pref-timezone").selectOption("Asia/Taipei");
    await saved; // a action terminou antes do reload (sob carga ela demora)
    await page.reload();
    await openPreferences(page);
    await expect(page.locator("#pref-timezone")).toHaveValue("Asia/Taipei");
  });

  test("docs/09 caso 11: cookie de fuso inválido (e o antigo de região) é ignorado", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ timezoneId: "America/Chicago", baseURL });
    await context.addCookies([
      { name: "tz", value: "Marte/Olympus", url: baseURL! },
      { name: "region", value: "BR", url: baseURL! },
    ]);
    const page = await context.newPage();
    await page.goto("/en");
    await expect(page.locator("#pref-timezone")).toHaveValue("America/Chicago"); // redetectado
    await expect(page.getByRole("link", { name: "Gold — US realms" }).first()).toBeVisible();
    await context.close();
  });
});

test.describe("celular", () => {
  test.skip(({ isMobile }) => !isMobile, "só no celular");

  // #102: sem menu escondido — abas de categoria sempre visíveis e idioma/fuso no globo
  test("abas de categoria a 1 toque; idioma e fuso no globo", async ({ page }) => {
    await page.goto("/pt-br");
    await openPreferences(page);
    await expect(page.getByRole("combobox", { name: "Idioma" }).filter({ visible: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("navigation", { name: "Principal" })
      .getByRole("link", { name: "Raids", exact: true })
      .click();
    await expect(page).toHaveURL(/\/pt-br\/wow\/raids$/);
  });
});
