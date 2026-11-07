import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, orders, staffProfiles, users } from "@/db/schema";
import { MAX_CHARACTERS, type CharacterInput } from "./schemas";

export async function listCharacters(userId: string) {
  return db
    .select({
      id: characters.id,
      realm: characters.realm,
      faction: characters.faction,
      name: characters.name,
    })
    .from(characters)
    .where(eq(characters.userId, userId))
    .orderBy(asc(characters.createdAt));
}

// RN-108: até 10 por conta; o mesmo realm + nome não repete (índice único, sem diferenciar maiúsculas).
// A trava na linha do usuário serializa adições simultâneas (o limite não estoura em corrida).
export async function addCharacter(userId: string, c: CharacterInput): Promise<"ok" | "limit" | "duplicate"> {
  return db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const [n] = await tx.select({ n: count() }).from(characters).where(eq(characters.userId, userId));
    if ((n?.n ?? 0) >= MAX_CHARACTERS) return "limit";
    const inserted = await tx
      .insert(characters)
      .values({ userId, ...c })
      .onConflictDoNothing()
      .returning({ id: characters.id });
    return inserted.length ? "ok" : "duplicate";
  });
}

// IDOR: só apaga personagem da própria conta (docs/09 caso 2)
export async function deleteCharacter(userId: string, id: string) {
  await db.delete(characters).where(and(eq(characters.id, id), eq(characters.userId, userId)));
}

// RN-107: pedidos feitos com a conta logada (os de visitante com o mesmo e-mail não aparecem — o
// e-mail da conta não é verificado, docs/09)
export async function listCustomerOrders(userId: string) {
  return db
    .select({
      id: orders.id,
      status: orders.status,
      totalUsdtCents: orders.totalUsdtCents,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(50);
}

export const isStaff = async (userId: string) =>
  !!(
    await db.select({ id: staffProfiles.userId }).from(staffProfiles).where(eq(staffProfiles.userId, userId))
  )[0];

// RN-109: apaga conta, sessões e personagens (cascata); pedidos ficam (5 anos, fiscal) sem o vínculo
export async function deleteCustomer(userId: string) {
  await db.delete(users).where(eq(users.id, userId));
}
