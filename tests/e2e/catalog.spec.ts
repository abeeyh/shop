import { expect, test } from "@playwright/test";

// #15: vitrine com catálogo do banco (seed: scripts/seed.mjs). RN-13, RN-14, RN-18, RN-19.
test("home lista categorias e mais vendidos (loja só US — #92)", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ timezoneId: "Europe/Paris", baseURL });
  const page = await context.newPage();
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 2, name: "Categories" })).toBeVisible();
  // #102: categorias em blocos compactos (links) dentro da página, além das abas do cabeçalho
  const main = page.locator("#conteudo");
  for (const name of ["Gold", "Raids", "Mythic+"]) {
    await expect(main.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Gold — US realms" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Gold — EU realms" })).toHaveCount(0); // RN-14: EU desativado
  await context.close();
});

test("categoria mostra produtos com preço em USDT (sem estimativa fake na moeda local)", async ({ page }) => {
  await page.goto("/pt-br/wow/gold");
  await expect(page.getByRole("heading", { level: 1, name: "Gold" })).toBeVisible();
  const card = page.locator("[data-spotlight]", {
    has: page.getByRole("link", { name: "Gold — US realms" }),
  });
  await expect(card).toContainText("0,45 USDT");
  await expect(card).not.toContainText("≈"); // RN-18: só com a API de cotação (#86, #63)
});

test("#109: produto abre na página dele, com as opções", async ({ page }) => {
  await page.goto("/en/wow/raids");
  // #94: produtos agrupados por subcategoria, na ordem do admin
  await expect(page.getByRole("heading", { level: 2, name: "Heroic", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Normal", exact: true })).toBeVisible();
  // #100: a raid aparece uma vez por dificuldade; as runs viram opções dentro do produto
  await page.getByRole("link", { name: "Venomous Abyss" }).first().click();
  await expect(page).toHaveURL(/\/en\/wow\/raids\/venomous-abyss-heroic$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // com cacheComponents a página anterior fica escondida no DOM (React Activity): filtrar o visível
  const h1 = page.getByRole("heading", { level: 1 }).filter({ visible: true });
  await expect(h1).toHaveText("Venomous Abyss");
  await expect(page.getByText("5.18 USDT", { exact: true }).filter({ visible: true }).first()).toBeVisible();
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
    // com loading.tsx (#88) o Next põe o noindex no head e de novo no corpo transmitido: todos noindex
    const robots = page.locator('meta[name="robots"]');
    await expect(robots.first()).toHaveAttribute("content", /noindex/);
    for (const m of await robots.all()) await expect(m).toHaveAttribute("content", /noindex/);
  }
});

test("página não encontrada no idioma do usuário", async ({ page }) => {
  await page.goto("/pt-br/wow/nao-existe");
  await expect(page.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao início" }).click();
  await expect(page).toHaveURL(/\/pt-br$/);
});
