import { describe, expect, it } from "vitest";
import { categoryInput, couponInput, fieldsOf, productInput, promotionInput } from "./schemas";

describe("#100: eixos e combinações do produto", () => {
  const cat = "8f14e45f-ceea-4167-a5a3-5f3c0e6b9a51";
  const base = {
    categoryId: cat,
    subcategoryId: "",
    name: "Venomous Abyss",
    slug: "va",
    description: "",
    imageUrl: "",
    price: "",
    addons: "",
    maxQuantity: "1",
    sortOrder: "0",
  };
  const axes = "Bosses | slider | 2/8, 3/8\nTG | boxes | No, Yes";

  it("lê eixos e combinações; o preço do produto vira o menor e a ordem segue os eixos", () => {
    const r = productInput.parse({
      ...base,
      optionAxes: axes,
      variants: "Bosses=3/8; TG=No | 74.25 | 3 bosses\nBosses=2/8; TG=Yes | 59.85\nBosses=2/8; TG=No | -",
    });
    expect(r.optionAxes[0]).toEqual({ name: "Bosses", style: "slider", values: ["2/8", "3/8"] });
    expect(r.price).toBe(5985);
    expect(r.priceOnRequest).toBe(false);
    expect(r.variants.map((v) => [v.options.Bosses, v.options.TG, v.priceUsdtCents, v.sortOrder])).toEqual([
      ["3/8", "No", 7425, 100],
      ["2/8", "Yes", 5985, 1],
      ["2/8", "No", 1, 0],
    ]);
    expect(r.variants[2]!.priceOnRequest).toBe(true);
  });

  it("todas sob consulta → produto sob consulta (RN-106)", () => {
    const r = productInput.parse({
      ...base,
      optionAxes: "Rating | slider | 1600",
      variants: "Rating=1600 | -",
    });
    expect(r.priceOnRequest).toBe(true);
  });

  it("recusa valor fora do eixo, eixo faltando, combinação repetida e variante sem eixos", () => {
    const bad = (variants: string, optionAxes = axes) =>
      fieldsOf(productInput.safeParse({ ...base, optionAxes, variants }).error!);
    expect(bad("Bosses=9/8; TG=No | 10")).toEqual(["variants"]);
    expect(bad("Bosses=2/8 | 10")).toEqual(["variants"]);
    expect(bad("Bosses=2/8; TG=No | 10\nBosses=2/8; TG=No | 12")).toEqual(["variants"]);
    expect(bad("Bosses=2/8; TG=No | 10", "")).toContain("variants");
    expect(bad("", axes)).toEqual(["variants"]);
    expect(
      fieldsOf(productInput.safeParse({ ...base, optionAxes: "Bosses | wheel | 1", variants: "" }).error!),
    ).toContain("optionAxes");
  });
});

describe("formulários do admin (RN-12, RN-13, RN-19)", () => {
  const product = {
    categoryId: "8f14e45f-ceea-4167-a5a3-5f3c0e6b9a51",
    name: "Gold — US",
    slug: "gold-us",
    subcategoryId: "",
    description: "",
    imageUrl: "",
    price: "0.45",
    addons: "",
    maxQuantity: "1",
    sortOrder: "0",
  };

  it("RN-12: preço em USDT vira centavos inteiros", () => {
    expect(productInput.parse(product).price).toBe(45);
    expect(productInput.parse({ ...product, price: "12.5" }).price).toBe(1250);
    expect(productInput.safeParse({ ...product, price: "0" }).success).toBe(false);
    expect(productInput.safeParse({ ...product, price: "1.234" }).success).toBe(false);
    expect(productInput.safeParse({ ...product, price: "-1" }).success).toBe(false);
  });

  it("slug só minúsculas, números e hífen; imagem só https", () => {
    expect(productInput.parse({ ...product, slug: " Gold-US " }).slug).toBe("gold-us");
    expect(productInput.safeParse({ ...product, slug: "gold us" }).success).toBe(false);
    expect(productInput.safeParse({ ...product, slug: "../x" }).success).toBe(false);
    expect(productInput.safeParse({ ...product, imageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(productInput.safeParse({ ...product, imageUrl: "http://x.com/a.png" }).success).toBe(false);
    expect(productInput.parse(product).imageUrl).toBeNull();
  });

  it('RN-17 (#94): adicionais um por linha, "Nome | %"; repetido, 0% ou formato livre é recusado', () => {
    expect(productInput.parse({ ...product, addons: "Armor Stack | 25\r\n VIP|10 " }).addons).toEqual([
      { name: "Armor Stack", percent: 25 },
      { name: "VIP", percent: 10 },
    ]);
    expect(productInput.parse(product).addons).toEqual([]);
    for (const bad of ["Armor Stack", "A | 0", "x | 5", "Armor | 25\narmor | 10", "X | 101"])
      expect(productInput.safeParse({ ...product, addons: bad }).success).toBe(false);
  });

  it("RN-106: sob consulta dispensa o preço (guarda 1 centavo de marcador); sem ele o preço é obrigatório", () => {
    expect(productInput.parse({ ...product, price: "", priceOnRequest: "on" })).toMatchObject({
      price: 1,
      priceOnRequest: true,
    });
    expect(productInput.safeParse({ ...product, price: "" }).success).toBe(false);
    expect(productInput.parse({ ...product, subcategoryId: "" }).subcategoryId).toBeNull();
  });

  it("RN-13: categoria exige tipo válido; checkbox desmarcado = inativa", () => {
    const c = { name: "Gold", slug: "gold", kind: "gold", description: "", imageUrl: "", sortOrder: "1" };
    expect(categoryInput.parse(c)).toMatchObject({ active: false, sortOrder: 1 });
    expect(categoryInput.parse({ ...c, active: "on" }).active).toBe(true);
    expect(categoryInput.safeParse({ ...c, kind: "pet" }).success).toBe(false);
  });
});

describe("promoções e cupons no admin (RN-21, RN-25)", () => {
  const base = {
    name: "Black Friday",
    type: "percent",
    value: "20",
    target: "store",
    startsAt: "2026-11-27T00:00",
    endsAt: "2026-11-30T00:00",
  };

  it("RN-21: percentual 1–90; fixo em USDT vira centavos; datas em UTC", () => {
    const p = promotionInput.parse(base);
    expect(p).toMatchObject({ value: 20, scope: "store", categoryId: null, active: false });
    expect(p.startsAt.toISOString()).toBe("2026-11-27T00:00:00.000Z");
    expect(promotionInput.parse({ ...base, type: "fixed", value: "2.50" }).value).toBe(250);
    expect(promotionInput.safeParse({ ...base, value: "91" }).success).toBe(false);
    expect(promotionInput.safeParse({ ...base, value: "0" }).success).toBe(false);
    expect(promotionInput.safeParse({ ...base, value: "10.5" }).success).toBe(false);
  });

  it("RN-21: fim antes do início é recusado; alvo vira escopo", () => {
    expect(promotionInput.safeParse({ ...base, endsAt: "2026-11-26T00:00" }).success).toBe(false);
    const id = "8f14e45f-ceea-4167-a5a3-5f3c0e6b9a51";
    expect(promotionInput.parse({ ...base, target: `category:${id}` })).toMatchObject({
      scope: "category",
      categoryId: id,
      productId: null,
    });
    expect(promotionInput.safeParse({ ...base, target: "category:x" }).success).toBe(false);
  });

  it("RN-25: código em minúsculas; limites opcionais; mínimo em centavos", () => {
    const c = couponInput.parse({
      ...base,
      code: " BF-2026 ",
      maxUses: "",
      maxUsesPerEmail: "1",
      minOrder: "50",
    });
    expect(c).toMatchObject({ code: "bf-2026", maxUses: null, maxUsesPerEmail: 1, minOrderUsdtCents: 5000 });
    expect(
      couponInput.safeParse({ ...base, code: "a b", maxUses: "", maxUsesPerEmail: "", minOrder: "" }).success,
    ).toBe(false);
  });
});
