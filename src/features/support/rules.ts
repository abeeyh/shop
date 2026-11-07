import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

export type ConversationStatus = "aberta" | "em_atendimento" | "resolvida";

export const REOPEN_DAYS = 7; // RN-93
export const MAX_OPEN_PER_EMAIL = 3; // RN-97
export const MAX_MESSAGE_LENGTH = 2000;

// RN-93: resolvida volta a aberta se o cliente responde em até 7 dias; depois disso, nova conversa
export function customerCanReply(
  c: { status: ConversationStatus; resolvedAt: Date | null },
  now = new Date(),
) {
  if (c.status !== "resolvida") return true;
  return !!c.resolvedAt && now.getTime() - c.resolvedAt.getTime() <= REOPEN_DAYS * 86_400_000;
}

export const statusAfterCustomerMessage = (s: ConversationStatus): ConversationStatus =>
  s === "resolvida" ? "aberta" : s;

// RN-98: fila por chegada, mas primeiro as conversas nos idiomas do atendente
export function sortQueue<T extends { locale: string; createdAt: Date }>(
  items: T[],
  languages: string[],
): T[] {
  return [...items].sort((a, b) => {
    const la = languages.includes(a.locale) ? 0 : 1;
    const lb = languages.includes(b.locale) ? 0 : 1;
    return la - lb || a.createdAt.getTime() - b.createdAt.getTime();
  });
}
