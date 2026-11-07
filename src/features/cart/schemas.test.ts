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

  it("RN-16: raid exige horário (uuid) e opção de loot válida", () => {
    const slotId = "8f14e45f-ceea-4167-a5a3-5f3c0e6b9a51";
    expect(parseItem("raid", { slotId, loot: "armor" })).toEqual({
      ok: true,
      item: { options: { kind: "raid", loot: "armor" }, quantity: 1, slotId },
    });
    expect(parseItem("raid", { slotId: "1", loot: "armor" })).toMatchObject({
      ok: false,
      fields: ["slotId"],
    });
  });

  it("RN-17: M+ com nível 2–15, runs 1–10 e timed do checkbox", () => {
    expect(parseItem("dungeon", { keyLevel: "12", runs: "4", timed: "on" })).toEqual({
      ok: true,
      item: { options: { kind: "dungeon", keyLevel: 12, timed: true }, quantity: 4 },
    });
    expect(parseItem("dungeon", { keyLevel: "12", runs: "4" })).toMatchObject({
      ok: true,
      item: { options: { timed: false } },
    });
    expect(parseItem("dungeon", { keyLevel: "16", runs: "11" })).toMatchObject({
      ok: false,
      fields: ["keyLevel", "runs"],
    });
  });

  it("RN-20: preço enviado pelo cliente é ignorado (não faz parte do schema)", () => {
    const r = parseItem("dungeon", { keyLevel: "5", runs: "1", price: "1", priceUsdtCents: "1" });
    expect(r.ok && "price" in r.item).toBe(false);
  });
});
