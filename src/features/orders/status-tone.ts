import type { BadgeTone } from "@/components/atoms/StatusBadge";
import type { OrderStatus } from "./rules";

// RF-07 (doc 17): cor do selo de cada status (RN-50). Ouro = precisa de alguém; vermelho = problema.
export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  solicitado: "neutral",
  aguardando_pagamento: "neutral",
  pagamento_parcial: "warning", // RN-37: o suporte avalia
  pago: "warning",
  agendado: "info",
  concluido_parcial: "info",
  concluido: "success",
  reembolso_solicitado: "warning",
  reembolsado: "neutral",
  cancelado: "neutral",
  falha_pagamento: "danger",
};
