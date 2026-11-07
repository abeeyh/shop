import { expect, test } from "@playwright/test";

// #17/#94: carrinho com total recalculado no servidor. RN-11, RN-15 a RN-17, RN-20, RN-106.
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

  test("RN-11/RN-16: horário esgotado fica desabilitado; raid com horário vai para o carrinho", async ({
    page,
  }) => {
    await page.goto("/en/wow/raids/venomous-abyss-normal");
    const slots = page.locator('input[name="slotId"]');
    await expect(slots.first()).toBeDisabled(); // o primeiro horário do seed está cheio
    await expect(slots.nth(1)).toBeChecked();
    await expect(page.locator("output")).toContainText("2.93"); // 1ª opção: Last boss, 65k gold (#100)
    await page.getByText("8/8 Saved", { exact: true }).click(); // a opção muda o preço: 140k = 6,30
    await expect(page.locator("output")).toContainText("6.30");
    await page.getByLabel("Realm").fill("Area 52");
    await page.getByLabel("Character name").fill("Thrall");
    await page.getByRole("button", { name: "Add to cart" }).click();
    // sob carga (suíte inteira em paralelo) a action passa de 5 s
    await expect(page.getByRole("status").getByText("Added to cart")).toBeVisible({ timeout: 15_000 });
    await page.goto("/en/carrinho");
    await expect(page.getByText("Area 52 · Alliance · Thrall · 8/8 Saved")).toBeVisible();
  });

  test("RN-17 (#94): adicional Armor Stack +25% muda o preço; remover esvazia o carrinho", async ({
    page,
  }) => {
    await page.goto("/en/wow/mythic-plus/mythic-plus-key");
    await expect(page.locator("output")).toContainText("3.15"); // +6 (1º nível do slider)
    // #100: o slider anda pelo teclado (4 passos: +6 → +10)
    const level = page.getByRole("slider", { name: "Key level" });
    await level.focus();
    for (let i = 0; i < 4; i++) await level.press("ArrowRight");
    await expect(page.locator("output")).toContainText("4.95");
    await page.getByLabel("Armor Stack (+25%)").check();
    await expect(page.locator("output")).toContainText("6.19"); // 4,95 × 1,25 = 6,1875
    // sem horário: aviso de que a run é agendada com o suporte depois do pagamento
    await expect(page.getByText(/schedule your run with support/)).toBeVisible();
    await page.getByLabel("Realm").fill("Area 52");
    await page.getByLabel("Character name").fill("Thrall");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("status").getByText("Added to cart")).toBeVisible();
    await page.goto("/en/carrinho");
    await expect(page.getByText("Armor Stack", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("6.19").first()).toBeVisible();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });

  test("RN-106 (#94): sob consulta não tem carrinho — abre o chat com o pedido de orçamento", async ({
    page,
  }) => {
    await page.goto("/en/wow/pvp");
    await expect(page.getByText("Price on request").first()).toBeVisible();
    // #100: o cliente escolhe a combinação e o pedido de orçamento vai com ela
    await page.goto("/en/wow/pvp/arena-rating");
    await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
    await page.getByText("3v3", { exact: true }).click();
    await page.getByRole("button", { name: "Ask for price" }).click();
    await expect(page.getByRole("textbox", { name: "How can we help?" })).toHaveValue(
      "Hi! I'd like a quote for: Arena Rating (3v3 · Up to 1600)",
    );
  });
});
