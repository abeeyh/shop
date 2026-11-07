import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = (typeof import("@/db"))["db"];

// Integração com banco real (docs/13 §8). Revisão de segurança do #101: conta de cliente não verificada
// (RN-107) não pode "reservar" o e-mail de um futuro membro da equipe (RN-04).
describe.skipIf(!process.env.DATABASE_URL)("convite da equipe × conta de cliente (RN-04, RN-107)", () => {
  let db: Db;
  let s: typeof import("@/db/schema");
  let q: typeof import("./queries");
  const stamp = Date.now();
  const admin = `test-inv-admin-${stamp}`;
  const squatter = `test-inv-squat-${stamp}`;
  const verified = `test-inv-ver-${stamp}`;
  const email = `test-inv-${stamp}@example.com`;
  const verifiedEmail = `test-inv-ver-${stamp}@example.com`;

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    s = await import("@/db/schema");
    q = await import("./queries");
    await db.insert(s.users).values([
      { id: admin, name: "admin", email: `test-inv-admin-${stamp}@example.com`, emailVerified: true },
      { id: squatter, name: "", email }, // cliente que cadastrou antes, sem verificar
      { id: verified, name: "", email: verifiedEmail, emailVerified: true },
    ]);
    await db.insert(s.staffProfiles).values({ userId: admin, role: "admin" });
    await db
      .insert(s.characters)
      .values({ userId: squatter, realm: "Area 52", faction: "horde", name: "Thrall" });
  });

  afterAll(async () => {
    const ids = (
      await db
        .select({ id: s.users.id })
        .from(s.users)
        .where(inArray(s.users.email, [email]))
    ).map((u) => u.id);
    await db.delete(s.staffInvites).where(eq(s.staffInvites.invitedBy, admin));
    await db.delete(s.auditLog).where(inArray(s.auditLog.staffId, [...ids, admin])); // o aceite audita
    await db.delete(s.users).where(inArray(s.users.id, [...ids, admin, verified]));
    await db?.$client.end();
  });

  it("cliente não verificado não ocupa o e-mail; verificado ocupa", async () => {
    expect(await q.emailTaken(email)).toBe(false);
    expect(await q.emailTaken(verifiedEmail)).toBe(true);
  });

  it("aceite do convite derruba a conta não verificada e cria uma conta nova (não promove a antiga)", async () => {
    const token = await q.createInvite(admin, { email, role: "suporte", languages: [] });
    expect(await q.acceptInvite(token, "Support", "a-very-long-password-123")).toBe(true);
    const [u] = await db.select().from(s.users).where(eq(s.users.email, email));
    expect(u!.id).not.toBe(squatter);
    expect(u!.emailVerified).toBe(true);
    expect(await db.select().from(s.characters).where(eq(s.characters.userId, squatter))).toEqual([]);
    const [p] = await db.select().from(s.staffProfiles).where(eq(s.staffProfiles.userId, u!.id));
    expect(p!.role).toBe("suporte");
  });
});
