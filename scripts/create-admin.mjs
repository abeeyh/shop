// Cria uma conta de admin (RN-04: equipe nunca vem do cadastro público; os convites entram com #27).
// Uso: node scripts/create-admin.mjs <email> [--reset]
//   Senha: ADMIN_PASSWORD (mín. 12) ou gerada e mostrada uma vez. O 2FA é ativado no primeiro login (RN-02).
//   --reset apaga e recria a conta (só em APP_ENV=local — usado pelo E2E).
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { accounts, auditLog, deliveries, staffInvites, staffProfiles, users } from "../src/db/schema.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const [email, flag] = process.argv.slice(2);
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !process.env.DATABASE_URL) {
  console.error("Uso: node scripts/create-admin.mjs <email> [--reset] (DATABASE_URL obrigatória)");
  process.exit(1);
}
const reset = flag === "--reset";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const isLocalDb = LOCAL_HOSTS.has(new URL(process.env.DATABASE_URL).hostname);
// --reset recria uma conta com senha conhecida: só no banco local, nunca em homologação/produção
if (reset && (process.env.APP_ENV !== "local" || !isLocalDb)) {
  console.error("--reset só com APP_ENV=local e DATABASE_URL em localhost.");
  process.exit(1);
}
const password = process.env.ADMIN_PASSWORD ?? randomBytes(18).toString("base64url");
if (password.length < 12) {
  console.error("ADMIN_PASSWORD precisa de 12 caracteres ou mais.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);
const address = email.toLowerCase();
const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, address));
if (existing && !reset) {
  console.error("Já existe uma conta com esse e-mail.");
  process.exit(1);
}
await db.transaction(async (tx) => {
  if (existing) {
    // só com --reset (local): a auditoria dessa conta de teste sai junto
    await tx.delete(auditLog).where(eq(auditLog.staffId, existing.id));
    await tx.delete(deliveries).where(eq(deliveries.staffId, existing.id));
    await tx.delete(staffInvites).where(eq(staffInvites.invitedBy, existing.id));
    await tx.delete(users).where(eq(users.id, existing.id)); // cascata: sessões, 2FA, perfil
  }
  const id = randomUUID();
  await tx.insert(users).values({ id, name: address.split("@")[0], email: address, emailVerified: true });
  await tx.insert(accounts).values({
    id: randomUUID(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: await hashPassword(password),
  });
  await tx.insert(staffProfiles).values({ userId: id, role: "admin" });
});
console.log(`Admin ${address} criado.`);
if (!process.env.ADMIN_PASSWORD) console.log(`Senha (mostrada uma única vez): ${password}`);
await db.$client.end();
