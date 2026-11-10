"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCustomer } from "@/features/account";
import { cartSummary, clearCart, getCartId, setCartCoupon } from "@/features/cart";
import { canonicalEmail } from "@/features/discounts/queries";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { errorSummary, logger } from "@/lib/logger";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { createInvoice, invoiceReady } from "@/lib/payments/crypto";
import { isOrderToken, orderPath } from "./link";
import {
  CouponLimitError,
  getOrder,
  insertOrder,
  requestRefund,
  SoldOutError,
  startPayment,
} from "./queries";
import { canRequestRefund, NETWORKS, PAYMENT_WINDOW_MINUTES, STAFF_STEPS } from "./rules";

export type CheckoutState = {
  error:
    | ""
    | "email"
    | "empty"
    | "unavailable"
    | "payment"
    | "coupon"
    | "changed"
    | "limited"
    | "cardNotImplemented";
};

const input = z.object({
  email: z.email().max(254),
  method: z.enum(["usdt", "card"]).default("usdt"), // RN-35 (#120): cripto (USDT) ou cartão
  network: z.enum(NETWORKS),
  locale: z.enum(routing.locales),
  expectedTotal: z.coerce.number().int().nonnegative(), // só para comparar — nunca para calcular (RN-20)
});

// docs/09 §2: cada checkout reserva vaga e cupom; limite por IP impede esgotar cupom sem pagar
async function checkoutLimited(): Promise<boolean> {
  const ip = clientIp(await headers(), env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  const r = await rateLimit({
    key: `checkout:${rateLimitKey(ip)}`,
    ...RATE_LIMITS.checkout,
    failClosed: true,
  });
  return !r.allowed;
}

async function createOrder(order: Parameters<typeof insertOrder>[0], cartId: string) {
  try {
    return await insertOrder(order);
  } catch (err) {
    if (err instanceof SoldOutError) return { error: "unavailable" as const }; // vaga acabou entre a tela e o clique
    if (err instanceof CouponLimitError) {
      await setCartCoupon(cartId, null); // RN-25: limite atingido — o carrinho volta sem o cupom
      refresh();
      return { error: "coupon" as const };
    }
    throw err;
  }
}

// RN-107: conta logada (opcional) — visitante compra só com e-mail (RN-01)
const customerId = async () => (await getCustomer())?.id ?? null;

// RN-01, RN-20, RN-30, RN-35: total recalculado aqui; o pedido congela os preços e nasce
// "solicitado" (#170) — o pagamento começa no botão "Pagar" da página do pedido (payOrder)
export async function placeOrder(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "email" };
  const { email, method, network, locale, expectedTotal } = parsed.data;
  // RN-35 (#120): cartão ainda sem provedor (#25) — nada é criado nem reservado
  if (method === "card") return { error: "cardNotImplemented" };
  if (await checkoutLimited()) return { error: "limited" };
  const cartId = await getCartId();
  const cart = await cartSummary(locale, cartId);
  if (!cartId || cart.lines.length === 0) return { error: "empty" };
  if (cart.hasUnavailable) return { error: "unavailable" };
  // promoção venceu ou cupom mudou entre a tela e o clique: mostra o carrinho de novo
  if (cart.totalCents !== expectedTotal) {
    refresh();
    return { error: "changed" };
  }

  const order = {
    email: canonicalEmail(email),
    userId: await customerId(), // RN-107: o pedido aparece em "Meus pedidos"
    locale,
    network,
    subtotalUsdtCents: cart.subtotalCents,
    discountUsdtCents: cart.discount.discountCents, // RN-26: o maior entre promoção e cupom
    discountSource: cart.discount.source,
    discountRef: cart.couponId,
    totalUsdtCents: cart.totalCents,
    expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60_000),
    items: cart.lines.map((l) => ({
      productId: l.productId,
      raidSlotId: l.slotId,
      variantId: l.variantId, // #100
      productName: l.name,
      options: l.options,
      unitPriceUsdtCents: l.unitCents,
      discountUsdtCents: l.discountCents,
      promotionId: l.discountCents ? l.promotionId : null,
      quantity: l.quantity,
    })),
  };

  const created = await createOrder(order, cartId);
  if (typeof created !== "string") return created;
  await clearCart(cartId);
  redirect(orderPath(locale, created));
}

export type OrderActionState = { error: "" | "payment" | "stale" };

const orderInput = z.object({ locale: z.enum(routing.locales), id: z.uuid(), t: z.string().max(200) });

// dono do pedido = quem tem o link assinado (RN-01; docs/09: IDOR)
async function ownedOrder(form: FormData) {
  const p = orderInput.safeParse(Object.fromEntries(form));
  if (!p.success || !isOrderToken(p.data.id, p.data.t)) return null;
  const order = await getOrder(p.data.id);
  return order ? { order, locale: p.data.locale } : null;
}

// RN-32/RN-35 (#170): "Pagar". Gateway ligado (PAYMENTS_ENABLED + chave) = fatura do provedor e o IPN
// confirma. Senão o pedido fica aguardando e o suporte confirma o pagamento à mão (auditado, RN-07).
// TODO(#25/#146): tirar o modo manual quando o gateway sair da manutenção.
export async function payOrder(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  const owned = await ownedOrder(form);
  if (!owned || owned.order.status !== "solicitado" || !owned.order.network) return { error: "stale" };
  const { order, locale } = owned;
  const network = owned.order.network;
  if (!env.PAYMENTS_ENABLED || !invoiceReady()) {
    if (!(await startPayment(order.id))) return { error: "stale" };
    refresh();
    return { error: "" };
  }
  let payUrl: string;
  try {
    const invoice = await createInvoice({
      orderId: order.id,
      totalUsdtCents: order.totalUsdtCents,
      network,
      ipnUrl: `${env.APP_URL}/api/webhooks/crypto`,
      returnUrl: `${env.APP_URL}${orderPath(locale, order.id)}`,
    });
    payUrl = invoice.payUrl;
    const ok = await startPayment(order.id, {
      provider: "nowpayments",
      providerPaymentId: invoice.providerPaymentId,
      payUrl,
    });
    if (!ok) return { error: "stale" };
  } catch (err) {
    logger.error(
      { event: "checkout.invoice_failed", orderId: order.id, ...errorSummary(err) },
      "falha ao criar fatura",
    );
    return { error: "payment" }; // continua solicitado: dá para tentar de novo
  }
  redirect(payUrl);
}

// #170: cliente pede reembolso de pedido pago; a equipe analisa e só o admin reembolsa
export async function askRefund(_prev: OrderActionState, form: FormData): Promise<OrderActionState> {
  const owned = await ownedOrder(form);
  if (!owned || !canRequestRefund(owned.order.status)) return { error: "stale" };
  if (!(await requestRefund(owned.order.id, STAFF_STEPS.requestRefund.from))) return { error: "stale" };
  refresh();
  return { error: "" };
}
