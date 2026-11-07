import { describe, expect, it } from "vitest";
import { changedFields } from "./audit";

describe("auditoria (RN-71)", () => {
  it("mostra só o que mudou, sem carimbos de data", () => {
    const before = { name: "Gold", priceUsdtCents: 45, updatedAt: "a", active: true };
    const after = { name: "Gold", priceUsdtCents: 50, updatedAt: "b", active: false };
    expect(changedFields(before, after)).toEqual([
      { field: "priceUsdtCents", from: 45, to: 50 },
      { field: "active", from: true, to: false },
    ]);
  });

  it("criação lista todos os campos com valor anterior vazio", () => {
    expect(changedFields(null, { name: "x" })).toEqual([{ field: "name", from: undefined, to: "x" }]);
  });
});
