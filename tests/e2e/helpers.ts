import { createHmac } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

// Mesmo formato de assinatura do NOWPayments, com o segredo de desenvolvimento do fake.
const DEV_IPN_SECRET = "dev-ipn-secret-only-for-local-and-tests";
const sortKeys = (o: Record<string, unknown>) =>
  Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k]]),
  );
export const ipn = (request: APIRequestContext, body: Record<string, unknown>, secret = DEV_IPN_SECRET) =>
  request.post("/api/webhooks/crypto", {
    data: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-nowpayments-sig": createHmac("sha512", secret)
        .update(JSON.stringify(sortKeys(body)))
        .digest("hex"),
    },
  });

export async function checkout(page: Page) {
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
