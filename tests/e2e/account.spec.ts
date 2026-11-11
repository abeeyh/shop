import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

// com cacheComponents a página anterior fica escondida no DOM (React Activity): só o campo visível
const field = (page: Page, label: string) => page.getByLabel(label).filter({ visible: true });

// RN-107 a RN-109 (#101): cadastro opcional, personagens salvos e exclusão da conta
test.describe("conta do cliente", () => {
  // outro IP de cliente: o balde de login por IP é o mesmo da equipe (docs/09) e os testes do admin já o usam
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.7" } });
  test("cadastro já entra logado → personagem salvo preenche a compra → excluir a conta", async ({
    page,
  }, info) => {
    test.setTimeout(60_000); // cadastro + HIBP + login + compra + exclusão
    const email = `e2e-${info.project.name}-${Date.now()}@example.com`;
    const password = `Shop-e2e-${Date.now()}-x9!Q`; // longa e aleatória: não está em vazamento (HIBP)

    await page.goto("/en/cadastro");
    await field(page, "Email").fill(email);
    await field(page, "Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    // #118: o cadastro já entra logado
    await expect(page).toHaveURL(/\/en\/conta$/, { timeout: 15_000 }); // sob a suíte em paralelo o login demora
    await expect(page.getByText(email)).toBeVisible();

    // RN-108: salvar personagem na conta
    await field(page, "Realm").fill("Area 52");
    await field(page, "Faction").selectOption("horde");
    await field(page, "Character name").fill("Thrall");
    await page.getByRole("button", { name: "Save character" }).click();
    await expect(page.getByText("Thrall · Area 52 · Horde")).toBeVisible();

    // na compra, o personagem salvo preenche o formulário
    await page.goto("/en/wow/mythic-plus/mythic-plus-key");
    await field(page, "Saved character").selectOption({ label: "Thrall · Area 52" });
    await expect(field(page, "Realm")).toHaveValue("Area 52");
    await expect(field(page, "Character name")).toHaveValue("Thrall");
    await expect(field(page, "Horde")).toBeChecked();

    // RN-109: excluir a conta pede a senha; depois a área da conta volta para o login
    await page.goto("/en/conta");
    await field(page, "Password").fill("wrong-password-123");
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toBeVisible();
    await field(page, "Password").fill(password);
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto("/en/conta");
    await expect(page).toHaveURL(/\/en\/entrar\?voltar=%2Fen%2Fconta$/); // #130: depois de entrar, volta para a conta
  });

  test("#118: e-mail já usado avisa para entrar; conta da equipe não entra pela loja", async ({
    page,
  }, info) => {
    // limite de 5 cadastros/h por IP (RN-107): roda num projeto só para a suíte caber no limite
    test.skip(info.project.name !== "desktop", "um projeto basta");
    await page.goto("/en/cadastro");
    await field(page, "Email").fill(E2E_ADMIN.email); // já existe (conta da equipe)
    await field(page, "Password").fill(`Shop-e2e-${Date.now()}-k7!Z`);
    await page.getByRole("button", { name: "Create account" }).click();
    // HIBP (rede) + hash da senha: sob a suíte inteira passa de 10 s
    await expect(page.getByRole("alert").filter({ hasText: "already has an account" })).toBeVisible({
      timeout: 20_000,
    });

    // RN-110: com a senha certa, a equipe é mandada para o /admin; com a errada, resposta genérica
    await page.goto("/en/entrar");
    await field(page, "Email").fill(E2E_ADMIN.email);
    await field(page, "Password").fill("Wrong-password-1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toBeVisible();
    await field(page, "Email").fill(E2E_ADMIN.email); // o React limpa o formulário depois da action
    await field(page, "Password").fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "team account" })).toBeVisible();
    await expect(page).toHaveURL(/\/en\/entrar$/);
  });

  test("#130: entrar pelo cabeçalho volta à página; sair fica nela; dica no Tab", async ({ page }, info) => {
    // limite de 5 cadastros/h por IP (RN-107): roda num projeto só
    test.skip(info.project.name !== "desktop", "um projeto basta");
    test.setTimeout(60_000);
    const product = "/en/wow/mythic-plus/mythic-plus-key";
    await page.goto(product);
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible(); // cabeçalho carregado (streaming)
    // ordem do cabeçalho: idioma · carrinho · usuário (sair só aparece logado)
    const tools = await header
      .locator("summary[aria-label], a[aria-label], button[aria-label]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(tools.slice(-3).map((x) => x?.replace(/\s*\(.*\)$/, ""))).toEqual([
      "Language, theme and time zone",
      expect.stringMatching(/^Cart/),
      "Sign in",
    ]);
    // dica aparece no foco por teclado
    await header.getByRole("link", { name: "Sign in" }).focus();
    await expect(header.getByText("Sign in", { exact: true })).toBeVisible();

    await header.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(new RegExp(`/en/entrar\\?voltar=${encodeURIComponent(product)}$`));
    await page.getByRole("link", { name: "Create account" }).click(); // o "voltar" vai junto
    await expect(page).toHaveURL(/\/en\/cadastro\?voltar=/);
    await field(page, "Email").fill(`e2e-back-${Date.now()}@example.com`);
    await field(page, "Password").fill(`Shop-e2e-${Date.now()}-b4!K`);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(new RegExp(`${product}$`), { timeout: 20_000 }); // voltou ao produto

    await header.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(new RegExp(`${product}$`));
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("#130: ?voltar para fora da loja é ignorado (sem open redirect)", async ({ page }) => {
    await page.goto("/en/entrar?voltar=//evil.example.com");
    await expect(page.locator('input[name="next"]')).toHaveCount(0);
  });
});

// RN-111 (#132): tema ao lado do idioma; visitante guarda no navegador, cliente na conta
test.describe("tema", () => {
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.8" } }); // outro balde de cadastro/h
  test("escolher tema → cadastro leva para a conta → entrar em outro navegador traz o tema", async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== "desktop", "um projeto basta (limite de cadastros/h)");
    test.setTimeout(60_000);
    const html = page.locator("html");
    await page.goto("/en");
    await page.getByRole("banner").locator('summary[aria-label="Language, theme and time zone"]').click();
    await page.getByRole("combobox", { name: "Theme" }).selectOption("ouro");
    await expect(html).toHaveAttribute("data-theme", "ouro");
    // a troca na tela é imediata; espera o servidor gravar o cookie antes de recarregar
    await expect
      .poll(async () => (await page.context().cookies()).find((c) => c.name === "theme")?.value)
      .toBe("ouro");
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "ouro"); // visitante: cookie, sem piscar

    const email = `e2e-theme-${Date.now()}@example.com`;
    const password = `Shop-e2e-${Date.now()}-t3!M`;
    await page.goto("/en/cadastro");
    await field(page, "Email").fill(email);
    await field(page, "Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/en\/conta$/, { timeout: 20_000 });

    // outro navegador (sem cookie): entrar carrega o tema da conta
    const other = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.8" } });
    const p2 = await other.newPage();
    await p2.goto("/en/entrar");
    await expect(p2.locator("html")).not.toHaveAttribute("data-theme", /./);
    await field(p2, "Email").fill(email);
    await field(p2, "Password").fill(password);
    await p2.getByRole("button", { name: "Sign in" }).click();
    await expect(p2).toHaveURL(/\/en\/conta$/, { timeout: 15_000 });
    await expect(p2.locator("html")).toHaveAttribute("data-theme", "ouro");
    await other.close();
  });

  test("tema fora da lista no cookie é ignorado", async ({ page, context }) => {
    await context.addCookies([{ name: "theme", value: "hack", url: test.info().project.use.baseURL! }]);
    await page.goto("/en");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /./);
  });
});

// #162: perfil com nome e avatar; chat do suporte ligado à conta (RN-92)
test.describe("perfil e chat da conta", () => {
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.9" } }); // outro balde de cadastro/h
  test("avatar no cabeçalho; chat aberto no perfil acompanha a conta em outro navegador", async ({
    page,
    browser,
    baseURL,
  }, info) => {
    test.skip(info.project.name !== "desktop", "um projeto basta (limite de cadastros/h)");
    test.setTimeout(90_000);
    const stamp = Date.now();
    const email = `e2e-profile-${stamp}@example.com`;
    const password = `Shop-e2e-${stamp}-p5!R`;
    await page.goto("/en/cadastro");
    await field(page, "Email").fill(email);
    await field(page, "Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/en\/conta$/, { timeout: 20_000 });

    // nome e avatar pronto
    await field(page, "What should we call you").fill("Thrall");
    await page.getByTitle("Crown").click(); // o rádio fica escondido: clica no avatar (label)
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Thrall" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Crown" })).toBeChecked();

    // chat: o botão do perfil abre o chat com o e-mail da conta (só leitura)
    await page.getByRole("button", { name: "Talk to support" }).click();
    const dialog = page.getByRole("region", { name: "Support" });
    await expect(dialog.getByRole("textbox", { name: "Email" })).toHaveValue(email);
    await expect(dialog.getByRole("textbox", { name: "Email" })).toHaveAttribute("readonly", "");
    await dialog.getByLabel("How can we help?").fill(`E2E perfil ${stamp}`);
    const live = page.waitForRequest(/\/api\/support\/conversations\/[0-9a-f-]{36}\/(stream|messages)/);
    await dialog.getByRole("button", { name: "Start chat" }).click();
    const conversationId = /conversations\/([0-9a-f-]{36})\//.exec((await live).url())![1];
    await expect(dialog.getByText(`E2E perfil ${stamp}`)).toBeVisible();

    // outro navegador (sem o cookie do chat): entrar na conta mostra a conversa no perfil
    const other = await browser.newContext({
      baseURL,
      extraHTTPHeaders: { "x-forwarded-for": "198.51.100.9" },
    });
    const p2 = await other.newPage();
    await p2.goto("/en/entrar");
    await field(p2, "Email").fill(email);
    await field(p2, "Password").fill(password);
    await p2.getByRole("button", { name: "Sign in" }).click();
    await expect(p2).toHaveURL(/\/en\/conta$/, { timeout: 15_000 });
    await expect(p2.getByText(`E2E perfil ${stamp}`).filter({ visible: true }).first()).toBeVisible();
    await other.close();

    // quem não é dono (sem a conta nem o cookie do chat) não lê a conversa: 404
    const stranger = await browser.newContext({ baseURL });
    const res = await stranger.request.get(`/api/support/conversations/${conversationId}/messages`);
    expect(res.status()).toBe(404);
    await stranger.close();
  });
});
