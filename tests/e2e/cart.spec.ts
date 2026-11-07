import { expect, test } from "@playwright/test";

// #17: carrinho com total recalculado no servidor. RN-11, RN-15 a RN-17, RN-20.
test.describe("carrinho", () => {
  test("RN-15/RN-20: gold — preço vem do servidor, mesmo com campo de preço adulterado", async ({ page }) => {
    await page.goto("/en/wow/gold/gold-us");
    const total = page.locator("output");
    await expect(total).toContainText("45.00"); // 100k × 0,45
    await page.getByLabel("Realm").fill("Area 52");
    await page.getByLabel("Character name").fill("Thrall");
    await page.getByLabel("Amount (thousands of gold)").fill("200");
    await page.getByLabel("Amount (thousands of gold)").dispatchEvent("change");
    await expect(total).toContainText("90.00");
    // cliente tenta mandar o próprio preço: o servidor ignora (RN-20)
    await page.locator("form", { has: page.getByRole("button", { name: "Add to cart" }) }).evaluate((f) => {
      const i = document.createElement("input");
      i.type = "hidden";
      i.name = "priceUsdtCents";
      i.value = "1";
      f.append(i);
    });
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("status").getByText("Added to cart")).toBeVisible();

    await page.goto("/en/carrinho");
    await expect(page.getByText("Area 52")).toBeVisible();
    await expect(page.getByText("90.00").first()).toBeVisible();
  });

  test("RN-15: personagem inválido mostra erro no campo e não adiciona", async ({ page }) => {
    await page.goto("/en/wow/gold/gold-us");
    await page.getByLabel("Realm").fill("Area 52");
    await page.getByLabel("Character name").fill("Th 1");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Use 2–12 letters, no spaces or symbols.")).toBeVisible();
    await page.goto("/en/carrinho");
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });

  test("RN-11/RN-16: horário esgotado fica desabilitado; raid com loot vai para o carrinho", async ({
    page,
  }) => {
    await page.goto("/en/wow/raids/raid-normal-us");
    const slots = page.locator('input[name="slotId"]');
    await expect(slots.first()).toBeDisabled(); // o primeiro horário do seed está cheio
    await expect(slots.nth(1)).toBeChecked();
    await page.getByLabel("Loot option").selectOption("armor");
    await expect(page.locator("output")).toContainText("50.70"); // 39 × 1,3
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("status").getByText("Added to cart")).toBeVisible();
    await page.goto("/en/carrinho");
    await expect(page.getByText("Armor-type priority")).toBeVisible();
  });

  test("RN-17: M+ — nível e timed mudam o preço; remover esvazia o carrinho", async ({ page }) => {
    await page.goto("/en/wow/mythic-plus/mplus-us");
    await page.getByLabel("Key level").selectOption("12");
    await page.getByLabel("Runs").selectOption("2");
    await page.getByLabel("Timed (+20%)").check();
    await expect(page.locator("output")).toContainText("37.44"); // 12 × 1,3 × 1,2 × 2
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("status").getByText("Added to cart")).toBeVisible();
    await page.goto("/en/carrinho");
    await expect(page.getByText("37.44").first()).toBeVisible();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });
});
