import { describe, expect, it } from "vitest";
import { categoryInput, productInput } from "./schemas";

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
