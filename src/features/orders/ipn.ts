import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ipnReady, verifyIpn } from "@/lib/payments/crypto";
import { applyPaymentEvent, type ApplyResult } from "./queries";
import { outcomeOf } from "./rules";

export const MAX_IPN_BYTES = 16_384;

const cents = (n: number) => Math.round(n * 100);

// Campos do IPN que a loja usa (formato NOWPayments); o resto é ignorado
const ipn = z.object({
  payment_id: z.union([z.string(), z.number()]).transform(String),
  payment_status: z.string().max(40),
  order_id: z.uuid(),
  price_amount: z.coerce.number().positive(),
  pay_amount: z.coerce.number().positive(),
  pay_currency: z.string().max(20),
  actually_paid: z.coerce.number().nonnegative().default(0),
  payin_hash: z.string().max(200).nullish(),
});

// precisa de alerta (docs/16): dinheiro chegou num pedido encerrado ou o IPN não bate com o pedido
const ALERT: Partial<Record<ApplyResult, string>> = {
  late_payment: "webhook.late_payment",
  mismatch: "webhook.mismatch",
};

// RN-32, RN-33, RN-37. Responde 200 também para duplicado/ignorado: o provedor para de reenviar.
export async function handleCryptoIpn(raw: string, signature: string | null, requestId: string) {
  if (raw.length > MAX_IPN_BYTES) return 413;
  if (!ipnReady()) return 501; // sem segredo do provedor: API ainda não implementada
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return 400;
  }
  if (!verifyIpn(body, signature)) {
    logger.warn({ event: "webhook.signature_invalid", requestId }, "IPN com assinatura inválida");
    return 401;
  }
  const parsed = ipn.safeParse(body);
  if (!parsed.success) return 400;
  const p = parsed.data;
  const result = await applyPaymentEvent({
    provider: "nowpayments",
    // mesmo pagamento manda vários IPNs; o parcial pode crescer, então o valor pago entra na chave
    eventId: `${p.payment_id}:${p.payment_status}:${p.actually_paid}`,
    paymentId: p.payment_id,
    orderId: p.order_id,
    type: p.payment_status,
    outcome: outcomeOf(p.payment_status),
    priceCents: cents(p.price_amount),
    payCurrency: p.pay_currency,
    payAmountCents: cents(p.pay_amount),
    paidCents: cents(p.actually_paid),
    txHash: p.payin_hash ?? undefined,
  });
  const ctx = { requestId, orderId: p.order_id, status: p.payment_status, result };
  const alert = ALERT[result];
  if (alert) logger.warn({ event: alert, ...ctx }, "IPN precisa de revisão do admin");
  else logger.info({ event: "webhook.processed", ...ctx }, "IPN");
  return result === "unknown_order" ? 404 : 200;
}
