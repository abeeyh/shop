import { expect, test } from "@playwright/test";

// #56: busca e página de produtos com filtros. RN-100 a RN-104.
const titles = (page: import("@playwright/test").Page) =>
  page.locator("main h3").filter({ visible: true }).allTextContents();

test("RN-100: busca do cabeçalho tolera erro de digitação e ordena por relevância", async ({
  page,
  isMobile,
}) => {
  await page.goto("/en");
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  const box = page.getByRole("searchbox", { name: "Search products" }).filter({ visible: true });
  await box.fill("mithic");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/en\/produtos\?q=mithic$/);
  await expect(page.getByRole("status")).toContainText("for “mithic”");
  const found = await titles(page);
  expect(found.length).toBeGreaterThan(0);
  expect(found.every((t) => /Mythic/.test(t))).toBe(true);
});

test("RN-100: termo de 1 caractere pede 2", async ({ page }) => {
  await page.goto("/pt-br/produtos?q=g");
  await expect(page.getByText("Digite pelo menos 2 caracteres.")).toBeVisible();
});

test("RN-101/RN-103: filtro de categoria vai para a URL, vira chip e o chip remove", async ({ page }) => {
  await page.goto("/en/produtos?region=all");
  await page.getByRole("checkbox", { name: "Gold", exact: true }).check();
  await expect(page).toHaveURL(/cat=gold/);
  expect((await titles(page)).every((t) => t.startsWith("Gold"))).toBe(true);
  await page.getByRole("link", { name: "Remove filter Gold" }).click();
  await expect(page).not.toHaveURL(/cat=gold/);
});

test("RN-102: ordenação por menor preço", async ({ page }) => {
  await page.goto("/en/produtos?region=all&sort=price-asc");
  const prices = await page.locator("main .text-xl").filter({ visible: true }).allTextContents();
  const values = prices.map((p) => Number(p.replace(/[^\d.]/g, "")));
  expect(values.length).toBeGreaterThan(5);
  expect(values).toEqual([...values].sort((a, b) => a - b));
});

test("RN-103: parâmetros inválidos na URL são ignorados", async ({ page }) => {
  await page.goto("/en/produtos?min=abc&max=-1&sort=hack&cat=nope&page=0&region=BR");
  await expect(page.getByRole("status")).toContainText(/\d+ products?/);
  expect((await titles(page)).length).toBeGreaterThan(0);
});

test("RN-104: sem resultado mostra o estado vazio e limpar filtros", async ({ page }) => {
  await page.goto("/pt-br/produtos?q=zzzzzz");
  await expect(page.getByRole("heading", { name: "Nenhum produto encontrado" })).toBeVisible();
  await page.getByRole("link", { name: "Limpar filtros" }).last().click();
  await expect(page).toHaveURL(/\/pt-br\/produtos$/);
});
