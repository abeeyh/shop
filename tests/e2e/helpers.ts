import { createHmac } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
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
// (fixture de teste, só banco local — global-setup). Serviço sem horário (#94: agenda com o suporte), 12 USDT.
const ORDER_LINK_DEV_SECRET = "dev-order-link-secret-only-for-local-and-tests"; // src/features/orders/link.ts
const SERVICE = {
  kind: "service",
  realm: "Area 52",
  faction: "horde",
  character: "Thrall",
  addons: ["Armor Stack"],
  variant: ["+10"], // #100: combinação comprada (cópia nas opções do item)
};

// #102: idioma e fuso ficam atrás do globo no cabeçalho
export async function openPreferences(page: Page) {
  // fuso detectado = página hidratada (clique antes disso some no refresh da detecção)
  await expect(page.locator("#pref-timezone")).toBeEnabled();
  const prefs = page.locator("details", { has: page.locator("#pref-timezone") });
  if (!(await prefs.evaluate((d: HTMLDetailsElement) => d.open))) await prefs.locator("summary").click();
}

// #94: serviço pede o personagem (realm, facção, nome) antes de ir ao carrinho
export async function addService(page: Page, path = "/en/wow/mythic-plus/mythic-plus-key") {
  await page.goto(path);
  await page.getByLabel("Realm").fill("Area 52");
  await page.getByLabel("Character name").fill("Thrall");
  await page.getByRole("button", { name: "Add to cart" }).click();
  // sob carga (suíte inteira em paralelo) a action passa de 5 s
  await expect(page.getByRole("status").getByText("Added to cart")).toBeVisible({ timeout: 15_000 });
}

export async function seedOrder(): Promise<{ id: string; path: string }> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const [order] = await sql<{ id: string }[]>`
      insert into orders (email, locale, network, subtotal_usdt_cents, total_usdt_cents, provider, expires_at)
      values ('buyer@example.com', 'en', 'erc20', 1200, 1200, 'nowpayments', now() + interval '30 minutes')
      returning id`;
    await sql`
      insert into order_items (order_id, product_id, product_name, options, unit_price_usdt_cents, quantity)
      select ${order!.id}, id, name, ${sql.json(SERVICE)}, 1200, 1
      from products where slug = 'mythic-plus-key'`;
    const t = createHmac("sha256", ORDER_LINK_DEV_SECRET).update(`order:${order!.id}`).digest("base64url");
    return { id: order!.id, path: `/en/pedido/${order!.id}?t=${t}` };
  } finally {
    await sql.end();
  }
}
