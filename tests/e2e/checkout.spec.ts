import { expect, test } from "@playwright/test";
import { addService, ipn, seedOrder } from "./helpers";

// #18/#86: IPN assinado sobre pedido criado no banco (o gateway real não roda no teste).
// RN-01, RN-32, RN-33, RN-37, RN-50.
test.describe("checkout USDT", () => {
  test.skip(({ isMobile }) => isMobile, "fluxo de servidor; o layout do carrinho já é coberto no celular");

  test("RN-37/RN-50/RN-33: aguardando → parcial → pago; IPN repetido não muda nada", async ({
    page,
    request,
  }) => {
    const { id: orderId, path } = await seedOrder();
    await page.goto(path);
    const status = page.getByTestId("order-status");
    await expect(status).toHaveText("Awaiting payment");
    await expect(page.getByText("Pay on the ERC-20 network only")).toBeVisible();
    // análise de 2026-11-07: a combinação e os adicionais aparecem; o personagem não (link compartilhável)
    await expect(page.getByText("+10 · Armor Stack")).toBeVisible();
    await expect(page.getByText("Thrall")).toHaveCount(0);

    const base = {
      payment_id: Date.now() + Math.random(),
      order_id: orderId,
      pay_currency: "usdterc20",
      price_amount: 12,
      pay_amount: 11.98, // cotação: a fatura pede menos USDT que o total em USD
    };
    expect(
      (await ipn(request, { ...base, payment_status: "partially_paid", actually_paid: 5 })).status(),
    ).toBe(200);
    await page.reload();
    await expect(status).toHaveText("Partially paid");

    // "finished" com valor menor que o total continua parcial (RN-37)
    await ipn(request, { ...base, payment_status: "finished", actually_paid: 11.9 });
    await page.reload();
    await expect(status).toHaveText("Partially paid");

    const paid = { ...base, payment_status: "finished", actually_paid: 11.98 }; // = pay_amount → pago
    expect((await ipn(request, paid)).status()).toBe(200);
    expect((await ipn(request, paid)).status()).toBe(200); // repetido: aceito, sem efeito
    await ipn(request, { ...base, payment_status: "expired", actually_paid: 0 }); // fora de ordem
    await page.reload();
    await expect(status).toHaveText("Paid");

    // RN-16 (#94): serviço sem horário — o pedido pago oferece agendar com o suporte, já com o nº do pedido
    await page.getByRole("button", { name: "Schedule with support" }).click();
    await expect(page.getByRole("textbox", { name: "How can we help?" })).toHaveValue(
      `Hi! I'd like to schedule the run for order ${orderId.slice(0, 8)}.`,
    );
  });

  test("RN-32: IPN sem assinatura válida é recusado e não muda o pedido", async ({ page, request }) => {
    const { id: orderId, path } = await seedOrder();
    await page.goto(path);
    const body = {
      payment_id: Date.now() + Math.random(),
      order_id: orderId,
      payment_status: "finished",
      actually_paid: 12,
    };
    expect((await ipn(request, body, "segredo-errado")).status()).toBe(401);
    expect((await request.post("/api/webhooks/crypto", { data: JSON.stringify(body) })).status()).toBe(401);
    // assinado, mas de outra rede ou de outro valor: registrado e sem efeito
    const signed = { ...body, price_amount: 12, pay_amount: 12, pay_currency: "usdterc20" };
    await ipn(request, { ...signed, pay_currency: "usdttrc20" });
    await ipn(request, { ...signed, payment_id: Date.now() + Math.random(), price_amount: 1, pay_amount: 1 });
    // corpo grande é recusado antes de ser lido
    const big = await request.post("/api/webhooks/crypto", { data: "x".repeat(20_000) });
    expect(big.status()).toBe(413);
    await page.reload();
    await expect(page.getByTestId("order-status")).toHaveText("Awaiting payment");
  });

  test("#170: checkout cria o pedido solicitado; Pagar sem gateway fica aguardando o suporte", async ({
    page,
  }) => {
    await addService(page);
    await page.goto("/en/carrinho");
    const notice =
      "For now our support team confirms payments by hand: place the order, click Pay and talk to us in the chat.";
    await expect(page.getByRole("status").filter({ hasText: notice })).toBeVisible();
    await page.getByLabel("Email").fill("buyer@example.com");
    await page.getByRole("button", { name: "Pay with USDT" }).click();
    await expect(page).toHaveURL(/\/en\/pedido\/[0-9a-f-]+\?t=/);
    const status = page.getByTestId("order-status");
    await expect(status).toHaveText("Requested");
    await page.getByRole("button", { name: "Pay", exact: true }).click();
    await expect(status).toHaveText("Awaiting payment");
    await expect(
      page.getByText("Our support team confirms your payment for now.", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pay with support" }).click();
    await expect(page.getByRole("textbox", { name: "How can we help?" })).toHaveValue(
      /I'd like to pay for order/,
    );
  });

  test("#120: escolher cartão mostra 'API ainda não implementada' e não deixa pagar", async ({ page }) => {
    await addService(page);
    await page.goto("/en/carrinho");
    await expect(page.getByRole("radio", { name: "Crypto (USDT)" })).toBeChecked();
    await page.getByRole("radio", { name: "Credit card" }).check();
    await expect(page.getByText("Credit card: API not yet implemented.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay by card" })).toBeDisabled();
    await expect(page.getByRole("radio", { name: "TRC-20" })).toBeHidden(); // rede só vale para cripto
    await page.getByRole("radio", { name: "Crypto (USDT)" }).check();
    await expect(page.getByRole("button", { name: "Pay with USDT" })).toBeEnabled();
  });

  test("link do pedido sem a assinatura certa não mostra nada (docs/09: IDOR)", async ({ page }) => {
    const { id: orderId } = await seedOrder();
    await page.goto(`/en/pedido/${orderId}?t=forjado`);
    await expect(page.getByTestId("order-status")).toHaveCount(0);
    await page.goto(`/en/pedido/${orderId}`);
    await expect(page.getByTestId("order-status")).toHaveCount(0);
  });

  test("RN-01: e-mail inválido não cria pedido", async ({ page }) => {
    await addService(page);
    await page.goto("/en/carrinho");
    await page.getByLabel("Email").fill("a@b");
    await page.getByLabel("Email").evaluate((el: HTMLInputElement) => (el.type = "text")); // passa do HTML5
    const pay = page.getByRole("button", { name: "Pay with USDT" });
    await pay.click();
    await expect(page.getByText("Enter a valid email.")).toBeVisible();
    await expect(page).toHaveURL(/\/en\/carrinho$/);
  });
});
