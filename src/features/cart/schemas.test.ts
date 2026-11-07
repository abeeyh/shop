import { describe, expect, it } from "vitest";
import { parseItem } from "./schemas";

describe("validação do item do carrinho (RN-15 a RN-17)", () => {
  it("RN-15: gold válido", () => {
    const r = parseItem("gold", { realm: "Area 52", faction: "horde", character: "Thrall", quantity: "200" });
    expect(r).toEqual({
      ok: true,
      item: {
        options: { kind: "gold", realm: "Area 52", faction: "horde", character: "Thrall" },
        quantity: 200,
      },
    });
  });

  it("RN-15: personagem só com letras (aceita acentos e CJK), quantidade em passos de 50", () => {
    expect(
      parseItem("gold", { realm: "Kazzak", faction: "alliance", character: "Jaína", quantity: "50" }).ok,
    ).toBe(true);
    expect(
      parseItem("gold", { realm: "Kazzak", faction: "alliance", character: "小明", quantity: "50" }).ok,
    ).toBe(true);
    expect(
      parseItem("gold", { realm: "Kazzak", faction: "alliance", character: "<b>x</b>", quantity: "50" }),
    ).toMatchObject({ ok: false, fields: ["character"] });
    expect(
      parseItem("gold", { realm: "Kazzak", faction: "alliance", character: "Jaina", quantity: "75" }),
    ).toMatchObject({ ok: false, fields: ["quantity"] });
    expect(
      parseItem("gold", { realm: "Kazzak", faction: "pirate", character: "Jaina", quantity: "50" }),
    ).toMatchObject({ ok: false, fields: ["faction"] });
  });

  const who = { realm: "Area 52", faction: "horde", character: "Thrall" };
  const rules = { addons: [{ name: "Armor Stack" }], maxQuantity: 3, hasSlots: false };

  it("RN-17 (#94): serviço com adicional do produto e quantidade até o limite", () => {
    expect(parseItem("dungeon", { ...who, addon: ["Armor Stack"], quantity: "2" }, rules)).toEqual({
      ok: true,
      item: {
        options: { kind: "service", ...who, addons: ["Armor Stack"] },
        quantity: 2,
      },
    });
    expect(parseItem("delve", { ...who }, rules)).toMatchObject({ ok: true, item: { quantity: 1 } });
    expect(parseItem("delve", { ...who, quantity: "4" }, rules)).toMatchObject({
      ok: false,
      fields: ["quantity"],
    });
  });

  it("RN-17: adicional que o produto não tem é recusado", () => {
    expect(parseItem("raid", { ...who, addon: ["Grátis"] }, rules)).toMatchObject({
      ok: false,
      fields: ["addon"],
    });
  });

  it("RN-16 (#94): produto com horários exige o horário; sem horários, não aceita um", () => {
    const slotId = "8f14e45f-ceea-4167-a5a3-5f3c0e6b9a51";
    const withSlots = { ...rules, hasSlots: true };
    expect(parseItem("raid", { ...who, slotId }, withSlots)).toMatchObject({ ok: true, item: { slotId } });
    expect(parseItem("raid", { ...who }, withSlots)).toMatchObject({ ok: false, fields: ["slotId"] });
    expect(parseItem("raid", { ...who, slotId }, rules)).toMatchObject({ ok: false, fields: ["slotId"] });
  });

  it("RN-20: preço enviado pelo cliente é ignorado (não faz parte do schema)", () => {
    const r = parseItem("dungeon", { ...who, price: "1", priceUsdtCents: "1" }, rules);
    expect(r.ok && "price" in r.item).toBe(false);
  });
});
