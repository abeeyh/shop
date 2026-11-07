import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sessions, staffInvites, staffProfiles, users } from "@/db/schema";
import { saveAudited } from "@/features/admin/audit";

export const INVITE_DAYS = 7;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export const listStaff = () =>
  db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      twoFactor: users.twoFactorEnabled,
      role: staffProfiles.role,
      languages: staffProfiles.languages,
      active: staffProfiles.active,
    })
    .from(staffProfiles)
    .innerJoin(users, eq(staffProfiles.userId, users.id))
    .orderBy(asc(users.email));

export const emailTaken = async (email: string) =>
  !!(await db.select({ id: users.id }).from(users).where(eq(users.email, email)))[0];

// RN-04: devolve o token uma única vez (vai no link); no banco fica só o hash
export async function createInvite(
  invitedBy: string,
  v: { email: string; role: "admin" | "suporte"; languages: string[] },
) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(staffInvites).values({
    ...v,
    invitedBy,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
  });
  return token;
}

export async function openInvite(token: string) {
  const [invite] = await db
    .select()
    .from(staffInvites)
    .where(
      and(
        eq(staffInvites.tokenHash, hash(token)),
        isNull(staffInvites.usedAt),
        gt(staffInvites.expiresAt, new Date()),
      ),
    );
  return invite ?? null;
}

// Aceite: cria conta + perfil e queima o convite na mesma transação (convite usado uma vez só)
export async function acceptInvite(token: string, name: string, password: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .update(staffInvites)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(staffInvites.tokenHash, hash(token)),
          isNull(staffInvites.usedAt),
          gt(staffInvites.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!invite) return false;
    const id = randomUUID();
    await tx.insert(users).values({ id, name, email: invite.email, emailVerified: true });
    await tx.insert(accounts).values({
      id: randomUUID(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: passwordHash,
    });
    await tx
      .insert(staffProfiles)
      .values({ userId: id, role: invite.role, languages: invite.languages, invitedBy: invite.invitedBy });
    return true;
  });
}

// RN-05: desativar derruba todas as sessões na hora; RN-07: tudo auditado
export const updateStaff = (
  staffId: string,
  userId: string,
  v: { role: "admin" | "suporte"; languages: string[]; active: boolean },
) =>
  saveAudited(
    "staff",
    staffId,
    userId,
    async (tx, key) => (await tx.select().from(staffProfiles).where(eq(staffProfiles.userId, key)))[0],
    async (tx) => {
      const [r] = await tx
        .update(staffProfiles)
        .set(v)
        .where(eq(staffProfiles.userId, userId))
        .returning({ id: staffProfiles.userId });
      if (r && !v.active) await tx.delete(sessions).where(eq(sessions.userId, userId));
      return r?.id;
    },
  );
