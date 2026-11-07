import { createHmac } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import postgres from "postgres";
import { E2E_IPN_SECRET } from "./constants";

// Mesmo formato de assinatura do NOWPayments, com o segredo que o playwright.config passa ao servidor
const sortKeys = (o: Record<string, unknown>) =>
  Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k]]),
  );
export const ipn = (request: APIRequestContext, body: Record<string, unknown>, secret = E2E_IPN_SECRET) =>
  request.post("/api/webhooks/crypto", {
    data: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-nowpayments-sig": createHmac("sha512", secret)
        .update(JSON.stringify(sortKeys(body)))
        .digest("hex"),
    },
  });

// #86: sem provedor de pagamento o checkout é bloqueado, então o pedido do teste entra direto no banco
// (fixture de teste, só banco local — global-setup). Mesmo pedido que o checkout criaria: M+ +10, 12 USDT.
const ORDER_LINK_DEV_SECRET = "dev-order-link-secret-only-for-local-and-tests"; // src/features/orders/link.ts
export async function seedOrder(): Promise<{ id: string; path: string }> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const [order] = await sql<{ id: string }[]>`
      insert into orders (email, locale, network, subtotal_usdt_cents, total_usdt_cents, provider, expires_at)
      values ('buyer@example.com', 'en', 'erc20', 1200, 1200, 'nowpayments', now() + interval '30 minutes')
      returning id`;
    await sql`
      insert into order_items (order_id, product_id, product_name, options, unit_price_usdt_cents, quantity)
      select ${order!.id}, id, name, ${sql.json({ keyLevel: 10, runs: 1, timed: false })}, 1200, 1
      from products where slug = 'mplus-us'`;
    const t = createHmac("sha256", ORDER_LINK_DEV_SECRET).update(`order:${order!.id}`).digest("base64url");
    return { id: order!.id, path: `/en/pedido/${order!.id}?t=${t}` };
  } finally {
    await sql.end();
  }
}
