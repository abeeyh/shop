import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";
import { isStaff } from "./queries";

// RN-107: cliente logado (conta opcional). RN-110 (#118): conta da equipe (suporte e admin) não é
// cliente — logada só no /admin; na loja ela compra como visitante e não tem "Minha conta".
export async function getCustomer() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (await isStaff(session.user.id))) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    avatar: (session.user as { avatar?: string | null }).avatar ?? null, // #162
  };
}

// sessão de equipe aberta (para mandar ao /admin em vez do login da loja)
export async function hasStaffSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return !!session && (await isStaff(session.user.id));
}
