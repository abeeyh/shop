import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import { checkout, ipn } from "./helpers";

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

  test("RN-02/RN-19: ativa 2FA, cria categoria e produto que aparecem na vitrine", async ({
    page,
    browser,
    baseURL,
    request,
  }) => {
    // outro aparelho entra só com a senha antes da ativação
    const other = await browser.newContext({ baseURL });
    const otherPage = await other.newPage();
    await login(otherPage);
    await expect(otherPage).toHaveURL(/\/en\/admin\/2fa$/);

    await login(page);
    await expect(page).toHaveURL(/\/en\/admin\/2fa$/); // painel bloqueado até ativar o 2FA
    await page.goto("/en/admin/categorias");
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
    await page.goto("/en/admin/categorias");
    await page.getByLabel("Name").fill(`E2E Keys ${id}`);
    await page.getByLabel("Slug (URL)").fill(`e2e-keys-${id}`);
    await page.getByLabel("Type").selectOption("dungeon"); // M+: vai ao carrinho sem horário
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await expect(page.getByRole("cell", { name: new RegExp(`E2E Keys ${id}`) }).first()).toBeVisible();

    await page.goto("/en/admin/produtos");
    await page.getByLabel("Category").selectOption({ label: `E2E Keys ${id}` });
    await page.getByLabel("Name").fill(`E2E Key Product ${id}`);
    await page.getByLabel("Slug (URL)").fill(`e2e-product-${id}`);
    await page.getByLabel("Price (USDT)").fill("9.99");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");

    // slug repetido é recusado no campo (o formulário de criação limpa depois de salvar)
    await page.getByLabel("Name").fill(`E2E Key Product ${id} 2`);
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
    await page.getByLabel("Active").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/Deactivate or move the active products/)).toBeVisible();

    // RN-21/RN-22: promoção de 10% no produto → riscado + contagem na página do produto
    await page.goto("/en/admin/promocoes");
    await page.getByLabel("Name").fill(`E2E Promo ${id}`);
    await page.getByLabel("Value (% or USDT)").fill("10");
    await page.getByLabel("Applies to").selectOption({ label: `E2E Key Product ${id}` });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.goto(`/en/wow/e2e-keys-${id}/e2e-product-${id}`);
    await expect(page.locator("s").getByText("9.99 USDT")).toBeVisible();
    await expect(page.getByText("8.99 USDT").first()).toBeVisible();
    await expect(page.getByRole("timer", { name: "Promotion ends in" })).toBeVisible();

    // RN-25/RN-26: cupom de 50% vence a promoção; código inválido tem mensagem genérica
    await page.goto("/en/admin/cupons");
    await page.getByLabel("Code").fill(`e2e${id}`);
    await page.getByLabel("Value (% or USDT)").fill("50");
    await page.getByLabel("Applies to").selectOption({ label: `E2E Key Product ${id}` });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");

    await page.goto(`/en/wow/e2e-keys-${id}/e2e-product-${id}`);
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
    await page.goto("/en/admin/produtos");
    await page.getByRole("link", { name: `Edit E2E Key Product ${id}` }).click();
    await page.getByLabel("Active").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.goto("/en/admin/categorias");
    await page.getByRole("link", { name: `Edit E2E Keys ${id}` }).click();
    await page.getByLabel("Active").uncheck();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");

    // RN-71: as alterações aparecem na auditoria com quem e o antes → depois
    await page.goto("/en/admin/auditoria");
    await expect(page.getByText(`Updated Category: E2E Keys ${id}`).first()).toBeVisible();
    await expect(page.getByText(`Created Product: E2E Key Product ${id}`)).toBeVisible();
    await expect(page.getByText(E2E_ADMIN.email).first()).toBeVisible();

    // RN-50/RN-52: pedido pago → equipe inicia → conclui com prova → cliente vê no pedido
    const buyer = await browser.newContext({ baseURL });
    const buyerPage = await buyer.newPage();
    const orderId = await checkout(buyerPage);
    const paid = { payment_id: Date.now() + Math.random(), order_id: orderId, pay_currency: "usdterc20" };
    await ipn(request, {
      ...paid,
      price_amount: 12,
      pay_amount: 12,
      payment_status: "finished",
      actually_paid: 12,
    });
    await page.goto("/en/admin/pedidos");
    await page.getByRole("link", { name: orderId.slice(0, 8) }).click();
    const staffStatus = page.getByTestId("staff-order-status");
    await expect(staffStatus).toHaveText("Paid");
    await page.getByRole("button", { name: "Start delivery" }).click();
    await expect(staffStatus).toHaveText("In progress");
    await page.getByLabel(/Delivery proof link/).fill("https://example.com/proof.png");
    await page.getByLabel("Note for the customer").fill("Gold sent by mail.");
    await page.getByRole("button", { name: "Mark as completed" }).click();
    await expect(staffStatus).toHaveText("Completed");
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
    await expect(page.getByText(`E2E report ${id}`)).toHaveCount(0); // sai da lista de novos

    // RN-74: equipe lê os docs do repositório
    await page.goto("/en/admin/docs");
    await page.getByRole("link", { name: "02 — Regras de negócio" }).click();
    await expect(page.getByText("RN-74").first()).toBeVisible();

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
