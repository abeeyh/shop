import { describe, expect, it } from "vitest";
import { canonicalEmail } from "./rules";

describe("e-mail para limite por cliente (RN-25)", () => {
  it("+tag, maiúsculas e pontos do Gmail contam como o mesmo cliente", () => {
    expect(canonicalEmail(" Ana+promo@Example.com ")).toBe("ana@example.com");
    expect(canonicalEmail("a.n.a+1@gmail.com")).toBe("ana@gmail.com");
    expect(canonicalEmail("ana@googlemail.com")).toBe("ana@gmail.com");
    expect(canonicalEmail("a.na@outlook.com")).toBe("a.na@outlook.com"); // pontos só no Gmail
  });
});
