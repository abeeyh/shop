import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, asc, eq, gt, isNotNull, isNull, notExists, or } from "drizzle-orm";
import { db } from "@/db";
import { accounts, auditLog, sessions, staffInvites, staffProfiles, users } from "@/db/schema";
import { saveAudited } from "@/features/admin/audit";
import { isUniqueViolation } from "@/features/admin/queries";

export const INVITE_DAYS = 7;
export class LastAdminError extends Error {}
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

// Ocupado = equipe ou e-mail verificado. Conta de cliente não verificada (RN-107) não bloqueia convite:
// senão qualquer um "reservaria" o e-mail de um futuro membro da equipe (revisão de segurança do #101)
export const emailTaken = async (email: string) =>
  !!(
    await db
      .select({ id: users.id })
      .from(users)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, users.id))
      .where(and(eq(users.email, email), or(eq(users.emailVerified, true), isNotNull(staffProfiles.userId))))
  )[0];

// RN-04: devolve o token uma única vez (vai no link); no banco fica só o hash
export async function createInvite(
  invitedBy: string,
  v: { email: string; role: "admin" | "suporte"; languages: string[] },
) {
  const token = randomBytes(32).toString("base64url");
  // convite novo para o mesmo e-mail invalida os pendentes (vale o papel do último)
  await db
    .update(staffInvites)
    .set({ usedAt: new Date() })
    .where(and(eq(staffInvites.email, v.email), isNull(staffInvites.usedAt)));
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
// Aceite: cria conta + perfil e queima o convite na mesma transação (convite usado uma vez só).
// Recusa se quem convidou não é mais admin ativo; e-mail já cadastrado = convite inválido (sem 500).
export async function acceptInvite(token: string, name: string, password: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  try {
    return await db.transaction(async (tx) => {
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
      const [inviter] = await tx
        .select({ role: staffProfiles.role, active: staffProfiles.active })
        .from(staffProfiles)
        .where(eq(staffProfiles.userId, invite.invitedBy));
      if (inviter?.role !== "admin" || !inviter.active) return false;
      // conta de cliente não verificada com o mesmo e-mail cai (sessões e personagens em cascata; pedidos
      // ficam sem o vínculo). NUNCA promover essa conta: a senha e as sessões podem ser de outra pessoa.
      await tx
        .delete(users)
        .where(
          and(
            eq(users.email, invite.email),
            eq(users.emailVerified, false),
            notExists(tx.select().from(staffProfiles).where(eq(staffProfiles.userId, users.id))),
          ),
        );
      const id = randomUUID();
      await tx.insert(users).values({ id, name, email: invite.email, emailVerified: true });
      await tx.insert(accounts).values({
        id: randomUUID(),
        userId: id,
        accountId: id,
        providerId: "credential",
        password: passwordHash,
      });
      const profile = {
        userId: id,
        role: invite.role,
        languages: invite.languages,
        invitedBy: invite.invitedBy,
      };
      await tx.insert(staffProfiles).values(profile);
      // RN-07: nova conta de equipe é a ação mais sensível do painel
      await tx.insert(auditLog).values({
        staffId: invite.invitedBy,
        entity: "staff",
        entityId: id,
        action: "create",
        before: null,
        after: { ...profile, email: invite.email },
      });
      return true;
    });
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
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
      if (v.role !== "admin" || !v.active) {
        // sempre sobra um admin ativo (linhas travadas: dois admins não se rebaixam ao mesmo tempo)
        const admins = await tx
          .select({ id: staffProfiles.userId })
          .from(staffProfiles)
          .where(and(eq(staffProfiles.role, "admin"), eq(staffProfiles.active, true)))
          .for("update");
        if (!admins.some((x) => x.id !== userId)) throw new LastAdminError();
        // convites pendentes de quem perde o poder de admin deixam de valer
        await tx
          .update(staffInvites)
          .set({ usedAt: new Date() })
          .where(and(eq(staffInvites.invitedBy, userId), isNull(staffInvites.usedAt)));
      }
      const [r] = await tx
        .update(staffProfiles)
        .set(v)
        .where(eq(staffProfiles.userId, userId))
        .returning({ id: staffProfiles.userId });
      if (r && !v.active) await tx.delete(sessions).where(eq(sessions.userId, userId));
      return r?.id;
    },
  );
