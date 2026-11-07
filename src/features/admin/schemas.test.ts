import { describe, expect, it } from "vitest";
import { categoryInput, couponInput, productInput, promotionInput } from "./schemas";

describe("formulários do admin (RN-12, RN-13, RN-19)", () => {
  const product = {
    categoryId: "8f14e45f-ceea-4167-a5a3-5f3c0e6b9a51",
    name: "Gold — US",
    slug: "gold-us",
    region: "US",
    description: "",
    imageUrl: "",
    price: "0.45",
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
