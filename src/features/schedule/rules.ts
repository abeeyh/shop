import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

// RN-83: horário de referência do servidor de cada região
export const SERVER_TIMEZONE = "America/New_York"; // horário dos servidores US (RN-14: loja só US)

// RN-16 / RN-11: vagas restantes; sem vaga = esgotado (não pode ir ao carrinho)
export function seatsLeft(slot: { capacity: number; reserved: number }): number {
  return Math.max(0, slot.capacity - slot.reserved);
}

export const isBookable = (slot: { capacity: number; reserved: number; startsAt: Date }, now = new Date()) =>
  seatsLeft(slot) > 0 && slot.startsAt.getTime() > now.getTime();
