import { describe, expect, it } from "vitest";
import { diffKeys, flattenKeys } from "./check-i18n.mjs";

describe("check-i18n", () => {
  it("achata chaves aninhadas", () => {
    expect(flattenKeys({ a: { b: "x", c: { d: "y" } }, e: "z" })).toEqual(["a.b", "a.c.d", "e"]);
  });

  it("RN-80: aponta chave faltando e chave sobrando", () => {
    expect(diffKeys({ a: "1", b: { c: "2" } }, { a: "1", d: "3" })).toEqual({
      missing: ["b.c"],
      extra: ["d"],
    });
  });
});
