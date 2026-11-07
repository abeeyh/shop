import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Adapter PaymentProvider de USDT (docs/14 §6). Não muda estado de pedido — só fala com o gateway.
export type Invoice = { providerPaymentId: string; payUrl: string };
export type CreateInvoice = {
  orderId: string;
  totalUsdtCents: number;
  network: "trc20" | "erc20";
  ipnUrl: string;
  returnUrl: string;
};

export const PAY_CURRENCY = { trc20: "usdttrc20", erc20: "usdterc20" } as const;
const DEV_IPN_SECRET = "dev-ipn-secret-only-for-local-and-tests"; // público: só vale em APP_ENV=local

function ipnSecret(): string {
  if (env.NOWPAYMENTS_IPN_SECRET) return env.NOWPAYMENTS_IPN_SECRET;
  if (env.APP_ENV === "local") return DEV_IPN_SECRET;
  throw new Error("NOWPAYMENTS_IPN_SECRET ausente fora de local"); // env.ts já impede; defesa extra
}

// Assinatura do IPN no formato NOWPayments: HMAC-SHA512 do JSON com as chaves ordenadas
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    );
  return v;
}

export const signIpn = (payload: unknown, secret = ipnSecret()) =>
  createHmac("sha512", secret)
    .update(JSON.stringify(sortKeys(payload)))
    .digest("hex");

// RN-32: só aceita corpo com assinatura válida; comparação em tempo constante
export function verifyIpn(payload: unknown, signature: string | null): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signIpn(payload), "hex");
  const got = Buffer.from(signature, "hex");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

async function nowpaymentsInvoice(i: CreateInvoice): Promise<Invoice> {
  const base = env.NOWPAYMENTS_SANDBOX ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io";
  const res = await fetch(`${base}/v1/invoice`, {
    method: "POST",
    headers: { "x-api-key": env.NOWPAYMENTS_API_KEY!, "content-type": "application/json" },
    body: JSON.stringify({
      // shortcut: cobra em "usd" com taxa fixa (1 USD ≈ 1 USDT); trocar para preço em USDT se o
      // sandbox aceitar price_currency cripto — confirmar ao abrir a conta (docs/14 §7)
      price_amount: i.totalUsdtCents / 100,
      price_currency: "usd",
      pay_currency: PAY_CURRENCY[i.network],
      order_id: i.orderId,
      ipn_callback_url: i.ipnUrl,
      success_url: i.returnUrl,
      cancel_url: i.returnUrl,
      is_fixed_rate: true,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`nowpayments invoice ${res.status}`);
  const body = (await res.json()) as { id: string | number; invoice_url: string };
  return { providerPaymentId: String(body.id), payUrl: body.invoice_url };
}

// Fake para dev/testes: a "fatura" é a própria página do pedido; o pagamento chega por IPN assinado
// com o segredo de desenvolvimento (o E2E assina e envia). env.ts proíbe o fake em production.
const fakeInvoice = async (i: CreateInvoice): Promise<Invoice> => ({
  providerPaymentId: `fake-${randomUUID()}`,
  payUrl: new URL(i.returnUrl).pathname + new URL(i.returnUrl).search, // mesma origem
});

export const createInvoice = (i: CreateInvoice) =>
  env.PAYMENTS_PROVIDER === "nowpayments" ? nowpaymentsInvoice(i) : fakeInvoice(i);
