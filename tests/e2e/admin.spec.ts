import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import { seedOrder } from "./helpers";

// #20: admin com 2FA e CRUD de categorias/produtos. RN-02, RN-04, RN-13, RN-19, RN-70, RN-72, RN-73.

// TOTP (RFC 6238, SHA-1, 30 s, 6 dígitos) a partir da chave base32 mostrada na ativação
function totp(secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replace(/=+$/, "").toUpperCase()]
    .map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

async function login(page: Page, password = E2E_ADMIN.password) {
  await page.goto("/en/admin/entrar");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("admin", () => {
  // o 1º passo ativa o 2FA da conta: repetir o teste na mesma rodada não faz sentido
  test.describe.configure({ retries: 0 });
  test.skip(({ isMobile }) => isMobile, "uma conta de admin por rodada; o fluxo é de servidor");

  test("RN-02: sem sessão o painel manda para o login; senha errada é recusada", async ({ page }) => {
    await page.goto("/en/admin/categorias");
    await expect(page).toHaveURL(/\/en\/admin\/entrar$/);
    // RN-74: documentação interna não existe para visitante (404, sem redirecionar ao login)
    await page.goto("/en/admin/docs");
    await expect(page).toHaveURL(/\/en\/admin\/docs$/);
    await expect(page.getByRole("link", { name: /Regras de negócio/ })).toHaveCount(0);
    await login(page, "senha-errada-123");
    await expect(page.getByText("Invalid email, password or code.")).toBeVisible();
  });

  test("RN-02/RN-19: 2FA opcional (ativa pelo painel), cria categoria e produto que aparecem na vitrine", async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(120_000); // percorre o admin inteiro numa sessão (2FA é ativado uma vez por rodada)
    // outro aparelho entra só com a senha antes da ativação
    const other = await browser.newContext({ baseURL });
    const otherPage = await other.newPage();
    await login(otherPage);
    await expect(otherPage).toHaveURL(/\/en\/admin$/);

    await login(page);
    await expect(page).toHaveURL(/\/en\/admin$/); // #116: painel abre sem 2FA
    // #158: equipe logada vê o atalho "Painel" no cabeçalho da loja
    await page.goto("/en");
    await page.getByRole("banner").getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/en\/admin$/);
    await expect(page.getByText("Paid today")).toBeVisible(); // RF-20: o admin vê o faturamento do dia
    await page.goto("/en/admin/categorias");
    await expect(page).toHaveURL(/\/en\/admin\/categorias$/);
    // #144: barra lateral marca a página atual (e só ela)
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Categories", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator('aside a[aria-current="page"]')).toHaveCount(1);
    await page.getByRole("link", { name: "2FA" }).click(); // ativar continua possível
    await expect(page).toHaveURL(/\/en\/admin\/2fa$/);
    await page.getByLabel("Password").fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Get setup key" }).click();
    const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
    await page.getByLabel("Code from the app").fill(totp(secret));
    await page.getByRole("button", { name: "Turn on and continue" }).click();
    await expect(page).toHaveURL(/\/en\/admin$/);

    // RN-02: a sessão sem código do outro aparelho foi revogada na ativação
    await otherPage.goto("/en/admin/categorias");
    await expect(otherPage).toHaveURL(/\/en\/admin\/entrar$/);
    await other.close();

    const id = Date.now().toString(36);
    // doc 11 §8: criar e editar em página própria (/novo e /<id>), voltando para a lista ao criar
    await page.goto("/en/admin/categorias");
    await page.getByRole("link", { name: "New category" }).click();
    await page.getByLabel("Name", { exact: true }).fill(`E2E Keys ${id}`);
    await page.getByLabel("Slug (URL)").fill(`e2e-keys-${id}`);
    await page.getByLabel("Type").selectOption("dungeon"); // M+: vai ao carrinho sem horário
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/categorias$/); // criou: volta para a lista, que já tem a categoria
    await expect(page.getByRole("cell", { name: new RegExp(`E2E Keys ${id}`) }).first()).toBeVisible();

    await page.goto("/en/admin/produtos");
    await page.getByRole("link", { name: "New product" }).click();
    await expect(page.getByRole("heading", { name: "New product" })).toBeVisible(); // a lista também tem um filtro "Category"
    await page
      .getByRole("combobox", { name: "Category", exact: true })
      .selectOption({ label: `E2E Keys ${id}` });
    await page.getByLabel("Name", { exact: true }).fill(`E2E Key Product ${id}`);
    await page.getByLabel("Slug (URL)").fill(`e2e-product-${id}`);
    await page.getByLabel("Price (USDT)").fill("9.99");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/produtos$/);

    // slug repetido é recusado no campo
    await page.getByRole("link", { name: "New product" }).click();
    await expect(page.getByRole("heading", { name: "New product" })).toBeVisible(); // a lista também tem um filtro "Category"
    await page
      .getByRole("combobox", { name: "Category", exact: true })
      .selectOption({ label: `E2E Keys ${id}` });
    await page.getByLabel("Name", { exact: true }).fill(`E2E Key Product ${id} 2`);
    await page.getByLabel("Slug (URL)").fill(`e2e-product-${id}`);
    await page.getByLabel("Price (USDT)").fill("1");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/^Slug: lowercase/)).toBeVisible();

    await page.goto(`/en/wow/e2e-keys-${id}/e2e-product-${id}`);
    await expect(page.getByRole("heading", { name: `E2E Key Product ${id}` })).toBeVisible();
    await expect(page.getByText("9.99").first()).toBeVisible();

    // RN-73: categoria com produto ativo não pode ser desativada
    await page.goto("/en/admin/categorias");
    await page.getByRole("link", { name: `Edit E2E Keys ${id}` }).click();
    await expect(page.getByRole("heading", { name: `Edit E2E Keys ${id}` })).toBeVisible(); // navegação terminou
    await page.getByLabel("Active").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/Deactivate or move the active products/)).toBeVisible();
    // #158: excluir é marcação, mas categoria com produtos não sai
    await page.getByRole("button", { name: "Delete" }).click();
    await page
      .getByRole("dialog", { name: `Delete E2E Keys ${id}?` })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.getByText(/still has products/)).toBeVisible();

    // RN-21/RN-22: promoção de 10% no produto → riscado + contagem na página do produto
    await page.goto("/en/admin/promocoes");
    await page.getByRole("link", { name: "New promotion" }).first().click();
    await page.getByLabel("Name", { exact: true }).fill(`E2E Promo ${id}`);
    await page.getByLabel("Value (% or USDT)").fill("10");
    await page.getByLabel("Applies to").selectOption({ label: `E2E Key Product ${id}` });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/promocoes$/);
    await page.goto(`/en/wow/e2e-keys-${id}/e2e-product-${id}`);
    await expect(page.locator("s").getByText("9.99 USDT")).toBeVisible();
    await expect(page.getByText("8.99 USDT").first()).toBeVisible();
    await expect(page.getByRole("timer", { name: "Promotion ends in" })).toBeVisible();
    // RN-22/RN-102: aparece no filtro "em promoção" da busca
    await page.goto("/en/produtos?promo=1");
    await expect(page.getByRole("link", { name: `E2E Key Product ${id}` })).toBeVisible();

    // RN-25/RN-26: cupom de 50% vence a promoção; código inválido tem mensagem genérica
    await page.goto("/en/admin/cupons");
    await page.getByRole("link", { name: "New coupon" }).first().click();
    await page.getByLabel("Code").fill(`e2e${id}`);
    await page.getByLabel("Value (% or USDT)").fill("50");
    await page.getByLabel("Applies to").selectOption({ label: `E2E Key Product ${id}` });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/cupons$/);

    await page.goto(`/en/wow/e2e-keys-${id}/e2e-product-${id}`);
    await page.getByLabel("Realm").fill("Area 52"); // #94: serviço pede o personagem
    await page.getByLabel("Character name").fill("Thrall");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("status").getByText("Added to cart")).toBeVisible();
    await page.goto("/en/carrinho");
    await expect(page.getByTestId("cart-total")).toHaveText("8.99 USDT"); // só a promoção
    await page.getByPlaceholder("Coupon code").fill("nao-existe");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Invalid or expired coupon.")).toBeVisible();
    await page.getByPlaceholder("Coupon code").fill(`E2E${id.toUpperCase()}`); // sem diferenciar maiúsculas
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(`Coupon E2E${id.toUpperCase()}`)).toBeVisible();
    await expect(page.getByTestId("cart-total")).toHaveText("4.99 USDT"); // 9,99 − 5,00 (vale o maior)

    // tira o produto e a categoria do teste da vitrine (RN-72: desativa, não apaga)
    await page.goto(`/en/admin/produtos?q=${encodeURIComponent(`E2E Key Product ${id}`)}`); // RF-03: busca
    await expect(page.getByRole("cell", { name: `E2E Key Product ${id}` }).first()).toBeVisible();
    await page.getByRole("link", { name: `Edit E2E Key Product ${id}` }).click();
    await expect(page.getByRole("heading", { name: `Edit E2E Key Product ${id}` })).toBeVisible(); // navegação terminou
    // RF-10/RF-11 (doc 17): eixo e grade de preços no editor visual (sem digitar o formato de texto)
    const dialog = page.locator("main");
    await dialog.getByRole("button", { name: "Add an axis" }).click();
    await dialog.getByLabel("Axis name (e.g. Bosses)").fill("Tier");
    await dialog.getByLabel("Values, separated by commas").fill("Bronze, Gold");
    await dialog.getByLabel("Price (USDT) Bronze").fill("5");
    await dialog.getByLabel("Price (USDT) Gold").fill("7.50");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.reload();
    await expect(page.getByLabel("Price (USDT) Gold")).toHaveValue("7.50");
    await expect(page.getByLabel("Sells Bronze")).toBeChecked();
    await page.getByLabel("Active").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.goto("/en/admin/categorias");
    await page.getByRole("link", { name: `Edit E2E Keys ${id}` }).click();
    await expect(page.getByRole("heading", { name: `Edit E2E Keys ${id}` })).toBeVisible(); // navegação terminou
    await page.getByLabel("Active").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");

    // doc 17 §3: o que nunca foi usado pode ser excluído (e vai para a auditoria)
    // #160: tags no lugar das subcategorias — criar e excluir (só marca, #158)
    await page.goto("/en/admin/tags/novo");
    await page.getByLabel("Name", { exact: true }).fill(`E2E Temp ${id}`);
    await page.getByLabel("Slug (URL)").fill(`e2e-temp-${id}`);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/tags$/);
    // excluir direto pela linha da lista (ação por linha)
    await page.getByRole("button", { name: `Delete E2E Temp ${id}` }).click();
    await page
      .getByRole("dialog", { name: `Delete E2E Temp ${id}?` })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page).toHaveURL(/\/en\/admin\/tags$/);
    await expect(page.getByRole("cell", { name: new RegExp(`E2E Temp ${id}`) })).toHaveCount(0);

    // RN-71: as alterações aparecem na auditoria com quem e o antes → depois
    await page.goto("/en/admin/auditoria");
    await expect(page.getByText(`Updated Category: E2E Keys ${id}`).first()).toBeVisible();
    await expect(page.getByText(`Created Product: E2E Key Product ${id}`)).toBeVisible();
    await expect(page.getByText(`Deleted Tag: E2E Temp ${id}`)).toBeVisible();
    await expect(page.getByText(E2E_ADMIN.email).first()).toBeVisible();
    // #88: cursor e página inválidos na URL voltam para a primeira página (sem erro)
    await page.goto("/en/admin/auditoria?antes=2026-02-30T00:00:00.000000Z_x");
    await expect(page.getByText(`Created Product: E2E Key Product ${id}`)).toBeVisible();
    await page.goto("/en/admin/pedidos?todos=1&pagina=-3");
    await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();

    // RN-50/RN-52 (#170): suporte confirma o pagamento à mão → agenda → conclui com prova → cliente vê
    const buyer = await browser.newContext({ baseURL });
    const buyerPage = await buyer.newPage();
    const { id: orderId, path: orderPath } = await seedOrder();
    await buyerPage.goto(orderPath);
    await page.goto("/en/admin/pedidos");
    await page.getByRole("link", { name: orderId.slice(0, 8) }).click();
    const staffStatus = page.getByTestId("staff-order-status");
    await expect(staffStatus).toHaveText("Awaiting payment");
    // RF-05/RF-22 (doc 17): avançar pede confirmação; cancelar não muda nada
    await page.getByRole("button", { name: "Confirm payment" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Go back" }).click();
    await expect(staffStatus).toHaveText("Awaiting payment");
    await page.getByRole("button", { name: "Confirm payment" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
    await expect(staffStatus).toHaveText("Paid");
    await page.getByRole("button", { name: "Schedule", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
    await expect(staffStatus).toHaveText("Scheduled");
    const done = page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: "Mark as completed" }) });
    await done.getByLabel(/Delivery proof link/).fill("https://example.com/proof.png");
    await done.getByLabel("Note for the customer").fill("Gold sent by mail.");
    await done.getByRole("button", { name: "Mark as completed" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
    await expect(staffStatus).toHaveText("Completed");
    await expect(page.getByRole("region", { name: "History" }).getByText("Completed")).toBeVisible(); // linha do tempo
    await buyerPage.reload();
    await expect(buyerPage.getByTestId("order-status")).toHaveText("Completed");
    await expect(buyerPage.getByRole("link", { name: "See the delivery proof" })).toHaveAttribute(
      "href",
      "https://example.com/proof.png",
    );
    // RN-91: reporte feito pelo rodapé chega ao dashboard com página e requestId
    await buyerPage.goto("/en/produtos");
    await buyerPage.getByRole("link", { name: "Report a problem" }).click();
    await expect(buyerPage).toHaveURL(/\/en\/reportar\?pagina=%2Fen%2Fprodutos/);
    await buyerPage.getByLabel("What happened?").fill(`E2E report ${id}: search is slow`);
    await buyerPage.getByRole("button", { name: "Send report" }).click();
    await expect(buyerPage.getByText("Thanks! Your report was sent to our team.")).toBeVisible();
    await buyer.close();
    await page.goto("/en/admin/reportes");
    const card = page.getByRole("listitem").filter({ hasText: `E2E report ${id}` });
    await expect(card.getByText("/en/produtos")).toBeVisible();
    await card.getByRole("button", { name: "Mark as resolved" }).click();
    await card.getByRole("dialog").getByRole("button", { name: "Confirm" }).click(); // RF-05
    await expect(page.getByText(`E2E report ${id}`)).toHaveCount(0); // sai da lista de novos

    // RN-74: equipe lê os docs do repositório
    await page.goto("/en/admin/docs");
    await page.getByRole("link", { name: "02 — Regras de negócio" }).click();
    await expect(page.getByText("RN-74").first()).toBeVisible();

    // RN-04 a RN-06: convite de suporte → aceite → 2FA → 403 em preços/categorias; desativar derruba
    const supportEmail = `e2e-support-${id}@shop.test`;
    await page.goto("/en/admin/equipe");
    await page.getByLabel("Email").fill(supportEmail);
    await page.locator('select[name="role"]').first().selectOption("admin"); // convite errado (admin)…
    await page.getByRole("button", { name: "Create invite link" }).click();
    const wrongLink = (await page.getByTestId("invite-link").textContent())!.trim();
    await page.goto("/en/admin/equipe"); // …e o certo (suporte) para o mesmo e-mail invalida o primeiro
    await page.getByLabel("Email").fill(supportEmail);
    await page.getByRole("button", { name: "Create invite link" }).click();
    const link = (await page.getByTestId("invite-link").textContent())!.trim();
    expect(link).not.toBe(wrongLink);
    const support = await browser.newContext({ baseURL });
    const sp = await support.newPage();
    await sp.goto(new URL(wrongLink).pathname);
    await expect(
      sp.getByText("This invite is invalid, already used or expired.", { exact: false }),
    ).toBeVisible();
    await sp.goto(new URL(link).pathname);
    await sp.getByLabel("Your name").fill("Suporte E2E");
    const supportPassword = `Sup0rt-${id}-${Math.random().toString(36).slice(2)}`;
    await sp.locator('input[name="password"]').fill(supportPassword);
    await sp.getByLabel("Confirm password").fill(supportPassword);
    await sp.getByRole("button", { name: "Create access" }).click();
    await expect(sp).toHaveURL(/\/en\/admin\/entrar$/);
    await sp.getByLabel("Email").fill(supportEmail);
    await sp.locator('input[name="password"]:visible').fill(supportPassword);
    await sp.getByRole("button", { name: "Sign in" }).click();
    await expect(sp).toHaveURL(/\/en\/admin$/); // #116: sem 2FA, entra direto
    // RF-20 (doc 17): o suporte tem a visão geral dele, sem faturamento nem equipe (RN-06)
    await expect(sp.getByText("Orders to do")).toBeVisible();
    await expect(sp.getByText("Paid today")).toHaveCount(0);
    await expect(sp.getByText("Team without 2FA")).toHaveCount(0);
    await sp.goto("/en/admin/cupons");
    await expect(sp.getByRole("heading", { name: "No access" })).toBeVisible();
    await sp.goto("/en/admin/pedidos");
    await expect(sp.getByRole("heading", { name: "Orders" })).toBeVisible();
    // #144: o menu do suporte só mostra o que ele abre (RN-06)
    const spNav = sp.getByRole("navigation", { name: "Admin" });
    await expect(spNav.getByRole("link", { name: "Orders", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    for (const name of ["Coupons", "Products", "Team", "Audit"])
      await expect(spNav.getByRole("link", { name })).toHaveCount(0);
    await page.goto("/en/admin/equipe");
    const member = page.getByRole("form", { name: supportEmail });
    await member.getByLabel("Active").uncheck();
    await member.getByRole("button", { name: "Save" }).click();
    await member.getByRole("dialog").getByRole("button", { name: "Confirm" }).click(); // RF-05: desativar confirma
    await expect(member.getByRole("status")).toHaveText("Saved");
    await sp.goto("/en/admin/pedidos");
    await expect(sp).toHaveURL(/\/en\/admin\/entrar$/); // RN-05: sessões derrubadas na hora
    await support.close();

    // RN-92 a RN-95: visitante abre o chat, o suporte responde em tempo real, cartão é mascarado
    const visitor = await browser.newContext({ baseURL });
    const vp = await visitor.newPage();
    await vp.goto("/en");
    await vp.getByRole("button", { name: "Chat with support" }).click();
    await expect(
      vp.getByText("We will never ask for your Battle.net password or card details."),
    ).toBeVisible();
    await vp.getByLabel("Email").fill(`e2e-visitor-${id}@example.com`);
    await vp.getByLabel("Name (optional)").fill(`E2E Visitor ${id}`);
    await vp.getByLabel("How can we help?").fill("My card is 4111 1111 1111 1111, can you help?");
    await vp.getByRole("button", { name: "Start chat" }).click();
    await expect(vp.getByText("My card is [cartão removido], can you help?")).toBeVisible();

    await page.goto("/en/admin/suporte");
    await page.getByRole("link", { name: `E2E Visitor ${id}` }).click();
    await expect(page.getByTestId("conversation-status")).toHaveText("Open");
    await expect(page.getByText("My card is [cartão removido], can you help?")).toBeVisible();
    // #168: o suporte digitando NÃO aparece para o cliente (só o sinal do cliente é enviado)
    await page.getByPlaceholder("Write a message").fill("Hi! Which realm?");
    await expect(vp.getByText(/typing/i)).toHaveCount(0);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(vp.getByText("Hi! Which realm?")).toBeVisible(); // SSE: sem recarregar
    await vp.getByPlaceholder("Write a message").pressSequentially("Area 52, thanks");
    await expect(page.getByText("Customer is typing…")).toBeVisible(); // #168: a equipe vê o cliente digitando
    await vp.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Area 52, thanks")).toBeVisible();
    await expect(page.getByText("Customer is typing…")).toHaveCount(0); // a mensagem chegou: some
    await page.reload();
    await expect(page.getByTestId("conversation-status")).toHaveText("In progress"); // respondeu = assumiu
    await page.getByRole("button", { name: "Mark as resolved" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click(); // RF-05
    await expect(page.getByTestId("conversation-status")).toHaveText("Resolved");
    await visitor.close();

    // RN-99: fora do horário o chat vira formulário offline e diz quando volta
    const day = (new Date().getUTCDay() + 3) % 7; // só um dia daqui a 3 dias: agora está fechado
    await page.goto("/en/admin/equipe");
    await page.locator(`input[name="open-${day}"]`).check();
    await page.locator(`input[name="start-${day}"]`).fill("03:00");
    await page.locator(`input[name="end-${day}"]`).fill("04:00");
    const hoursForm = page.locator("form", { has: page.locator(`input[name="open-${day}"]`) });
    await hoursForm.getByRole("button", { name: "Save" }).click();
    await expect(hoursForm.getByRole("status")).toHaveText("Saved");
    const late = await browser.newContext({ baseURL });
    const lp = await late.newPage();
    await lp.goto("/en");
    await lp.getByRole("button", { name: "Chat with support" }).click();
    await expect(lp.getByTestId("chat-offline")).toContainText("We're back at");
    await expect(lp.getByRole("button", { name: "Leave a message" })).toBeVisible();
    await late.close();
    await page.locator(`input[name="open-${day}"]`).uncheck(); // volta a "sempre aberto"
    await hoursForm.getByRole("button", { name: "Save" }).click();
    await expect(hoursForm.getByRole("status")).toHaveText("Saved");

    // RN-02: depois de sair, o login pede o código
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/entrar$/);
    await login(page);
    await expect(page).toHaveURL(/\/en\/admin\/entrar\/codigo$/);
    await page.getByLabel("Code").fill(totp(secret, Date.now() + 30_000)); // janela seguinte: não reusa
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL(/\/en\/admin$/);
  });
});
