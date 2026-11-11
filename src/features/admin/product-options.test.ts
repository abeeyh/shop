import { describe, expect, it } from "vitest";
import { productInput } from "./schemas";
import { addonsToText, axisToText, combos, variantsToText, type Axis } from "./product-options";

// RF-09 a RF-11 (doc 17): o texto que o editor visual gera passa na MESMA validação do servidor
describe("editor visual do produto", () => {
  const axes: Axis[] = [
    { name: "Bosses", style: "slider", values: ["2/8", "3/8"] },
    { name: "Run", style: "boxes", values: ["Saved", "Unsaved"] },
  ];
  it("gera todas as combinações na ordem dos eixos", () => {
    expect(combos(axes)).toEqual([
      { Bosses: "2/8", Run: "Saved" },
      { Bosses: "2/8", Run: "Unsaved" },
      { Bosses: "3/8", Run: "Saved" },
      { Bosses: "3/8", Run: "Unsaved" },
    ]);
    expect(combos([])).toEqual([]);
  });
  it("separadores digitados não quebram o formato (| ; = ,)", () => {
    expect(axisToText([{ name: "A|b", style: "boxes", values: ["x;y", "z=1", "a,b"] }])).toBe(
      "A b | boxes | x y, z 1, a b",
    );
    expect(
      addonsToText([
        { name: "Armor | Stack", percent: "25" },
        { name: "", percent: "10" },
      ]),
    ).toBe("Armor   Stack | 25");
  });
  it("o servidor aceita o que o editor monta (sob consulta e nota inclusos)", () => {
    const variants = variantsToText(axes, [
      {
        options: { Bosses: "2/8", Run: "Saved" },
        price: "12,50",
        onRequest: false,
        note: "Group loot",
        included: true,
      },
      { options: { Bosses: "3/8", Run: "Unsaved" }, price: "", onRequest: true, note: "", included: true },
    ]);
    const parsed = productInput.safeParse({
      categoryId: "11111111-1111-4111-8111-111111111111",
      tags: "",
      name: "Venomous Abyss",
      slug: "venomous-abyss-test",
      description: "",
      imageUrl: "",
      price: "",
      sortOrder: "0",
      maxQuantity: "1",
      addons: addonsToText([{ name: "Armor Stack", percent: "25" }]),
      optionAxes: axisToText(axes),
      variants,
    });
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(parsed.data!.variants[0]!.priceUsdtCents).toBe(1250);
    expect(parsed.data!.variants[1]!.priceOnRequest).toBe(true);
  });
});
