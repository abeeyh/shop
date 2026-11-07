import { createHmac } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// #18: fatura USDT (adapter fake) + IPN assinado. RN-01, RN-32, RN-33, RN-37, RN-50.
// Mesmo formato de assinatura do NOWPayments, com o segredo de desenvolvimento do fake.
const DEV_IPN_SECRET = "dev-ipn-secret-only-for-local-and-tests";
const sortKeys = (o: Record<string, unknown>) =>
  Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k]]),
  );
const ipn = (request: APIRequestContext, body: Record<string, unknown>, secret = DEV_IPN_SECRET) =>
  request.post("/api/webhooks/crypto", {
    data: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-nowpayments-sig": createHmac("sha512", secret)
        .update(JSON.stringify(sortKeys(body)))
        .digest("hex"),
    },
  });

async function checkout(page: Page) {
  await page.goto("/en/wow/mythic-plus/mplus-us"); // +10, 1 run = 12,00 USDT
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("status").getByText("Added to cart")).toBeVisible();
  await page.goto("/en/carrinho");
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("ERC-20").check();
  await page.getByRole("button", { name: "Pay with USDT" }).click();
  await page.waitForURL(/\/en\/pedido\/[0-9a-f-]{36}\?t=/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

test.describe("checkout USDT", () => {
  test.skip(({ isMobile }) => isMobile, "fluxo de servidor; o layout do carrinho já é coberto no celular");

  test("RN-37/RN-50/RN-33: pendente → parcial → pago; IPN repetido não muda nada", async ({
    page,
    request,
  }) => {
    const orderId = await checkout(page);
    const status = page.getByTestId("order-status");
    await expect(status).toHaveText("Awaiting payment");
    await expect(page.getByText("Pay on the ERC-20 network only")).toBeVisible();

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

    // carrinho foi esvaziado no checkout
    await page.goto("/en/carrinho");
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });

  test("RN-32: IPN sem assinatura válida é recusado e não muda o pedido", async ({ page, request }) => {
    const orderId = await checkout(page);
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

  test("link do pedido sem a assinatura certa não mostra nada (docs/09: IDOR)", async ({ page }) => {
    const orderId = await checkout(page);
    await page.goto(`/en/pedido/${orderId}?t=forjado`);
    await expect(page.getByTestId("order-status")).toHaveCount(0);
    await page.goto(`/en/pedido/${orderId}`);
    await expect(page.getByTestId("order-status")).toHaveCount(0);
  });

  test("RN-01: e-mail inválido não cria pedido", async ({ page }) => {
    await page.goto("/en/wow/mythic-plus/mplus-us");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByRole("status").getByText("Added to cart")).toBeVisible();
    await page.goto("/en/carrinho");
    await page.getByLabel("Email").fill("a@b");
    await page.getByLabel("Email").evaluate((el: HTMLInputElement) => (el.type = "text")); // passa do HTML5
    await page.getByRole("button", { name: "Pay with USDT" }).click();
    await expect(page.getByText("Enter a valid email.")).toBeVisible();
    await expect(page).toHaveURL(/\/en\/carrinho$/);
  });
});
