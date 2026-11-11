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
  // #160: produtos agrupados pela tag principal, na ordem do admin
  await expect(page.getByRole("heading", { level: 2, name: "Heroic", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Normal", exact: true })).toBeVisible();
  // tags viram chips de filtro (?tag=): só a tag escolhida fica
  const chips = page.getByRole("navigation", { name: "Tags" }).filter({ visible: true });
  await chips.getByRole("link", { name: "Normal", exact: true }).click();
  await expect(page).toHaveURL(/\?tag=normal$/);
  await expect(page.getByRole("heading", { level: 2, name: "Heroic", exact: true })).toHaveCount(0);
  await expect(chips.getByRole("link", { name: "Normal", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await chips.getByRole("link", { name: "All", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Heroic", exact: true })).toBeVisible();
  // #100: a raid aparece uma vez por dificuldade; as runs viram opções dentro do produto
  // pelo endereço: "Venomous Abyss + Tidebound Grotto" também casa com o nome (#134)
  await page.locator('a[href$="/wow/raids/venomous-abyss-heroic"]').filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/en\/wow\/raids\/venomous-abyss-heroic$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // com cacheComponents a página anterior fica escondida no DOM (React Activity): filtrar o visível
  const h1 = page.getByRole("heading", { level: 1 }).filter({ visible: true });
  await expect(h1).toHaveText("Venomous Abyss");
  await expect(page.getByText("5.18 USDT", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(
    page.getByText("Self-play: you play your own character. We never ask for your Battle.net password."),
  ).toBeVisible();

  // #136: galeria, descrição detalhada e FAQ (fechada até clicar)
  await expect(
    page.getByRole("img", { name: /Illustration of the Venomous Abyss/ }).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByText(/main raid of the current season/).filter({ visible: true })).toBeVisible();
  const faq = page.getByRole("region", { name: "Frequently asked questions" }).filter({ visible: true });
  const answer = faq.getByText(/Eight: Nek'zali the Soulcoiler/);
  await expect(answer).toBeHidden();
  await faq.getByText("How many bosses are in the Venomous Abyss?").click();
  await expect(answer).toBeVisible();
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

// #139: no desktop a caixa de compra (sticky) não pode ficar por cima da galeria nem da FAQ
test("#139: galeria e FAQ não ficam atrás da caixa de compra", async ({ page, isMobile }) => {
  test.skip(isMobile, "no celular a caixa vem abaixo, sem sticky");
  await page.goto("/en/wow/raids/venomous-abyss-tidebound-grotto-9-9-heroic");
  const buy = page
    .getByRole("button", { name: "Add to cart" })
    .filter({ visible: true })
    .locator("xpath=ancestor::*[contains(@class,'sticky')][1]");
  const gallery = page.getByRole("list", { name: "Gallery" }).filter({ visible: true });
  const faq = page.getByRole("region", { name: "Frequently asked questions" }).filter({ visible: true });
  const overlap = async (other: typeof gallery) => {
    const [a, b] = [await buy.boundingBox(), await other.boundingBox()];
    if (!a || !b) throw new Error("sem caixa");
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  };
  expect(await overlap(gallery)).toBe(false);
  await faq.scrollIntoViewIfNeeded();
  expect(await overlap(faq)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); // sem rolagem lateral
});

// #166: grade (padrão) ou lista — a escolha vai na URL e o cookie lembra nas outras páginas
test("#166: alterna lista/grade e a escolha vale na busca", async ({ page }) => {
  await page.goto("/en/wow/raids");
  const view = page.getByRole("group", { name: "View" }).filter({ visible: true });
  // grade é o padrão (pedido do dono)
  await expect(view.getByRole("link", { name: "Grid" })).toHaveAttribute("aria-current", "true");
  await expect(page.locator("main article").filter({ visible: true }).first()).toBeVisible(); // cartões
  await view.getByRole("link", { name: "List" }).click();
  await expect(page).toHaveURL(/vista=lista/);
  await expect(page.locator("main article").filter({ visible: true })).toHaveCount(0);
  await page.goto("/en/produtos?q=venomous");
  const view2 = page.getByRole("group", { name: "View" }).filter({ visible: true });
  await expect(view2.getByRole("link", { name: "List" })).toHaveAttribute("aria-current", "true"); // cookie
  await view2.getByRole("link", { name: "Grid" }).click();
  await expect(page).toHaveURL(/vista=grade/);
  await expect(page.locator("main article").filter({ visible: true }).first()).toBeVisible();
});
