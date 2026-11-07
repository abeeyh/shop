import { expect, test } from "@playwright/test";

// #15: vitrine com catálogo do banco (seed: scripts/seed.mjs). RN-13, RN-14, RN-18, RN-19.
test("home lista categorias e mais vendidos da região US", async ({ browser, baseURL }) => {
  // região sugerida pelo fuso na 1ª visita (RN-14): fixa um fuso das Américas
  const context = await browser.newContext({ timezoneId: "America/New_York", baseURL });
  const page = await context.newPage();
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 2, name: "Categories" })).toBeVisible();
  for (const name of ["Gold", "Raids", "Mythic+"]) {
    await expect(page.getByRole("heading", { level: 3, name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Gold — US realms" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Gold — EU realms" })).toHaveCount(0); // RN-14: só a região escolhida
  await context.close();
});

test("categoria mostra produtos com preço em USDT (sem estimativa fake na moeda local)", async ({ page }) => {
  await page.goto("/pt-br/wow/gold");
  await expect(page.getByRole("heading", { level: 1, name: "Gold" })).toBeVisible();
  const card = page.locator("div", { has: page.getByRole("link", { name: "Gold — US realms" }) }).last();
  await expect(card).toContainText("0,45 USDT");
  await expect(card).not.toContainText("≈"); // RN-18: só com a API de cotação (#86, #63)
});

test("produto abre pelo card e mostra o aviso de self-play", async ({ page }) => {
  await page.goto("/en/wow/raids");
  await page.getByRole("link", { name: "Current raid — Heroic" }).first().click();
  await expect(page).toHaveURL(/\/en\/wow\/raids\/raid-heroic-us$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Current raid — Heroic");
  // com cacheComponents a página anterior fica escondida no DOM (React Activity): filtrar o visível
  await expect(page.getByText("79.00 USDT", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/never ask for your Battle\.net password/)).toBeVisible();
});

// Com streaming, o esqueleto já saiu com 200 quando a página descobre que não existe: o Next mostra a
// página de "não encontrado" com noindex (docs: notFound após o streaming). Não é indexado.
test("categoria ou produto inexistente, ou na categoria errada → página não encontrada com noindex", async ({
  page,
}) => {
  for (const path of ["/en/wow/nao-existe", "/en/wow/gold/nao-existe", "/en/wow/raids/gold-us"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("página não encontrada no idioma do usuário", async ({ page }) => {
  await page.goto("/pt-br/wow/nao-existe");
  await expect(page.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao início" }).click();
  await expect(page).toHaveURL(/\/pt-br$/);
});
