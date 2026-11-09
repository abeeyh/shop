import type { BadgeTone } from "@/components/atoms/StatusBadge";
import type { OrderStatus } from "./rules";

// RF-07 (doc 17): cor do selo de cada status (RN-50). Ouro = precisa de alguém; vermelho = problema.
export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pendente: "neutral",
  pagamento_parcial: "warning",
  pago: "warning",
  em_andamento: "info",
  concluido: "success",
  expirado: "neutral",
  reembolsado: "neutral",
  contestado: "danger",
};
