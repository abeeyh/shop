import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { z } from "zod";
import { getStaff } from "@/features/auth/staff";
import { guestConversationId } from "./chat";

// Dono da conversa (cookie com token) ou equipe ativa com 2FA (docs/04 — rotas do chat)
export async function canAccessConversation(id: string): Promise<boolean> {
  if (!z.uuid().safeParse(id).success) return false;
  if ((await guestConversationId()) === id) return true;
  const staff = await getStaff();
  return !!staff?.twoFactor;
}
