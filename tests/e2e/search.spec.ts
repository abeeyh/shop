import { expect, test } from "@playwright/test";

// #56: busca e página de produtos com filtros. RN-100 a RN-104.
const titles = (page: import("@playwright/test").Page) =>
  page.locator("main h3").filter({ visible: true }).allTextContents();
// #88: o esqueleto (loading.tsx) aparece antes; espera a contagem de resultados chegar
const results = (page: import("@playwright/test").Page) =>
  expect(page.getByText(/\d+ products?/).first()).toBeVisible();

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
  // nome parecido vem primeiro; depois o resto da categoria Mythic+ (KSH, bundles…) pelo nome da categoria
  expect(found.slice(0, 5).every((t) => /Mythic/.test(t))).toBe(true);
});

test("RN-100: termo de 1 caractere pede 2", async ({ page }) => {
  await page.goto("/pt-br/produtos?q=g");
  await expect(page.getByText("Digite pelo menos 2 caracteres.")).toBeVisible();
});

// #90: painel de filtros recolhível — fechado no celular, aberto no desktop
const filters = (page: import("@playwright/test").Page) => page.locator("details", { hasText: "Filters" });
// desktop abre sozinho depois de hidratar; no celular é preciso tocar no botão
async function openFilters(page: import("@playwright/test").Page, isMobile: boolean) {
  const panel = filters(page);
  if (isMobile) await panel.locator("summary").click();
  await expect(panel).toHaveAttribute("open", "");
}

test("#90: filtros começam recolhidos no celular e abertos no desktop; o botão alterna", async ({
  page,
  isMobile,
}) => {
  await page.goto("/en/produtos?promo=1");
  await results(page);
  const panel = filters(page);
  const gold = page.getByRole("checkbox", { name: "Gold", exact: true });
  await expect(panel.locator("summary")).toContainText("1"); // 1 filtro ativo, visível mesmo recolhido
  if (isMobile) await expect(gold).toBeHidden();
  else await expect(panel).toHaveAttribute("open", ""); // só clica depois que o desktop abriu
  await panel.locator("summary").click();
  if (isMobile) await expect(gold).toBeVisible();
  else await expect(gold).toBeHidden();
});

test("RN-101/RN-103: filtro de categoria vai para a URL, vira chip e o chip remove", async ({
  page,
  isMobile,
}) => {
  await page.goto("/en/produtos");
  await results(page);
  await openFilters(page, isMobile);
  await page.getByRole("checkbox", { name: "Gold", exact: true }).check();
  await expect(page).toHaveURL(/cat=gold/);
  expect((await titles(page)).every((t) => t.startsWith("Gold"))).toBe(true);
  await page.getByRole("link", { name: "Remove filter Gold" }).click();
  await expect(page).not.toHaveURL(/cat=gold/);
});

test("RN-102: ordenação por menor preço", async ({ page }) => {
  await page.goto("/en/produtos?sort=price-asc");
  await results(page);
  const prices = await page.locator("main .text-xl").filter({ visible: true }).allTextContents();
  const values = prices.map((p) => Number(p.replace(/[^\d.]/g, "")));
  expect(values.length).toBeGreaterThan(5);
  expect(values).toEqual([...values].sort((a, b) => a - b));
});

test("RN-103: parâmetros inválidos na URL são ignorados", async ({ page }) => {
  await page.goto("/en/produtos?min=abc&max=-1&sort=hack&cat=nope&page=0&region=EU");
  await results(page);
  expect((await titles(page)).length).toBeGreaterThan(0);
});

test("RN-104: sem resultado mostra o estado vazio e limpar filtros", async ({ page }) => {
  await page.goto("/pt-br/produtos?q=zzzzzz");
  await expect(page.getByRole("heading", { name: "Nenhum produto encontrado" })).toBeVisible();
  await page.getByRole("link", { name: "Limpar filtros" }).last().click();
  await expect(page).toHaveURL(/\/pt-br\/produtos$/);
});
