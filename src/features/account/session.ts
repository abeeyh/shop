import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { headers } from "next/headers";
import { auth } from "@/features/auth/auth";

// RN-107: cliente logado (conta opcional). Equipe também é usuário — pode ver a própria área de cliente,
// mas o painel continua exigindo perfil de equipe + 2FA (features/auth/staff.ts).
export async function getCustomer() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? { id: session.user.id, email: session.user.email } : null;
}
