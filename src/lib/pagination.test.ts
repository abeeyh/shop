import { describe, expect, it } from "vitest";
import { pageCount, pageParam, parseCursor, toCursor } from "./pagination";

describe("paginação do admin (#88)", () => {
  it("página inválida, negativa, fracionária ou enorme volta para 1", () => {
    for (const v of [undefined, "", "0", "-2", "1.5", "abc", "99999999", ["x"]]) expect(pageParam(v)).toBe(1);
    expect(pageParam("3")).toBe(3);
    expect(pageParam(["4", "5"])).toBe(4);
  });

  it("total vira número de páginas (mínimo 1)", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(50)).toBe(1);
    expect(pageCount(51)).toBe(2);
  });

  it("cursor da auditoria vai e volta; lixo é ignorado", () => {
    const r = { cursorAt: "2026-11-07T12:00:00.123456Z", id: "0b6f1c2e-1111-4a2b-9c3d-123456789abc" };
    expect(parseCursor(toCursor(r))).toEqual({ at: r.cursorAt, id: r.id });
    expect(parseCursor("2026-13-99T99:99:99.000000Z_0b6f1c2e-1111-4a2b-9c3d-123456789abc")).toBeNull();
    expect(parseCursor("2026-11-07T12:00:00.123Z_0b6f1c2e-1111-4a2b-9c3d-123456789abc")).toBeNull();
    expect(parseCursor("'; drop table x;--")).toBeNull();
    expect(parseCursor("2026-02-30T00:00:00.000000Z_0b6f1c2e-1111-4a2b-9c3d-123456789abc")).toBeNull();
    expect(parseCursor(undefined)).toBeNull();
  });
});
