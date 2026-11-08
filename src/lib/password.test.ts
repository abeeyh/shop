import { describe, expect, it } from "vitest";
import { isStrongPassword, PASSWORD_PATTERN } from "./password";

describe("regra de senha (#107)", () => {
  it("aceita 8+ com maiúscula, minúscula e número", () => {
    expect(isStrongPassword("Root@shop1")).toBe(true);
    expect(isStrongPassword("Abcdefg1")).toBe(true);
    expect(isStrongPassword("Ação1234")).toBe(true); // acentuadas contam
  });
  it("recusa curta, sem maiúscula, sem minúscula, sem número ou longa demais", () => {
    expect(isStrongPassword("Abcde1")).toBe(false);
    expect(isStrongPassword("root@shop1")).toBe(false);
    expect(isStrongPassword("ROOT@SHOP1")).toBe(false);
    expect(isStrongPassword("Root@shop")).toBe(false);
    expect(isStrongPassword(`Aa1${"x".repeat(126)}`)).toBe(false);
  });
  it("o pattern do navegador segue a mesma regra", () => {
    const re = new RegExp(`^(?:${PASSWORD_PATTERN})$`, "v");
    for (const p of ["Root@shop1", "Abcdefg1", "root@shop1", "Root@shop", "Abc1"])
      expect(re.test(p), p).toBe(isStrongPassword(p));
  });
});
