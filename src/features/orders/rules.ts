import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { orderStatus, paymentNetwork } from "@/db/schema";

export type OrderStatus = (typeof orderStatus.enumValues)[number];
export const NETWORKS = paymentNetwork.enumValues; // RN-37
export type Network = (typeof NETWORKS)[number];

export const PAYMENT_WINDOW_MINUTES = 120; // RN-34: sem pagamento em 2 h o pedido é cancelado

// Status do IPN reduzido ao que muda o pedido; "waiting"/"confirming" etc. não mudam nada
export type PaymentOutcome = "paid" | "partial" | "expired" | "failed";

// RN-50 / RN-37: de onde cada resultado de pagamento pode levar o pedido
const TRANSITIONS: Record<PaymentOutcome, Partial<Record<OrderStatus, OrderStatus>>> = {
  paid: { aguardando_pagamento: "pago", pagamento_parcial: "pago" },
  partial: { aguardando_pagamento: "pagamento_parcial" },
  expired: { aguardando_pagamento: "cancelado" },
  failed: { aguardando_pagamento: "falha_pagamento", pagamento_parcial: "falha_pagamento" },
};

// null = evento não muda o pedido (estado final, fora de ordem ou repetido)
export function nextStatus(current: OrderStatus, outcome: PaymentOutcome): OrderStatus | null {
  return TRANSITIONS[outcome][current] ?? null;
}

const NOWPAYMENTS_OUTCOME: Record<string, PaymentOutcome> = {
  finished: "paid",
  partially_paid: "partial",
  expired: "expired",
  failed: "failed",
};

export const outcomeOf = (providerStatus: string): PaymentOutcome | null =>
  NOWPAYMENTS_OUTCOME[providerStatus] ?? null;

// RN-37: valor pago menor que o total nunca vira "pago", mesmo que o provedor diga "finished"
export function settle(outcome: PaymentOutcome, paidCents: number, totalCents: number): PaymentOutcome {
  return outcome === "paid" && paidCents < totalCents ? "partial" : outcome;
}

// RN-34: ainda sem pagamento — cancelado pelo cron depois do prazo (vaga e cupom voltam)
export const UNPAID: OrderStatus[] = ["solicitado", "aguardando_pagamento"];

// RN-50 / RN-52 (#170): passos da equipe. `admin` = só o admin (reembolso e falha de pagamento).
// shortcut: confirmar pagamento é manual enquanto o gateway está em manutenção (TODO #25/#146: IPN)
export type StaffStep =
  "confirmPayment" | "schedule" | "partial" | "complete" | "requestRefund" | "refund" | "fail";
type Step = { from: OrderStatus[]; to: OrderStatus; admin?: true; proof?: true };
export const STAFF_STEPS: Record<StaffStep, Step> = {
  confirmPayment: { from: ["solicitado", "aguardando_pagamento", "pagamento_parcial"], to: "pago" },
  schedule: { from: ["pago"], to: "agendado" },
  partial: { from: ["agendado"], to: "concluido_parcial", proof: true },
  complete: { from: ["agendado", "concluido_parcial"], to: "concluido", proof: true },
  requestRefund: { from: ["pago", "agendado", "concluido_parcial", "concluido"], to: "reembolso_solicitado" },
  refund: { from: ["reembolso_solicitado"], to: "reembolsado", admin: true },
  fail: { from: ["aguardando_pagamento", "pagamento_parcial", "pago"], to: "falha_pagamento", admin: true },
};

// passos que essa pessoa pode dar agora (suporte não vê os do admin)
export const staffSteps = (status: OrderStatus, role: "admin" | "suporte"): StaffStep[] =>
  (Object.keys(STAFF_STEPS) as StaffStep[]).filter(
    (s) => STAFF_STEPS[s].from.includes(status) && (role === "admin" || !STAFF_STEPS[s].admin),
  );

// #170: o cliente pede reembolso de pedido já pago (a equipe analisa)
export const canRequestRefund = (status: OrderStatus) => STAFF_STEPS.requestRefund.from.includes(status);

// RN-16 (#94): serviço comprado sem horário é agendado com o suporte depois que o pagamento entra
export const needsScheduling = (o: {
  status: OrderStatus;
  items: { options: unknown; raidSlotId: string | null }[];
}) =>
  o.status === "pago" &&
  o.items.some((i) => (i.options as { kind?: string } | null)?.kind === "service" && !i.raidSlotId);
