import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { z } from "zod";
import { getCustomer } from "@/features/account/session";
import { getStaff } from "@/features/auth/staff";
import { getConversation, guestConversationId, listAccountConversations } from "./chat";
import { customerCanReply } from "./rules";

// #162: a conversa de quem está escrevendo — logado, a mais recente da conta que ainda aceita resposta
// (RN-93); senão, a do cookie do visitante
export async function currentConversationId(): Promise<string | null> {
  const customer = await getCustomer();
  if (customer) {
    const [last] = await listAccountConversations(customer.id, 1);
    if (last && customerCanReply(last)) return last.id;
  }
  const guest = await guestConversationId();
  if (!guest) return null;
  const c = await getConversation(guest);
  // conversa de visitante de outra conta não aparece para quem está logado
  return c && (!c.userId || c.userId === customer?.id) ? guest : null;
}

// Dono da conversa (cookie com token ou a conta logada — #162) ou equipe ativa (docs/04; 2FA opcional, #116)
export async function canAccessConversation(id: string): Promise<boolean> {
  if (!z.uuid().safeParse(id).success) return false;
  if ((await guestConversationId()) === id) return true;
  const customer = await getCustomer();
  if (customer && (await getConversation(id))?.userId === customer.id) return true;
  return !!(await getStaff());
}
