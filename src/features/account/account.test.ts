import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { characterInput, signUpInput } from "./schemas";

type Db = (typeof import("@/db"))["db"];

describe("conta do cliente — entradas (RN-107, RN-108)", () => {
  it("#107: senha 8+ com maiúscula, minúscula e número; e-mail válido", () => {
    const ok = { email: "a@b.co", password: "Abcdefg1", locale: "en" };
    expect(signUpInput.safeParse(ok).success).toBe(true);
    expect(signUpInput.safeParse({ ...ok, password: "Abcdef1" }).success).toBe(false);
    expect(signUpInput.safeParse({ ...ok, password: "abcdefg1" }).success).toBe(false);
    expect(signUpInput.safeParse({ ...ok, email: "nope" }).success).toBe(false);
  });
  it("personagem com as regras da compra (RN-15)", () => {
    expect(characterInput.parse({ realm: " Area 52 ", faction: "horde", name: "Thrall" })).toEqual({
      realm: "Area 52",
      faction: "horde",
      name: "Thrall",
    });
    expect(characterInput.safeParse({ realm: "A", faction: "horde", name: "Thrall" }).success).toBe(false);
    expect(characterInput.safeParse({ realm: "Area", faction: "x", name: "Thrall" }).success).toBe(false);
    expect(characterInput.safeParse({ realm: "Area", faction: "horde", name: "Th rall" }).success).toBe(
      false,
    );
  });
});

// Integração com banco real (docs/13 §8)
describe.skipIf(!process.env.DATABASE_URL)("conta do cliente — banco (RN-108, RN-109)", () => {
  let db: Db;
  let s: typeof import("@/db/schema");
  let q: typeof import("./queries");
  const stamp = Date.now();
  const [me, other] = [`test-acc-${stamp}`, `test-acc2-${stamp}`];
  let orderId: string;

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    s = await import("@/db/schema");
    q = await import("./queries");
    await db.insert(s.users).values([
      { id: me, name: "", email: `${me}@example.com` },
      { id: other, name: "", email: `${other}@example.com` },
    ]);
    const [o] = await db
      .insert(s.orders)
      .values({
        email: `${me}@example.com`,
        userId: me,
        locale: "en",
        subtotalUsdtCents: 100,
        totalUsdtCents: 100,
        expiresAt: new Date(Date.now() + 60_000),
      })
      .returning({ id: s.orders.id });
    orderId = o!.id;
  });

  afterAll(async () => {
    await db.delete(s.orders).where(eq(s.orders.id, orderId));
    await db.delete(s.users).where(eq(s.users.id, other));
    await db.delete(s.users).where(eq(s.users.id, me));
    await db?.$client.end();
  });

  const char = (name: string, realm = "Area 52") => ({ realm, faction: "horde" as const, name });

  it("salva até 10; repetido (sem diferenciar maiúsculas) não duplica", async () => {
    expect(await q.addCharacter(me, char("Thrall"))).toBe("ok");
    expect(await q.addCharacter(me, char("THRALL", "area 52"))).toBe("duplicate");
    for (const n of [
      "Jaina",
      "Sylvanas",
      "Anduin",
      "Garrosh",
      "Varian",
      "Tyrande",
      "Malfurion",
      "Illidan",
      "Arthas",
    ])
      expect(await q.addCharacter(me, char(n))).toBe("ok");
    expect(await q.addCharacter(me, char("Guldan"))).toBe("limit");
    expect(await q.listCharacters(me)).toHaveLength(10);
  });

  it("IDOR: outra conta não apaga personagem que não é dela", async () => {
    const [first] = await q.listCharacters(me);
    await q.deleteCharacter(other, first!.id);
    expect(await q.listCharacters(me)).toHaveLength(10);
    await q.deleteCharacter(me, first!.id);
    expect(await q.listCharacters(me)).toHaveLength(9);
  });

  it("minhas compras e exclusão da conta: personagens somem, o pedido fica sem o vínculo", async () => {
    expect((await q.listCustomerOrders(me)).map((o) => o.id)).toEqual([orderId]);
    expect(await q.listCustomerOrders(other)).toEqual([]);
    await q.deleteCustomer(me);
    expect(await q.listCharacters(me)).toEqual([]);
    const [o] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
    expect(o!.userId).toBeNull();
    expect(o!.email).toBe(`${me}@example.com`); // fica 5 anos (fiscal)
  });
});
