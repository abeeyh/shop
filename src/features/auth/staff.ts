import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { db } from "@/db";
import { staffProfiles } from "@/db/schema";
import { auth } from "./auth";

export type StaffRole = "suporte" | "admin";

// teto absoluto da sessão da equipe: a renovação (updateAge) não estende além disso
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

// Sessão + perfil de equipe ativo (RN-04, RN-05: desativado perde o acesso na hora)
export async function getStaff() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if (Date.now() - new Date(session.session.createdAt).getTime() > MAX_SESSION_MS) return null;
  const [profile] = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, session.user.id));
  if (!profile?.active) return null;
  return {
    user: session.user,
    role: profile.role,
    languages: profile.languages,
    twoFactor: session.user.twoFactorEnabled === true,
  };
}

// Toda página e Server Action do admin começa aqui (action é endpoint público — docs/09)
export async function requireStaff(locale: string, roles: StaffRole[] = ["admin"]) {
  const staff = await getStaff();
  if (!staff) redirect(`/${locale}/admin/entrar`);
  if (!staff.twoFactor) redirect(`/${locale}/admin/2fa`); // RN-02: painel só com 2FA ativo
  if (!roles.includes(staff.role)) forbidden(); // RN-06: 403 (ex.: suporte em preços e cupons)
  return staff;
}
