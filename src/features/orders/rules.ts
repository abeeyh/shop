import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { orderStatus, paymentNetwork } from "@/db/schema";

export type OrderStatus = (typeof orderStatus.enumValues)[number];
export const NETWORKS = paymentNetwork.enumValues; // RN-37
export type Network = (typeof NETWORKS)[number];

export const PAYMENT_WINDOW_MINUTES = 30; // RN-34

// Status do IPN reduzido ao que muda o pedido; "waiting"/"confirming" etc. não mudam nada
export type PaymentOutcome = "paid" | "partial" | "expired";

// RN-50 / RN-37: de onde cada resultado de pagamento pode levar o pedido
const TRANSITIONS: Record<PaymentOutcome, Partial<Record<OrderStatus, OrderStatus>>> = {
  paid: { pendente: "pago", pagamento_parcial: "pago" },
  partial: { pendente: "pagamento_parcial" },
  expired: { pendente: "expirado" },
};

// null = evento não muda o pedido (estado final, fora de ordem ou repetido)
export function nextStatus(current: OrderStatus, outcome: PaymentOutcome): OrderStatus | null {
  return TRANSITIONS[outcome][current] ?? null;
}

const NOWPAYMENTS_OUTCOME: Record<string, PaymentOutcome> = {
  finished: "paid",
  partially_paid: "partial",
  expired: "expired",
  failed: "expired",
};

export const outcomeOf = (providerStatus: string): PaymentOutcome | null =>
  NOWPAYMENTS_OUTCOME[providerStatus] ?? null;

// RN-37: valor pago menor que o total nunca vira "pago", mesmo que o provedor diga "finished"
export function settle(outcome: PaymentOutcome, paidCents: number, totalCents: number): PaymentOutcome {
  return outcome === "paid" && paidCents < totalCents ? "partial" : outcome;
}
